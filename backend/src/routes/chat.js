import express from 'express';
import { Agent, run, tool } from '@openai/agents';
import { db } from '../db/index.js';
import { users, healthMetrics, tasks, medicalReports, diseaseScans, bodyMapConditions, aiChats } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ----------------------------------------------------
// OpenAI Agent Tools (Patient Data Integration)
// ----------------------------------------------------

const getPatientProfileTool = tool({
  name: 'getPatientProfile',
  description: 'Retrieve general health profile of the current patient including allergies, chronic conditions, and current medications.',
  parameters: {
    type: 'object',
    properties: {
      patientId: { type: 'string', description: 'UUID of the patient' },
    },
    required: ['patientId'],
  },
  execute: async ({ patientId }) => {
    try {
      const [patient] = await db.select().from(users).where(eq(users.id, patientId));
      if (!patient) return { error: 'Patient not found' };
      return {
        fullName: patient.fullName,
        age: patient.dateOfBirth
          ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
          : 'Unknown',
        gender: patient.gender || 'Not specified',
        bloodGroup: patient.bloodGroup || 'Not specified',
        heightCm: patient.heightCm,
        weightKg: patient.weightKg,
        allergies: patient.allergiesJson ? JSON.parse(patient.allergiesJson) : [],
        chronicConditions: patient.chronicConditionsJson ? JSON.parse(patient.chronicConditionsJson) : [],
        currentMedications: patient.currentMedicationsJson ? JSON.parse(patient.currentMedicationsJson) : [],
      };
    } catch (err) {
      return { error: `Database query failed: ${err.message}` };
    }
  },
});

const getRecentHealthMetricsTool = tool({
  name: 'getRecentHealthMetrics',
  description: 'Retrieve the latest health metrics (heart rate, blood pressure, steps, sleep, SpO2, glucose) recorded for the patient.',
  parameters: {
    type: 'object',
    properties: {
      patientId: { type: 'string', description: 'UUID of the patient' },
    },
    required: ['patientId'],
  },
  execute: async ({ patientId }) => {
    try {
      const metrics = await db
        .select()
        .from(healthMetrics)
        .where(eq(healthMetrics.patientId, patientId))
        .orderBy(desc(healthMetrics.metricDate))
        .limit(10);
      return metrics.length > 0 ? metrics : { notice: 'No recent health metrics found.' };
    } catch (err) {
      return { error: `Database query failed: ${err.message}` };
    }
  },
});

const getPatientTasksTool = tool({
  name: 'getPatientTasks',
  description: 'Retrieve active health tasks and goals assigned to the patient.',
  parameters: {
    type: 'object',
    properties: {
      patientId: { type: 'string', description: 'UUID of the patient' },
    },
    required: ['patientId'],
  },
  execute: async ({ patientId }) => {
    try {
      const patientTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.patientId, patientId))
        .limit(10);
      return patientTasks.length > 0 ? patientTasks : { notice: 'No active tasks found.' };
    } catch (err) {
      return { error: `Database query failed: ${err.message}` };
    }
  },
});

const getMedicalReportsTool = tool({
  name: 'getMedicalReports',
  description: 'Retrieve uploaded lab and imaging medical reports (PDFs/images manually uploaded by the patient or doctor). This tool ONLY covers the medical_reports table — it does NOT return AI model scan results (bone fracture, brain tumor, ECG, heart risk, skin, chest). Use getAIDetectedDiseases for AI scan results.',
  parameters: {
    type: 'object',
    properties: {
      patientId: { type: 'string', description: 'UUID of the patient' },
    },
    required: ['patientId'],
  },
  execute: async ({ patientId }) => {
    try {
      const reports = await db
        .select({
          id: medicalReports.id,
          title: medicalReports.title,
          reportType: medicalReports.reportType,
          description: medicalReports.description,
          aiSummary: medicalReports.aiSummary,
          reportDate: medicalReports.reportDate,
        })
        .from(medicalReports)
        .where(eq(medicalReports.patientId, patientId))
        .orderBy(desc(medicalReports.uploadedAt))
        .limit(5);
      return reports.length > 0 ? reports : { notice: 'No medical reports found.' };
    } catch (err) {
      return { error: `Database query failed: ${err.message}` };
    }
  },
});

const getMedicalHistoryTool = tool({
  name: 'getMedicalHistory',
  description: 'Retrieve the complete medical history of the patient, including AI disease diagnostic scans (bone fracture, brain tumor, ECG, heart risk, skin, chest), medical & lab reports, body map conditions, chronic conditions, and allergies.',
  parameters: {
    type: 'object',
    properties: {
      patientId: { type: 'string', description: 'UUID of the patient' },
    },
    required: ['patientId'],
  },
  execute: async ({ patientId }) => {
    try {
      const [patient] = await db.select().from(users).where(eq(users.id, patientId));
      if (!patient) return { error: 'Patient not found' };

      const scans = await db
        .select({
          id: diseaseScans.id,
          scanType: diseaseScans.scanType,
          status: diseaseScans.status,
          predictionResult: diseaseScans.predictionResult,
          aiExplanation: diseaseScans.aiExplanation,
          aiSuggestions: diseaseScans.aiSuggestions,
          medicines: diseaseScans.medicines,
          affectedParts: diseaseScans.affectedParts,
          createdAt: diseaseScans.createdAt,
          completedAt: diseaseScans.completedAt,
        })
        .from(diseaseScans)
        .where(eq(diseaseScans.patientId, patientId))
        .orderBy(desc(diseaseScans.createdAt))
        .limit(10);

      const reports = await db
        .select({
          id: medicalReports.id,
          title: medicalReports.title,
          reportType: medicalReports.reportType,
          description: medicalReports.description,
          extractedData: medicalReports.extractedData,
          aiSummary: medicalReports.aiSummary,
          medicines: medicalReports.medicines,
          affectedParts: medicalReports.affectedParts,
          reportDate: medicalReports.reportDate,
          uploadedAt: medicalReports.uploadedAt,
        })
        .from(medicalReports)
        .where(eq(medicalReports.patientId, patientId))
        .orderBy(desc(medicalReports.uploadedAt))
        .limit(10);

      const conditions = await db
        .select({
          id: bodyMapConditions.id,
          bodyPartId: bodyMapConditions.bodyPartId,
          conditionName: bodyMapConditions.conditionName,
          severity: bodyMapConditions.severity,
          description: bodyMapConditions.description,
          isActive: bodyMapConditions.isActive,
          diagnosedAt: bodyMapConditions.diagnosedAt,
          resolvedAt: bodyMapConditions.resolvedAt,
        })
        .from(bodyMapConditions)
        .where(eq(bodyMapConditions.patientId, patientId))
        .orderBy(desc(bodyMapConditions.diagnosedAt))
        .limit(10);

      return {
        patientName: patient.fullName,
        allergies: patient.allergiesJson ? JSON.parse(patient.allergiesJson) : [],
        chronicConditions: patient.chronicConditionsJson ? JSON.parse(patient.chronicConditionsJson) : [],
        currentMedications: patient.currentMedicationsJson ? JSON.parse(patient.currentMedicationsJson) : [],
        diseaseScans: scans.length > 0 ? scans : [],
        medicalReports: reports.length > 0 ? reports : [],
        bodyMapConditions: conditions.length > 0 ? conditions : [],
      };
    } catch (err) {
      return { error: `Database query failed: ${err.message}` };
    }
  },
});

const getAIDetectedDiseasesTool = tool({
  name: 'getAIDetectedDiseases',
  description: 'Retrieve AI model diagnostic scan results from the disease_scans table. Use this tool when the user asks about their disease scans, AI diagnoses, bone fracture, brain tumor, ECG, heart disease risk, skin disease, or chest X-ray results. Returns all scan types: BONE_FRACTURE, BRAIN_TUMOR, ECG, HEART, SKIN, CHEST. This is the ONLY tool that reads from the disease_scans table.',
  parameters: {
    type: 'object',
    properties: {
      patientId: { type: 'string', description: 'UUID of the patient' },
      scanType: { type: 'string', description: 'Optional scan type filter: BONE_FRACTURE, BRAIN_TUMOR, ECG, HEART, SKIN, CHEST' },
    },
    required: ['patientId'],
  },
  execute: async ({ patientId, scanType }) => {
    try {
      let conditionsList = [eq(diseaseScans.patientId, patientId)];
      if (scanType) {
        conditionsList.push(eq(diseaseScans.scanType, scanType));
      }

      const scans = await db
        .select({
          id: diseaseScans.id,
          scanType: diseaseScans.scanType,
          status: diseaseScans.status,
          predictionResult: diseaseScans.predictionResult,
          aiExplanation: diseaseScans.aiExplanation,
          aiSuggestions: diseaseScans.aiSuggestions,
          medicines: diseaseScans.medicines,
          affectedParts: diseaseScans.affectedParts,
          createdAt: diseaseScans.createdAt,
          completedAt: diseaseScans.completedAt,
        })
        .from(diseaseScans)
        .where(and(...conditionsList))
        .orderBy(desc(diseaseScans.createdAt))
        .limit(15);

      return scans.length > 0 ? scans : { notice: 'No AI-detected disease scans found for this patient.' };
    } catch (err) {
      return { error: `Database query failed: ${err.message}` };
    }
  },
});

// ----------------------------------------------------
// Chat Endpoints
// ----------------------------------------------------

/**
 * GET /api/chat/status
 * Returns system status of OpenAI Agent SDK setup
 */
router.get('/status', (req, res) => {
  return res.json({
    status: 'online',
    sdk: 'OpenAI Agent SDK (@openai/agents)',
    model: process.env.OPENAI_MODEL || 'openai/gpt-oss-120b',
    base_url: process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1',
  });
});

/**
 * Resolve the target user id for ai_chats lookups.
 * Prefers an explicit query param (patientId/userId) so a doctor viewing a
 * patient (or any caller passing ?patientId=X) reads/writes the patient's
 * row even when the x-user-id proxy header holds a different (viewer) id.
 * Falls back to the x-user-id header / body patientId for self-chat.
 */
function resolveAiChatUserId(req, bodyPatientId = null) {
  const q = req.query || {};
  const queryId = q.patientId || q.userId || q.user_id || null;
  const headerId = req.headers ? req.headers['x-user-id'] : null;
  const raw = queryId || bodyPatientId || headerId || null;
  if (Array.isArray(raw)) return raw[0] || null;
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
  return raw || null;
}

/**
 * Normalize the raw `chats` jsonb value into an array of
 * { chat_text, created_at, created_by } capped at the last 10 entries.
 * Handles legacy stringified JSON and malformed rows gracefully.
 */
function normalizeStoredChats(rawChats) {
  let arr = rawChats;
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch {
      arr = [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((c) => c && typeof c.chat_text === 'string' && c.chat_text.trim() !== '')
    .slice(-10);
}

/**
 * Truncate a string to `max` chars (adds ellipsis). Used to keep the LLM
 * prompt under Groq's TPM limit (e.g. 8k for gpt-oss-120b on_demand tier).
 */
function truncateText(value, max = 300) {
  if (value === null || value === undefined) return 'None';
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

/**
 * True when an SDK error is a token/rate-limit overflow (HTTP 413 or TPM).
 * Groq surfaces these as 413 "Request too large" mentioning tokens per minute.
 */
function isTokenLimitError(err) {
  const msg = `${err?.message || ''} ${err?.detail || ''} ${err?.status || ''} ${err?.code || ''}`;
  return /413|request too large|tokens per minute|reduce your message size|context_length_exceeded|token.*limit/i.test(msg);
}

/**
 * One-line compact summary of a health_metrics row.
 * Deliberately omits verbose fields (sleepStages arrays, ids, timestamps)
 * and null values — those were the main TPM overflow driver.
 */
function formatMetricCompact(m) {
  const parts = [];
  if (m.metricDate) parts.push(`${m.metricDate}`);
  if (m.steps != null) parts.push(`steps ${m.steps}`);
  if (m.heartRateAvg != null) parts.push(`HR avg ${m.heartRateAvg}${m.heartRateMin != null || m.heartRateMax != null ? ` (${m.heartRateMin ?? '?'}–${m.heartRateMax ?? '?'})` : ''}`);
  if (m.spo2Percentage != null) parts.push(`SpO2 ${m.spo2Percentage}%`);
  if (m.sleepDurationMinutes != null) parts.push(`sleep ${m.sleepDurationMinutes}min`);
  if (m.caloriesBurnt != null) parts.push(`${m.caloriesBurnt}kcal`);
  if (m.distanceMeters != null) parts.push(`${m.distanceMeters}m`);
  if (m.sleepStages && Array.isArray(m.sleepStages)) parts.push(`sleep stages: ${m.sleepStages.length} segments`);
  return parts.length > 0 ? `• ${parts.join(' | ')}` : null;
}

/**
 * GET /api/chat/history
 * Returns the stored ai_chats record for the authenticated user
 * Response shape (always): { chats: [...up to 10...], chatSummary: string|null, updatedAt }
 */
router.get('/history', async (req, res) => {
  const userId = resolveAiChatUserId(req);
  if (!userId) return res.status(400).json({ error: 'x-user-id header or patientId query parameter is required.' });

  try {
    const [record] = await db
      .select()
      .from(aiChats)
      .where(eq(aiChats.userId, userId));

    if (!record) {
      return res.json({ chats: [], chatSummary: null, updatedAt: null });
    }

    return res.json({
      ...record,
      chats: normalizeStoredChats(record.chats),
      chatSummary: record.chatSummary || null,
    });
  } catch (err) {
    console.error('[Chat History Error]', err);
    return res.status(500).json({ error: 'Failed to fetch chat history.', detail: err.message });
  }
});

/**
 * DELETE /api/chat/history
 * Clears stored ai_chats record for the authenticated user
 */
router.delete('/history', async (req, res) => {
  const userId = resolveAiChatUserId(req, req.body?.patientId || req.body?.userId || null);
  if (!userId) return res.status(400).json({ error: 'x-user-id header or patientId query parameter is required.' });

  try {
    await db
      .delete(aiChats)
      .where(eq(aiChats.userId, userId));

    return res.json({ success: true, message: 'Chat history cleared' });
  } catch (err) {
    console.error('[Clear Chat History Error]', err);
    return res.status(500).json({ error: 'Failed to clear chat history.', detail: err.message });
  }
});

/**
 * POST /api/chat
 * Primary conversation endpoint for Hippo Chat using OpenAI Agent SDK.
 * After each exchange, persists up to 10 recent messages to ai_chats
 * and generates/updates a rolling chat summary.
 */
router.post('/', async (req, res) => {
  try {
    const { message, history = [], patientId: bodyPatientId } = req.body;
    const headerUserId = req.headers ? req.headers['x-user-id'] : null;
    // Prefer explicit body patientId (patient self-chat or doctor-viewing-patient),
    // fall back to proxy header, then explicit query param.
    const patientId = resolveAiChatUserId(req, bodyPatientId || headerUserId || null);

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    if (!process.env.OPENAI_API_KEY && process.env.GROQ_API_KEY) {
      process.env.OPENAI_API_KEY = process.env.GROQ_API_KEY;
    }

    const agentModel = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';

    // -------------------------------------------------------
    // Load persisted ai_chats context FIRST so the LLM actually
    // sees prior turns + the rolling chat_summary (fixes: summary
    // was generated but never fed back into requests).
    // -------------------------------------------------------
    let storedChats = [];
    let storedSummary = null;
    if (patientId) {
      try {
        const [existingCtx] = await db
          .select()
          .from(aiChats)
          .where(eq(aiChats.userId, patientId));
        if (existingCtx) {
          storedChats = normalizeStoredChats(existingCtx.chats);
          storedSummary = existingCtx.chatSummary || null;
        }
      } catch (ctxErr) {
        console.error('[ai_chats Context Load Error]', ctxErr.message);
      }
    }

    // Pre-fetch compact patient clinical context (Reports, Scans, Profile, Metrics).
    // NOTE: Groq's on_demand tier caps TPM low (e.g. ~8000 for gpt-oss-120b), so every
    // field below is budgeted: compact one-line summaries, hard limits, and
    // truncation. Verbose blobs (sleepStages arrays, full JSON dumps, long AI
    // explanations) previously pushed "hi" to 9378 tokens → HTTP 413 → 500.
    let patientContextStr = '';
    let patientName = '';
    let minimalContextStr = '';

    if (patientId) {
      try {
        const [patient] = await db.select().from(users).where(eq(users.id, patientId));
        if (patient) {
          patientName = patient.fullName;

          // 1. Fetch submitted medical reports (latest 3 only — truncated)
          const reports = await db
            .select({
              id: medicalReports.id,
              title: medicalReports.title,
              reportType: medicalReports.reportType,
              description: medicalReports.description,
              extractedData: medicalReports.extractedData,
              aiSummary: medicalReports.aiSummary,
              medicines: medicalReports.medicines,
              affectedParts: medicalReports.affectedParts,
              reportDate: medicalReports.reportDate,
              uploadedAt: medicalReports.uploadedAt,
            })
            .from(medicalReports)
            .where(eq(medicalReports.patientId, patientId))
            .orderBy(desc(medicalReports.uploadedAt))
            .limit(3);

          // 2. Fetch AI disease scan results (latest 12 for digest accuracy;
          // only the top 6 get a detailed line — the digest covers all types)
          const scans = await db
            .select({
              id: diseaseScans.id,
              scanType: diseaseScans.scanType,
              status: diseaseScans.status,
              predictionResult: diseaseScans.predictionResult,
              aiExplanation: diseaseScans.aiExplanation,
              aiSuggestions: diseaseScans.aiSuggestions,
              medicines: diseaseScans.medicines,
              affectedParts: diseaseScans.affectedParts,
              createdAt: diseaseScans.createdAt,
              completedAt: diseaseScans.completedAt,
            })
            .from(diseaseScans)
            .where(eq(diseaseScans.patientId, patientId))
            .orderBy(desc(diseaseScans.createdAt))
            .limit(12);

          // 3. Fetch recent health metrics (latest 3, compact formatting)
          const metrics = await db
            .select({
              metricDate: healthMetrics.metricDate,
              steps: healthMetrics.steps,
              heartRateAvg: healthMetrics.heartRateAvg,
              heartRateMin: healthMetrics.heartRateMin,
              heartRateMax: healthMetrics.heartRateMax,
              spo2Percentage: healthMetrics.spo2Percentage,
              sleepDurationMinutes: healthMetrics.sleepDurationMinutes,
              caloriesBurnt: healthMetrics.caloriesBurnt,
              distanceMeters: healthMetrics.distanceMeters,
              sleepStages: healthMetrics.sleepStages,
            })
            .from(healthMetrics)
            .where(eq(healthMetrics.patientId, patientId))
            .orderBy(desc(healthMetrics.metricDate))
            .limit(3);

          // 4. Fetch body map conditions (compact, max 5)
          const conditions = await db
            .select({
              bodyPartId: bodyMapConditions.bodyPartId,
              conditionName: bodyMapConditions.conditionName,
              severity: bodyMapConditions.severity,
            })
            .from(bodyMapConditions)
            .where(and(eq(bodyMapConditions.patientId, patientId), eq(bodyMapConditions.isActive, true)))
            .limit(5);

          const getDiagnosis = (s) => {
            const p = s.predictionResult;
            if (!p) return 'Unknown / Normal';
            if (typeof p === 'string') return truncateText(p, 120);
            if (p.diagnosis) return truncateText(p.diagnosis, 120);
            if (p.diagnosis_result) return truncateText(p.diagnosis_result, 120);
            if (p.tumor_found) return 'Brain Tumor Detected';
            if (p.risk_prediction === 1) return 'High Risk of Heart Disease';
            if (p.risk_prediction === 0) return 'Low Risk of Heart Disease';
            return truncateText(JSON.stringify(p), 120);
          };

          // Format AI Disease Scans into readable clinical summaries
          // Group by scan type — non-HEART types (e.g. BONE_FRACTURE) get listed first
          let scanSummaries = [];
          let scanDigest = '';
          if (scans.length > 0) {
            // Sort: non-HEART scans first, then HEART scans (so BONE_FRACTURE etc. are never buried)
            const sorted = [...scans].sort((a, b) => {
              if (a.scanType === 'HEART' && b.scanType !== 'HEART') return 1;
              if (a.scanType !== 'HEART' && b.scanType === 'HEART') return -1;
              return new Date(b.createdAt) - new Date(a.createdAt);
            });

            // Build a unique-type digest at the top (most important for LLM to notice)
            const uniqueTypes = {};
            for (const s of sorted) {
              if (!uniqueTypes[s.scanType]) uniqueTypes[s.scanType] = s;
            }
            const digestLines = Object.values(uniqueTypes).map(s => `  → ${s.scanType}: ${getDiagnosis(s)}`);
            scanDigest = `SCAN TYPE SUMMARY (${sorted.length} recent of total; types: ${Object.keys(uniqueTypes).join(', ')}):\n${digestLines.join('\n')}`;
            scanSummaries.push(scanDigest);

            // Detail lines capped at 6 to bound tokens (digest above preserves coverage)
            for (const s of sorted.slice(0, 6)) {
              scanSummaries.push(
                `• [${s.scanType}] ${getDiagnosis(s)} | ${s.status} | ${s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : 'N/A'}` +
                (s.aiExplanation ? ` | Note: ${truncateText(s.aiExplanation, 120)}` : '')
              );
            }
          }

          // Format Submitted Medical Reports into compact summaries
          let reportSummaries = [];
          if (reports.length > 0) {
            for (const r of reports) {
              reportSummaries.push(
                `• ${truncateText(r.title, 80)} (${r.reportType || 'General'}, ${r.reportDate || (r.uploadedAt ? new Date(r.uploadedAt).toISOString().slice(0, 10) : 'N/A')})` +
                (r.description ? ` — ${truncateText(r.description, 150)}` : '') +
                (r.aiSummary ? ` | Summary: ${truncateText(r.aiSummary, 200)}` : '')
              );
            }
          }

          const metricLines = (metrics || []).map(formatMetricCompact).filter(Boolean);
          const conditionLine = (conditions || []).length > 0
            ? conditions.map(c => `${c.conditionName} (${c.bodyPartId}${c.severity ? `, ${c.severity}` : ''})`).join('; ')
            : null;

          patientContextStr = `
=== PATIENT CLINICAL RECORD ===
- Name: ${truncateText(patient.fullName, 80)} | Age: ${patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth)) / 3.154e10) : 'Unknown'} | Gender: ${patient.gender || 'N/A'} | Blood: ${patient.bloodGroup || 'N/A'}
- Allergies: ${truncateText(patient.allergiesJson || 'None', 200)} | Chronic: ${truncateText(patient.chronicConditionsJson || 'None', 200)} | Meds: ${truncateText(patient.currentMedicationsJson || 'None', 200)}
--- SCANS (AI predictions, NOT uploads) ---
${scanSummaries.length > 0 ? scanSummaries.join('\n') : 'No AI scans found. Use getAIDetectedDiseases tool if asked.'}
--- REPORTS (uploads) ---
${reportSummaries.length > 0 ? reportSummaries.join('\n') : 'No uploaded reports found.'}
--- METRICS (latest ${metricLines.length}) ---
${metricLines.length > 0 ? metricLines.join('\n') : 'No health metrics recorded.'}
--- CONDITIONS ---
${conditionLine || 'No active body map conditions.'}
`.trim();

          // Hard cap: ~4000 chars (~1000 tokens) so instructions + tools +
          // history + reply comfortably fit in Groq's 8k TPM window.
          if (patientContextStr.length > 4000) {
            patientContextStr = patientContextStr.slice(0, 4000) + '\n…[truncated for token budget]';
          }

          // Minimal fallback context for TPM-overflow retry (~600 chars).
          minimalContextStr = `
=== PATIENT (MINIMAL — token-budget retry) ===
- Name: ${truncateText(patient.fullName, 80)}
${scanDigest ? `--- SCAN DIGEST ---\n${truncateText(scanDigest, 800)}` : 'No AI scans on file.'}
--- METRICS ---
${metricLines.length > 0 ? truncateText(metricLines.slice(0, 2).join('\n'), 400) : 'No metrics.'}
`.trim();
        }
      } catch (dbErr) {
        console.error('[Chat Context Pre-fetch Error]', dbErr);
      }
    }

    // System instructions for clinical agent
    // NOTE: storedSummary (ai_chats.chat_summary) is injected here so every
    // LLM call considers prior conversation context. Truncate first — it is
    // re-sent on every request and would otherwise grow tokens unbounded.
    if (storedSummary && storedSummary.length > 600) {
      storedSummary = storedSummary.slice(0, 600) + '…';
    }
    const conversationMemoryBlock = storedSummary
      ? `\n--- PREVIOUS CONVERSATION SUMMARY (rolling, from ai_chats.chat_summary) ---\n${storedSummary}\nUse this summary for continuity. If the user references earlier topics ("as I said before", "my previous symptoms"), resolve them from this summary + the conversation history below.\n`
      : `\n--- PREVIOUS CONVERSATION SUMMARY ---\nNo prior summary yet (new conversation).\n`;

    const buildInstructions = (contextStr) => `You are Hippo Chat, an expert, concise, and empathetic clinical AI assistant for Hippo Health.
Your goal is to provide clear, direct, and to-the-point answers to patients and healthcare professionals.

STRICT CONCISENESS & BREVITY RULE:
- Keep all responses SHORT, DIRECT, AND TO THE POINT.
- Avoid unnecessarily long walls of text, multi-section essays, or generic boilerplate unless explicitly requested.
- For simple questions, deliver the answer in 2 to 4 crisp sentences or a tight bulleted list.
- Get straight to the answer immediately.
${conversationMemoryBlock}
CRITICAL DATA SOURCE RULE — READ CAREFULLY:
There are TWO completely separate data sources. NEVER mix them up:

1. AI DISEASE DETECTION SCANS (from the "disease_scans" table):
   - These are results from AI diagnostic models (Bone Fracture detection, Brain Tumor, ECG, Heart Disease Risk, Skin Disease, Chest X-ray).
   - In the clinical record below, these appear under the section "SCANS".
   - When the user asks about: "disease scans", "my scans", "AI scans", "fracture", "bone", "brain tumor", "ECG", "heart scan", "skin scan", "chest scan" → READ FROM THIS SECTION ONLY.
   - To fetch more, use the getAIDetectedDiseases tool.

2. UPLOADED MEDICAL & LAB REPORTS (from the "medical_reports" table):
   - These are manually uploaded files by the patient or doctor (PDFs, lab results, radiology reports).
   - In the clinical record below, these appear under the section "REPORTS".
   - When the user asks about: "medical reports", "lab reports", "uploaded reports", "documents" → READ FROM THIS SECTION ONLY.
   - To fetch more, use the getMedicalReports tool.

NEVER return medical_reports data when the user asks for disease scans. NEVER return disease_scans data when the user asks for medical reports.

ACCESS TO PATIENT DATA:
- You have DIRECT ACCESS to all patient AI disease detection scans and submitted lab/medical reports in the clinical record below.
- When asked about health, scans, or reports, directly state what their record shows.

STRICT NAME & ID DISPLAY RULE:
- When displaying or mentioning the patient's name, ALWAYS write ONLY their full name (e.g., "${patientName || 'Patient'}").
- NEVER include, append, or expose raw UUIDs, database IDs, or strings like "(6adb78ad-ead4-4743-9955-2ec8ad1a10f3)" next to the patient's name or anywhere in output text or tables.

STRICT FACT-GROUNDING & ABSENT DATA RULE:
- IF a specific medical test, scan type, or metric requested by the user is ACTUALLY NOT PRESENT in the clinical record below, state concisely: "I don't have that data in your record."
- DO NOT say you don't have the data if the scan or report is present in the clinical record below.

Key Guidelines:
1. Always maintain a warm, empathetic, and professional medical tone.
2. Be direct, clear, and actionable. Keep disclaimers short (1 brief sentence).

${contextStr}`;

    const agentTools = [
      getPatientProfileTool,
      getRecentHealthMetricsTool,
      getPatientTasksTool,
      getMedicalReportsTool,
      getMedicalHistoryTool,
      getAIDetectedDiseasesTool,
    ];

    // Initialize OpenAI Agent
    const agent = new Agent({
      name: 'Hippo Clinical Assistant',
      model: agentModel,
      instructions: buildInstructions(patientContextStr),
      tools: agentTools,
    });

    // Format prompt with history context.
    // Source of truth is the DB (storedChats); client-supplied `history` is
    // merged in only to cover turns not yet persisted (deduped by content).
    // Each turn is truncated to bound tokens (long prior AI answers with full
    // scan lists previously blew the TPM budget on their own).
    let fullPrompt = '';
    if (patientName) {
      fullPrompt += `[Patient: ${patientName}]\n\n`;
    }

    const storedHistory = storedChats.map((c) => ({
      role: c.created_by === 'ai' ? 'assistant' : 'user',
      content: truncateText(c.chat_text, 500),
    }));

    let effectiveHistory = [...storedHistory];
    if (Array.isArray(history) && history.length > 0) {
      const seen = new Set(storedHistory.map((m) => `${m.role}::${(m.content || '').trim()}`));
      for (const msg of history) {
        if (msg && msg.role && typeof msg.content === 'string' && msg.content.trim() !== '') {
          const truncated = truncateText(msg.content.trim(), 500);
          const key = `${msg.role}::${truncated}`;
          if (!seen.has(key)) {
            seen.add(key);
            effectiveHistory.push({ role: msg.role, content: truncated });
          }
        }
      }
    }
    effectiveHistory = effectiveHistory.slice(-6);

    if (effectiveHistory.length > 0) {
      fullPrompt += 'Conversation History (most recent last, up to 6 turns; use with the summary above for full context):\n';
      for (const msg of effectiveHistory) {
        fullPrompt += `${String(msg.role).toUpperCase()}: ${msg.content}\n`;
      }
      fullPrompt += '\nCurrent User Message:\n';
    }

    fullPrompt += truncateText(message.trim(), 1000);

    // Run the OpenAI Agent with a minimal-context retry on TPM overflow.
    // Groq's free tier (e.g. 8k TPM for gpt-oss-120b) throws 413 when the prompt
    // is too large — retry once with digest-only context and no tools.
    let aiResponseText = '';
    try {
      const agentResult = await run(agent, fullPrompt);
      aiResponseText = agentResult.finalOutput || 'No output produced.';
    } catch (runErr) {
      if (!isTokenLimitError(runErr)) throw runErr;
      console.warn('[Chat TPM Overflow] Full context too large, retrying minimal:', runErr.message);
      const retryAgent = new Agent({
        name: 'Hippo Clinical Assistant',
        model: agentModel,
        instructions: buildInstructions(minimalContextStr || 'No patient context available (token budget).'),
        tools: [],
      });
      const retryPrompt = `${patientName ? `[Patient: ${patientName}]\n\n` : ''}Current User Message:\n${truncateText(message.trim(), 1000)}`;
      const retryResult = await run(retryAgent, retryPrompt);
      aiResponseText = retryResult.finalOutput || 'No output produced.';
    }

    // -------------------------------------------------------
    // Persist to ai_chats table (upsert per user, max 10 msgs)
    // -------------------------------------------------------
    let updatedChats = [];
    let chatSummary = storedSummary || null;
    if (patientId) {
      try {
        const now = new Date().toISOString();

        // Re-load fresh (request may have raced with another tab); fall back
        // to the snapshot loaded at request start.
        let existing = null;
        try {
          const [fresh] = await db
            .select()
            .from(aiChats)
            .where(eq(aiChats.userId, patientId));
          existing = fresh || null;
        } catch {
          existing = null;
        }
        const prevChats = existing
          ? normalizeStoredChats(existing.chats)
          : [...storedChats];
        if (existing?.chatSummary) chatSummary = existing.chatSummary;

        // Build new message entries
        const userEntry = { chat_text: message.trim(), created_at: now, created_by: 'user' };
        const aiEntry   = { chat_text: aiResponseText,  created_at: new Date().toISOString(), created_by: 'ai' };

        // Merge with existing chats, then trim to latest 10
        updatedChats = [...prevChats, userEntry, aiEntry].slice(-10);

        // 1. Immediately save chats to DB (summary follows in step 2)
        if (existing) {
          await db
            .update(aiChats)
            .set({ chats: updatedChats, updatedAt: new Date() })
            .where(eq(aiChats.userId, patientId));
        } else {
          await db.insert(aiChats).values({
            userId: patientId,
            chats: updatedChats,
            chatSummary: null,
          });
        }
        console.log(`[ai_chats] Persisted ${updatedChats.length} messages for user ${patientId}`);

        // 2. Generate updated rolling summary (awaited so the response can
        // return it — frontend uses it directly, no racy re-fetch needed).
        try {
          const summaryPrompt = `Summarize the following clinical conversation in 2–3 sentences.
Focus on the key health topics discussed, any concerns raised, and advice given.
Be concise and factual. Do not include names or greetings.\n\n` +
            updatedChats.map(c => `${c.created_by === 'user' ? 'Patient' : 'Hippo AI'}: ${c.chat_text}`).join('\n');

          const summaryAgent = new Agent({
            name: 'Chat Summarizer',
            model: agentModel,
            instructions: 'You are a concise medical summarizer. Reply ONLY with the summary — no preamble, no labels.',
            tools: [],
          });
          const summaryResult = await run(summaryAgent, summaryPrompt);
          if (summaryResult?.finalOutput?.trim()) {
            chatSummary = summaryResult.finalOutput.trim();
            await db
              .update(aiChats)
              .set({ chatSummary, updatedAt: new Date() })
              .where(eq(aiChats.userId, patientId));
            console.log(`[ai_chats] Summary updated for user ${patientId}`);
          }
        } catch (sumErr) {
          console.error('[ai_chats Summary Generation Error]', sumErr.message);
        }
      } catch (persistErr) {
        console.error('[ai_chats Persist Error]', persistErr);
      }
    }

    return res.json({
      message: {
        role: 'assistant',
        content: aiResponseText,
      },
      agent: {
        name: agent.name,
        model: agentModel,
        status: 'completed',
      },
      // Echo back persisted state so the frontend can render recent-10 +
      // summary without a second round-trip (also fixes stale-summary races).
      chats: updatedChats,
      chatSummary,
    });
  } catch (err) {
    console.error('[OpenAI Agent SDK Error]', err);
    if (isTokenLimitError(err)) {
      return res.status(413).json({
        error: 'Chat context too large for the AI model. Please try a shorter message or clear chat history.',
        detail: err.message,
      });
    }
    return res.status(500).json({
      error: 'Failed to process chat request.',
      detail: err.message,
    });
  }
});

export default router;

