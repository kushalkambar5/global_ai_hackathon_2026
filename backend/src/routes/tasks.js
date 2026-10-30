import { Router } from 'express';
import { Agent, run } from '@openai/agents';
import { db } from '../db/index.js';
import {
  tasks,
  taskHistory,
  doctorProfiles,
  doctorPatients,
  healthMetrics,
  users,
} from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Auth middleware — reads x-user-id / x-user-role injected by the Next.js proxy
const auth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized. Missing x-user-id header.' });
  req.user = { id: userId, role: userRole };
  next();
};


// ==========================================
// HELPERS
// ==========================================

/** Euclidean GCD for two positive integers */
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

/** GCD across an array of integers */
function gcdArray(arr) {
  return arr.reduce((acc, val) => gcd(acc, val), arr[0]);
}

/**
 * Verify the authenticated doctor owns the doctorProfile AND
 * the given patient is assigned to them (ACTIVE relationship).
 * Returns { doctorProfile, ok } — if !ok, response has already been sent.
 */
async function verifyDoctorPatient(req, res, patientId) {
  if (req.user.role !== 'DOCTOR') {
    res.status(403).json({ error: 'Only doctors can perform this action.' });
    return { ok: false };
  }

  const [doctorProfile] = await db
    .select()
    .from(doctorProfiles)
    .where(eq(doctorProfiles.userId, req.user.id));

  if (!doctorProfile) {
    res.status(404).json({ error: 'Doctor profile not found.' });
    return { ok: false };
  }

  const [relation] = await db
    .select()
    .from(doctorPatients)
    .where(
      and(
        eq(doctorPatients.doctorId, doctorProfile.id),
        eq(doctorPatients.patientId, patientId),
        eq(doctorPatients.isActive, true)
      )
    );

  if (!relation) {
    res.status(403).json({ error: 'This patient is not assigned to you.' });
    return { ok: false };
  }

  return { ok: true, doctorProfile };
}


function formatDateLocal(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the period start date for a task based on its creation date,
 * recurrence interval (in days), and a target date.
 */
function getPeriodDateForDate(createdAt, intervalDays, targetDateStr) {
  const interval = Math.max(1, parseInt(intervalDays, 10) || 1);
  if (!createdAt) {
    return targetDateStr || formatDateLocal(new Date());
  }

  const createdDate = new Date(createdAt);
  if (isNaN(createdDate.getTime())) {
    return targetDateStr || formatDateLocal(new Date());
  }

  const cursor = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
  let targetDate;
  if (targetDateStr) {
    const parts = targetDateStr.split('-').map((p) => parseInt(p, 10));
    if (parts.length === 3 && !parts.some(isNaN)) {
      targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      targetDate = new Date();
    }
  } else {
    targetDate = new Date();
  }

  const targetTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();

  let periodDate = new Date(cursor);
  let iterations = 0;
  while (cursor.getTime() <= targetTime && iterations < 10000) {
    periodDate = new Date(cursor);
    cursor.setDate(cursor.getDate() + interval);
    iterations++;
  }
  return formatDateLocal(periodDate);
}


/**
 * Fetch patient context for AI tasks generation: profile, last 30 metrics, last 5 reports, last 10 tasks.
 */
async function buildPatientTaskContext(patientId) {
  const [patient] = await db
    .select()
    .from(users)
    .where(eq(users.id, patientId));

  const metrics = await db
    .select()
    .from(healthMetrics)
    .where(eq(healthMetrics.patientId, patientId))
    .orderBy(desc(healthMetrics.metricDate))
    .limit(30);

  const reports = await db
    .select()
    .from(medicalReports)
    .where(eq(medicalReports.patientId, patientId))
    .orderBy(desc(medicalReports.uploadedAt))
    .limit(5);

  const existingTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.patientId, patientId))
    .orderBy(desc(tasks.createdAt))
    .limit(10);

  return { patient, metrics, reports, existingTasks };
}


/**
 * Call OpenAI Agent SDK (via Groq) to generate or update tasks.
 */
async function generateTasksWithAI(patientContext, extraInstructions = '') {
  const { patient, metrics, reports, existingTasks } = patientContext;

  const systemInstructions = `You are an expert clinical health coach AI. Given a patient's health profile, recent health metrics (from wearable devices), medical reports, and current tasks list, create a set of appropriate daily/weekly tasks or goals to improve their health.
You can recommend both:
1. "task_based" (manual checklist items like taking a specific medicine or doing a specific exercise)
2. "goal_based" (wearable-tracked metrics: daily_steps, calories_burn, min_sleep)

You can choose to preserve, modify, or add new tasks. Keep goals realistic.
Return ONLY valid JSON as a raw array with no explanations, no markdown code fences, and no wrapper object.`;

  const recentMetricsSummary = metrics
    .slice(0, 7)
    .map(
      (m) =>
        `Date: ${m.metricDate} | Steps: ${m.steps ?? 'N/A'} | Calories Burnt: ${m.caloriesBurnt ?? 'N/A'} ` +
        `| Heart Rate Avg: ${m.heartRateAvg ?? 'N/A'} | Sleep: ${m.sleepDurationMinutes ?? 'N/A'} min ` +
        `| SpO2: ${m.spo2Percentage ?? 'N/A'}%`
    )
    .join('\n');

  const reportsSummary = reports
    .map((r) => `[${r.reportType}] ${r.title}: ${r.description ?? ''} — AI Summary: ${JSON.stringify(r.aiSummary)}`)
    .join('\n');

  const tasksSummary = existingTasks.length
    ? existingTasks
        .map(
          (t) =>
            `- ID: ${t.id} | Type: ${t.taskType} | Name: ${t.taskName || 'N/A'} | Metric: ${t.goalMetric || 'N/A'} | Target: ${t.goalTarget || 'N/A'} | Active: ${t.isActive}`
        )
        .join('\n')
    : 'No current tasks.';

  const userPrompt = `
## Patient Profile
- Name: ${patient.fullName}
- Age: ${patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth)) / 3.154e10) : 'Unknown'}
- Gender: ${patient.gender ?? 'Unknown'}
- Blood Group: ${patient.bloodGroup ?? 'Unknown'}
- Height: ${patient.heightCm ?? 'Unknown'} cm
- Weight: ${patient.weightKg ?? 'Unknown'} kg
- Allergies: ${patient.allergiesJson ?? 'None'}
- Chronic Conditions: ${patient.chronicConditionsJson ?? 'None'}
- Current Medications: ${patient.currentMedicationsJson ?? 'None'}

## Recent Health Metrics (Last 7 Days)
${recentMetricsSummary || 'No wearable data available.'}

## Recent Medical Reports (Last 5)
${reportsSummary || 'No reports available.'}

## Current Tasks
${tasksSummary}

${extraInstructions ? `## Additional Instructions from Doctor\n${extraInstructions}` : ''}

## Required Output (JSON array of tasks only, no markdown code fences, no wrapper)
[
  {
    "taskType": "task_based",
    "taskName": "Read blood pressure",
    "taskDescription": "Take daily readings in the morning"
  },
  {
    "taskType": "goal_based",
    "goalMetric": "daily_steps",
    "goalTarget": 8000,
    "freqIntervalDays": 1,
    "taskDescription": "Maintain active steps target"
  }
]`;

  const agentModel = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';
  const agent = new Agent({
    name: 'Clinical Task Planner',
    model: agentModel,
    instructions: systemInstructions,
  });

  const result = await run(agent, userPrompt);
  const rawContent = result.finalOutput ?? '';

  // Strip markdown code fences if the model wraps JSON in them
  const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
  const jsonStr = jsonMatch[1].trim();

  return JSON.parse(jsonStr);
}



/**

 * Given a patient's health metrics, compute and upsert task_history rows
 * for all active goal_based tasks of that patient.
 */
async function syncGoalHistory(patientId) {
  const goalTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.patientId, patientId),
        eq(tasks.taskType, 'goal_based'),
        eq(tasks.isActive, true)
      )
    );

  if (!goalTasks.length) return;

  // Use gcd of all intervals as the sync cadence (informational for now)
  const intervals = goalTasks
    .map((t) => t.freqIntervalDays)
    .filter(Boolean);
  const syncInterval = intervals.length ? gcdArray(intervals) : 1;

  // Fetch last N days of health metrics for this patient
  const recentMetrics = await db
    .select()
    .from(healthMetrics)
    .where(eq(healthMetrics.patientId, patientId))
    .orderBy(desc(healthMetrics.metricDate))
    .limit(60); // look back 60 days max

  const metricsByDate = {};
  for (const m of recentMetrics) {
    metricsByDate[m.metricDate] = m;
  }

  const today = formatDateLocal(new Date());

  for (const task of goalTasks) {
    const interval = task.freqIntervalDays || 1;
    const createdDate = formatDateLocal(new Date(task.createdAt));

    // Generate all period dates from task creation up to today
    let cursor = new Date(createdDate);
    const end = new Date(today);

    while (cursor <= end) {
      const periodDate = formatDateLocal(cursor);

      // Check if a history row already exists for this task + period
      const [existing] = await db
        .select()
        .from(taskHistory)
        .where(
          and(
            eq(taskHistory.taskId, task.id),
            eq(taskHistory.periodDate, periodDate)
          )
        );

      const metric = metricsByDate[periodDate];
      let actualValue = null;
      let isDone = false;

      if (metric) {
        if (task.goalMetric === 'daily_steps') {
          actualValue = metric.steps;
        } else if (task.goalMetric === 'calories_burn') {
          actualValue = metric.caloriesBurnt;
        } else if (task.goalMetric === 'min_sleep') {
          actualValue = metric.sleepDurationMinutes;
        }

        if (actualValue !== null && task.goalTarget !== null) {
          isDone = parseFloat(actualValue) >= parseFloat(task.goalTarget);
        }
      }

      if (!existing) {
        await db.insert(taskHistory).values({
          taskId: task.id,
          periodDate,
          isDone,
          actualValue: actualValue !== null ? String(actualValue) : null,
        });
      } else if (metric && !existing.isDone) {
        // Update if we now have metric data and it wasn't done before
        await db
          .update(taskHistory)
          .set({ isDone, actualValue: actualValue !== null ? String(actualValue) : null })
          .where(eq(taskHistory.id, existing.id));
      }

      // Advance by interval
      cursor.setDate(cursor.getDate() + interval);
    }
  }

  return { syncInterval };
}


// ==========================================
// DOCTOR ROUTES
// ==========================================

/**
 * POST /api/tasks/generate-ai/:patientId
 * AI generates/updates tasks for the patient based on their medical history, metrics, reports, and current tasks.
 * Existing active tasks for the patient will be deactivated (soft-deleted), and the new tasks will be inserted.
 */
router.post('/generate-ai/:patientId', auth, async (req, res) => {
  const { patientId } = req.params;
  const { extraInstructions } = req.body;

  const { ok, doctorProfile } = await verifyDoctorPatient(req, res, patientId);
  if (!ok) return;

  try {
    const context = await buildPatientTaskContext(patientId);
    const aiTasks = await generateTasksWithAI(context, extraInstructions);

    // Deactivate existing active tasks
    await db
      .update(tasks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(tasks.patientId, patientId), eq(tasks.isActive, true)));

    // Insert the new ones
    const insertedTasks = [];
    for (const t of aiTasks) {
      const [newTask] = await db
        .insert(tasks)
        .values({
          doctorId: doctorProfile.id,
          patientId,
          taskType: t.taskType,
          taskName: t.taskType === 'task_based' ? t.taskName : null,
          taskDescription: t.taskDescription || null,
          goalMetric: t.taskType === 'goal_based' ? t.goalMetric : null,
          goalTarget: t.taskType === 'goal_based' ? String(t.goalTarget) : null,
          freqIntervalDays: t.freqIntervalDays ? Number(t.freqIntervalDays) : null,
        })
        .returning();
      insertedTasks.push(newTask);
    }

    return res.status(201).json({ tasks: insertedTasks, message: 'Tasks updated by AI based on patient history.' });
  } catch (err) {
    console.error('[tasks/generate-ai]', err);
    return res.status(500).json({ error: 'Failed to generate tasks.', detail: err.message });
  }
});

/**
 * POST /api/tasks/:patientId
 * Doctor creates a task for their patient.
 */
router.post('/:patientId', auth, async (req, res) => {
  const { patientId } = req.params;
  const { ok, doctorProfile } = await verifyDoctorPatient(req, res, patientId);
  if (!ok) return;

  const {
    taskType,
    taskName,
    taskDescription,
    goalMetric,
    goalTarget,
    freqIntervalDays,
  } = req.body;

  if (!taskType || !['task_based', 'goal_based'].includes(taskType)) {
    return res.status(400).json({ error: 'taskType must be "task_based" or "goal_based".' });
  }

  if (taskType === 'goal_based') {
    if (!goalMetric || !['daily_steps', 'calories_burn', 'min_sleep'].includes(goalMetric)) {
      return res.status(400).json({ error: 'goalMetric must be one of: daily_steps, calories_burn, min_sleep.' });
    }
    if (!freqIntervalDays || freqIntervalDays < 1) {
      return res.status(400).json({ error: 'freqIntervalDays is required for goal_based tasks.' });
    }
    if (!goalTarget) {
      return res.status(400).json({ error: 'goalTarget is required for goal_based tasks.' });
    }
  } else {
    if (!taskName) {
      return res.status(400).json({ error: 'taskName is required for task_based tasks.' });
    }
  }

  try {
    const [newTask] = await db
      .insert(tasks)
      .values({
        doctorId: doctorProfile.id,
        patientId,
        taskType,
        taskName: taskType === 'task_based' ? taskName : null,
        taskDescription: taskDescription || null,
        goalMetric: taskType === 'goal_based' ? goalMetric : null,
        goalTarget: taskType === 'goal_based' ? String(goalTarget) : null,
        freqIntervalDays: freqIntervalDays ? Number(freqIntervalDays) : null,
      })
      .returning();

    return res.status(201).json({ task: newTask });
  } catch (err) {
    console.error('[tasks POST]', err);
    return res.status(500).json({ error: 'Failed to create task.', detail: err.message });
  }
});

/**
 * GET /api/tasks/patient/:patientId
 * Doctor gets all tasks for their patient.
 */
router.get('/patient/:patientId', auth, async (req, res) => {
  const { patientId } = req.params;
  const { ok } = await verifyDoctorPatient(req, res, patientId);
  if (!ok) return;

  try {
    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.patientId, patientId))
      .orderBy(desc(tasks.createdAt));

    const today = formatDateLocal(new Date());
    const tasksWithStatus = [];
    for (const task of result) {
      const interval = task.freqIntervalDays || 1;
      const periodDate = getPeriodDateForDate(task.createdAt, interval, today);

      const [historyEntry] = await db
        .select()
        .from(taskHistory)
        .where(
          and(
            eq(taskHistory.taskId, task.id),
            eq(taskHistory.periodDate, periodDate)
          )
        );

      tasksWithStatus.push({
        ...task,
        isDoneToday: historyEntry ? historyEntry.isDone : false
      });
    }

    return res.json({ tasks: tasksWithStatus });
  } catch (err) {
    console.error('[tasks GET patient]', err);
    return res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

/**
 * PUT /api/tasks/:taskId
 * Doctor updates a task (must own the task's patient).
 */
router.put('/:taskId', auth, async (req, res) => {
  if (req.user.role !== 'DOCTOR') {
    return res.status(403).json({ error: 'Only doctors can update tasks.' });
  }

  try {
    const [existing] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, req.params.taskId));

    if (!existing) return res.status(404).json({ error: 'Task not found.' });

    const { ok } = await verifyDoctorPatient(req, res, existing.patientId);
    if (!ok) return;

    const {
      taskName,
      taskDescription,
      goalTarget,
      freqIntervalDays,
      isActive,
    } = req.body;

    const updates = { updatedAt: new Date() };
    if (taskName !== undefined) updates.taskName = taskName;
    if (taskDescription !== undefined) updates.taskDescription = taskDescription;
    if (goalTarget !== undefined) updates.goalTarget = String(goalTarget);
    if (freqIntervalDays !== undefined) updates.freqIntervalDays = Number(freqIntervalDays);
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const [updated] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, req.params.taskId))
      .returning();

    return res.json({ task: updated });
  } catch (err) {
    console.error('[tasks PUT]', err);
    return res.status(500).json({ error: 'Failed to update task.', detail: err.message });
  }
});

/**
 * DELETE /api/tasks/:taskId
 * Doctor soft-deletes (deactivates) a task.
 */
router.delete('/:taskId', auth, async (req, res) => {
  if (req.user.role !== 'DOCTOR') {
    return res.status(403).json({ error: 'Only doctors can delete tasks.' });
  }

  try {
    const [existing] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, req.params.taskId));

    if (!existing) return res.status(404).json({ error: 'Task not found.' });

    const { ok } = await verifyDoctorPatient(req, res, existing.patientId);
    if (!ok) return;

    const [updated] = await db
      .update(tasks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tasks.id, req.params.taskId))
      .returning();

    return res.json({ message: 'Task deactivated.', task: updated });
  } catch (err) {
    console.error('[tasks DELETE]', err);
    return res.status(500).json({ error: 'Failed to deactivate task.', detail: err.message });
  }
});

// ==========================================
// PATIENT ROUTES
// ==========================================

/**
 * GET /api/tasks/my
 * Patient fetches all their active tasks.
 */
router.get('/my', auth, async (req, res) => {
  try {
    const result = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.patientId, req.user.id), eq(tasks.isActive, true)))
      .orderBy(desc(tasks.createdAt));

    const today = formatDateLocal(new Date());
    const tasksWithStatus = [];
    for (const task of result) {
      const interval = task.freqIntervalDays || 1;
      const periodDate = getPeriodDateForDate(task.createdAt, interval, today);

      const [historyEntry] = await db
        .select()
        .from(taskHistory)
        .where(
          and(
            eq(taskHistory.taskId, task.id),
            eq(taskHistory.periodDate, periodDate)
          )
        );

      tasksWithStatus.push({
        ...task,
        isDoneToday: historyEntry ? historyEntry.isDone : false
      });
    }

    return res.json({ tasks: tasksWithStatus });
  } catch (err) {
    console.error('[tasks GET my]', err);
    return res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

/**
 * POST /api/tasks/:taskId/done
 * Patient manually marks a task_based task as done for today.
 */
router.post('/:taskId/done', auth, async (req, res) => {
  try {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, req.params.taskId));

    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (task.patientId !== req.user.id) {
      return res.status(403).json({ error: 'This task does not belong to you.' });
    }
    if (task.taskType !== 'task_based') {
      return res.status(400).json({ error: 'Only task_based tasks can be manually marked done. Goal-based tasks are tracked automatically.' });
    }

    const today = formatDateLocal(new Date());
    const periodDate = getPeriodDateForDate(task.createdAt, task.freqIntervalDays || 1, today);

    const [existing] = await db
      .select()
      .from(taskHistory)
      .where(and(eq(taskHistory.taskId, task.id), eq(taskHistory.periodDate, periodDate)));

    let result;
    if (existing) {
      [result] = await db
        .update(taskHistory)
        .set({ isDone: true, recordedAt: new Date() })
        .where(eq(taskHistory.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(taskHistory)
        .values({ taskId: task.id, periodDate: periodDate, isDone: true })
        .returning();
    }

    return res.json({ history: result });
  } catch (err) {
    console.error('[tasks/:taskId/done]', err);
    return res.status(500).json({ error: 'Failed to mark task done.', detail: err.message });
  }
});

/**
 * POST /api/tasks/:taskId/undone
 * Patient un-marks a task_based task for today.
 */
router.post('/:taskId/undone', auth, async (req, res) => {
  try {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, req.params.taskId));

    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (task.patientId !== req.user.id) {
      return res.status(403).json({ error: 'This task does not belong to you.' });
    }
    if (task.taskType !== 'task_based') {
      return res.status(400).json({ error: 'Only task_based tasks support manual toggling.' });
    }

    const today = formatDateLocal(new Date());
    const periodDate = getPeriodDateForDate(task.createdAt, task.freqIntervalDays || 1, today);
    const [existing] = await db
      .select()
      .from(taskHistory)
      .where(and(eq(taskHistory.taskId, task.id), eq(taskHistory.periodDate, periodDate)));

    let result;
    if (existing) {
      [result] = await db
        .update(taskHistory)
        .set({ isDone: false, recordedAt: new Date() })
        .where(eq(taskHistory.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(taskHistory)
        .values({ taskId: task.id, periodDate: periodDate, isDone: false })
        .returning();
    }

    return res.json({ history: result });
  } catch (err) {
    console.error('[tasks/:taskId/undone]', err);
    return res.status(500).json({ error: 'Failed to unmark task.', detail: err.message });
  }
});

// ==========================================
// HISTORY ROUTES
// ==========================================

/**
 * GET /api/tasks/:taskId/history
 * Get history entries for a task. Accessible by owner patient OR their doctor.
 */
router.get('/:taskId/history', auth, async (req, res) => {
  try {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, req.params.taskId));

    if (!task) return res.status(404).json({ error: 'Task not found.' });

    // Authorization: patient can see their own, doctor can see their patient's
    if (req.user.role === 'PATIENT' && task.patientId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user.role === 'DOCTOR') {
      const { ok } = await verifyDoctorPatient(req, res, task.patientId);
      if (!ok) return;
    }

    const history = await db
      .select()
      .from(taskHistory)
      .where(eq(taskHistory.taskId, task.id))
      .orderBy(desc(taskHistory.periodDate));

    return res.json({ task, history });
  } catch (err) {
    console.error('[tasks/:taskId/history]', err);
    return res.status(500).json({ error: 'Failed to fetch history.', detail: err.message });
  }
});

/**
 * POST /api/tasks/sync-history/:patientId
 * Called after health metrics are synced for a patient.
 * Computes and upserts task_history for all active goal_based tasks.
 * Can be called by the patient themselves or their doctor.
 */
router.post('/sync-history/:patientId', auth, async (req, res) => {
  const { patientId } = req.params;

  // Authorization
  if (req.user.role === 'PATIENT' && req.user.id !== patientId) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (req.user.role === 'DOCTOR') {
    const { ok } = await verifyDoctorPatient(req, res, patientId);
    if (!ok) return;
  }

  try {
    const result = await syncGoalHistory(patientId);
    return res.json({ message: 'Task history synced.', ...result });
  } catch (err) {
    console.error('[sync-history]', err);
    return res.status(500).json({ error: 'Failed to sync history.', detail: err.message });
  }
});

export { syncGoalHistory };
export default router;
