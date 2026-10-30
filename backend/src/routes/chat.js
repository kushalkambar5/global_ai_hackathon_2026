import express from 'express';
import { Agent, run, tool } from '@openai/agents';
import { db } from '../db/index.js';
import { users, healthMetrics, tasks, medicalReports, diseaseScans, bodyMapConditions } from '../db/schema.js';
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
        .orderBy(desc(healthMetrics.recordedAt))
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
  description: 'Retrieve recent lab and imaging medical reports uploaded by the patient.',
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
  description: 'Retrieve history of AI-detected diseases and diagnostic scan results for the patient (bone fracture, brain tumor, ECG, heart risk, skin disease, chest X-ray pathologies).',
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
 * POST /api/chat
 * Primary conversation endpoint for Hippo Chat using OpenAI Agent SDK
 */
router.post('/', async (req, res) => {
  try {
    const { message, history = [], patientId: bodyPatientId } = req.body;
    const headerUserId = req.headers['x-user-id'];
    const patientId = bodyPatientId || headerUserId || null;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    if (!process.env.OPENAI_API_KEY && process.env.GROQ_API_KEY) {
      process.env.OPENAI_API_KEY = process.env.GROQ_API_KEY;
    }

    const agentModel = process.env.OPENAI_MODEL || 'openai/gpt-oss-120b';

    // Pre-fetch comprehensive patient clinical context (Reports, Scans, Profile, Metrics)
    let patientContextStr = '';
    let patientName = '';

    if (patientId) {
      try {
        const [patient] = await db.select().from(users).where(eq(users.id, patientId));
        if (patient) {
          patientName = patient.fullName;

          // 1. Fetch submitted medical reports
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

          // 2. Fetch AI disease scan results (detection models: fracture, brain tumor, ECG, heart risk, skin, chest)
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

          // 3. Fetch recent health metrics
          const metrics = await db
            .select()
            .from(healthMetrics)
            .where(eq(healthMetrics.patientId, patientId))
            .orderBy(desc(healthMetrics.metricDate))
            .limit(7);

          // 4. Fetch body map conditions
          const conditions = await db
            .select()
            .from(bodyMapConditions)
            .where(and(eq(bodyMapConditions.patientId, patientId), eq(bodyMapConditions.isActive, true)));

          // Format AI Disease Scans into readable clinical summaries
          let scanSummaries = [];
          if (scans.length > 0) {
            for (const s of scans) {
              let diagnosis = 'Unknown / Normal';
              if (s.predictionResult) {
                if (s.predictionResult.diagnosis) diagnosis = s.predictionResult.diagnosis;
                else if (s.predictionResult.diagnosis_result) diagnosis = s.predictionResult.diagnosis_result;
                else if (s.predictionResult.tumor_found) diagnosis = 'Brain Tumor Detected';
                else if (s.predictionResult.risk_prediction === 1) diagnosis = 'High Risk of Heart Disease';
                else if (s.predictionResult.risk_prediction === 0) diagnosis = 'Low Risk of Heart Disease';
                else diagnosis = typeof s.predictionResult === 'string' ? s.predictionResult : JSON.stringify(s.predictionResult);
              }
              scanSummaries.push(
                `• [Scan Type: ${s.scanType}] Result/Diagnosis: ${diagnosis} | Status: ${s.status} | Date: ${s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : 'N/A'}\n` +
                `  - AI Explanation: ${s.aiExplanation || 'None'}\n` +
                `  - Medicines Recommended: ${Array.isArray(s.medicines) && s.medicines.length > 0 ? s.medicines.join(', ') : 'None'}\n` +
                `  - AI Suggestions: ${Array.isArray(s.aiSuggestions) && s.aiSuggestions.length > 0 ? s.aiSuggestions.join('; ') : 'None'}`
              );
            }
          }

          // Format Submitted Medical Reports into readable clinical summaries
          let reportSummaries = [];
          if (reports.length > 0) {
            for (const r of reports) {
              reportSummaries.push(
                `• [Report: ${r.title}] Type: ${r.reportType || 'General'} | Date: ${r.reportDate || (r.uploadedAt ? new Date(r.uploadedAt).toISOString().slice(0, 10) : 'N/A')}\n` +
                `  - Description: ${r.description || 'N/A'}\n` +
                `  - Extracted Data: ${r.extractedData ? JSON.stringify(r.extractedData) : 'None'}\n` +
                `  - AI Summary: ${r.aiSummary ? JSON.stringify(r.aiSummary) : 'None'}\n` +
                `  - Recommended Medicines: ${Array.isArray(r.medicines) && r.medicines.length > 0 ? r.medicines.join(', ') : 'None'}`
              );
            }
          }

          patientContextStr = `
=== PATIENT CLINICAL RECORD ===
- Full Name: ${patient.fullName}
- Age: ${patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth)) / 3.154e10) : 'Unknown'}
- Gender: ${patient.gender || 'Not specified'}
- Blood Group: ${patient.bloodGroup || 'Not specified'}
- Height: ${patient.heightCm ? patient.heightCm + ' cm' : 'Not recorded'}
- Weight: ${patient.weightKg ? patient.weightKg + ' kg' : 'Not recorded'}
- Allergies: ${patient.allergiesJson ? patient.allergiesJson : 'None'}
- Chronic Conditions: ${patient.chronicConditionsJson ? patient.chronicConditionsJson : 'None'}
- Current Medications: ${patient.currentMedicationsJson ? patient.currentMedicationsJson : 'None'}

--- AI DISEASE DETECTION MODEL SCANS (${scans.length} scans found) ---
${scanSummaries.length > 0 ? scanSummaries.join('\n\n') : 'No AI disease detection scans found.'}

--- SUBMITTED MEDICAL & LAB REPORTS (${reports.length} reports found) ---
${reportSummaries.length > 0 ? reportSummaries.join('\n\n') : 'No submitted medical reports found.'}

--- RECENT HEALTH METRICS (${metrics.length} records) ---
${metrics.length > 0 ? JSON.stringify(metrics, null, 2) : 'No health metrics recorded.'}

--- ACTIVE BODY MAP CONDITIONS (${conditions.length} records) ---
${conditions.length > 0 ? JSON.stringify(conditions, null, 2) : 'No active body map conditions.'}
`;
        }
      } catch (dbErr) {
        console.error('[Chat Context Pre-fetch Error]', dbErr);
      }
    }

    // System instructions for clinical agent
    let instructions = `You are Hippo Chat, an expert, concise, and empathetic clinical AI assistant for Hippo Health.
Your goal is to provide clear, direct, and to-the-point answers to patients and healthcare professionals.

STRICT CONCISENESS & BREVITY RULE:
- Keep all responses SHORT, DIRECT, AND TO THE POINT.
- Avoid unnecessarily long walls of text, multi-section essays, or generic boilerplate unless explicitly requested.
- For simple questions, deliver the answer in 2 to 4 crisp sentences or a tight bulleted list.
- Get straight to the answer immediately.

ACCESS TO PATIENT DIAGNOSTIC SCANS & REPORTS:
- You have DIRECT ACCESS to all patient AI disease detection scans (Bone Fracture, Heart Disease Risk, Brain Tumor, ECG, Skin Disease, Chest X-ray) and all submitted lab/medical reports in the clinical record below.
- Both AI scans (e.g. Bone Fracture marked "Fractured", Heart scan marked "High Risk") and uploaded medical reports (e.g. Lab/Ultrasound reports) are valid parts of their medical record.
- When asked about their health, diagnostic scans, bone fracture, heart issues, or reports, directly state what their record shows with concise, helpful guidance.

STRICT NAME & ID DISPLAY RULE:
- When displaying or mentioning the patient's name, ALWAYS write ONLY their full name (e.g., "${patientName || 'Patient'}").
- NEVER include, append, or expose raw UUIDs, database IDs, or strings like "(6adb78ad-ead4-4743-9955-2ec8ad1a10f3)" next to the patient's name or anywhere in output text or tables.

STRICT FACT-GROUNDING & ABSENT DATA RULE:
- IF a specific medical test, scan type, or metric requested by the user is ACTUALLY NOT PRESENT in the clinical record below, state concisely: "I don't have that data in your record."
- DO NOT say you don't have the data if the scan or report is present in the clinical record below.

Key Guidelines:
1. Always maintain a warm, empathetic, and professional medical tone.
2. Be direct, clear, and actionable. Keep disclaimers short (1 brief sentence).

${patientContextStr}`;

    // Initialize OpenAI Agent
    const agent = new Agent({
      name: 'Hippo Clinical Assistant',
      model: agentModel,
      instructions: instructions,
      tools: [
        getPatientProfileTool,
        getRecentHealthMetricsTool,
        getPatientTasksTool,
        getMedicalReportsTool,
        getMedicalHistoryTool,
        getAIDetectedDiseasesTool,
      ],
    });

    // Format prompt with history context
    let fullPrompt = '';
    if (patientName) {
      fullPrompt += `[Patient: ${patientName}]\n\n`;
    }

    if (Array.isArray(history) && history.length > 0) {
      fullPrompt += 'Conversation History:\n';
      // Take up to last 10 messages for context efficiency
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role && msg.content) {
          fullPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
        }
      }
      fullPrompt += '\nCurrent User Message:\n';
    }

    fullPrompt += message;

    // Run the OpenAI Agent
    const agentResult = await run(agent, fullPrompt);

    return res.json({
      message: {
        role: 'assistant',
        content: agentResult.finalOutput || 'No output produced.',
      },
      agent: {
        name: agent.name,
        model: agentModel,
        status: 'completed',
      },
    });
  } catch (err) {
    console.error('[OpenAI Agent SDK Error]', err);
    return res.status(500).json({
      error: 'Failed to process chat request.',
      detail: err.message,
    });
  }
});

export default router;
