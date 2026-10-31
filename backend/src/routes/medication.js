import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/index.js';
import { generalPatterns, todayPatterns } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hardcoded stub embeddings computed from abcd/synthetic_vitals_data.npz
// (train label==1 pair -> encoder -> 64-dim vectors). Used until real
// 288x3 watch data is available.
let seedCache = null;
function loadSeed() {
  if (seedCache) return seedCache;
  const seedPath = path.resolve(__dirname, '../data/medication_seed.json');
  const raw = fs.readFileSync(seedPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.generalPattern) || parsed.generalPattern.length !== 64) {
    throw new Error('medication_seed.json generalPattern must be a list of 64 floats.');
  }
  if (!Array.isArray(parsed.todayPattern) || parsed.todayPattern.length !== 64) {
    throw new Error('medication_seed.json todayPattern must be a list of 64 floats.');
  }
  seedCache = parsed;
  return seedCache;
}

// Auth — reads x-user-id / x-user-role injected by the Next.js proxy
const auth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized. Missing x-user-id header.' });
  req.user = { id: userId, role: userRole };
  next();
};

// Patient can access own data; doctors can access any patient (verified on doctor side via assignment UI)
function canAccess(req, patientId) {
  if (req.user.role === 'DOCTOR') return true;
  return req.user.id === patientId;
}

function formatDateLocal(d) {
  const dt = d || new Date();
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toNumberArray(pgArray) {
  if (Array.isArray(pgArray)) return pgArray.map((v) => Number(v));
  return pgArray;
}

/**
 * Ensure the patient has a general (baseline) pattern.
 * For now this is the hardcoded training-set encoding for every patient.
 */
async function ensureGeneralPattern(patientId) {
  const [existing] = await db
    .select()
    .from(generalPatterns)
    .where(eq(generalPatterns.userId, patientId))
    .limit(1);
  if (existing) return { row: existing, created: false };

  const seed = loadSeed();
  const [inserted] = await db
    .insert(generalPatterns)
    .values({
      userId: patientId,
      pattern: seed.generalPattern,
      updatedAt: new Date(),
    })
    .returning();
  return { row: inserted, created: true };
}

/**
 * POST /api/medication/sync/:patientId
 * Simulates the watch "Sync" click: stores the hardcoded general pattern
 * for the patient (first training input encoding) and keeps the second
 * training input encoding as today's pattern.
 */
router.post('/sync/:patientId', auth, async (req, res) => {
  const { patientId } = req.params;
  if (!canAccess(req, patientId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    const seed = loadSeed();
    const { row: general, created } = await ensureGeneralPattern(patientId);

    const today = formatDateLocal(new Date());
    const [existingToday] = await db
      .select()
      .from(todayPatterns)
      .where(and(eq(todayPatterns.userId, patientId), eq(todayPatterns.patternDate, today)))
      .limit(1);

    let todayRow = existingToday;
    if (!existingToday) {
      [todayRow] = await db
        .insert(todayPatterns)
        .values({ userId: patientId, pattern: seed.todayPattern, patternDate: today })
        .returning();
    }

    return res.json({
      message: 'Medication patterns synced (stubbed from training set).',
      generalCreated: created,
      generalPatternId: general.id,
      todayPatternId: todayRow.id,
      patternDate: today,
      seedSource: seed.source,
    });
  } catch (err) {
    console.error('[medication/sync]', err);
    return res.status(500).json({ error: 'Failed to sync medication patterns.', detail: err.message });
  }
});

/**
 * GET /api/medication/general/:patientId
 */
router.get('/general/:patientId', auth, async (req, res) => {
  const { patientId } = req.params;
  if (!canAccess(req, patientId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  try {
    const [row] = await db
      .select()
      .from(generalPatterns)
      .where(eq(generalPatterns.userId, patientId))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'No general pattern stored for this patient yet. Call sync first.' });
    return res.json({ patternId: row.id, userId: row.userId, pattern: toNumberArray(row.pattern), updatedAt: row.updatedAt });
  } catch (err) {
    console.error('[medication/general]', err);
    return res.status(500).json({ error: 'Failed to fetch general pattern.' });
  }
});

/**
 * GET /api/medication/today/:patientId?date=YYYY-MM-DD
 */
router.get('/today/:patientId', auth, async (req, res) => {
  const { patientId } = req.params;
  if (!canAccess(req, patientId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  try {
    const date = req.query.date || formatDateLocal(new Date());
    const [row] = await db
      .select()
      .from(todayPatterns)
      .where(and(eq(todayPatterns.userId, patientId), eq(todayPatterns.patternDate, date)))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'No today pattern for this date yet. Call sync first.' });
    return res.json({ patternId: row.id, userId: row.userId, pattern: toNumberArray(row.pattern), patternDate: row.patternDate });
  } catch (err) {
    console.error('[medication/today]', err);
    return res.status(500).json({ error: 'Failed to fetch today pattern.' });
  }
});

/**
 * POST /api/medication/check/:patientId
 * Compares today's pattern vs the general pattern by calling the
 * logistic (classifier) model in the FastAPI service.
 * Score > 50 => medication taken.
 */
router.post('/check/:patientId', auth, async (req, res) => {
  const { patientId } = req.params;
  if (!canAccess(req, patientId)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  try {
    // Auto-seed on first check so the Medication tab works right after login
    await ensureGeneralPattern(patientId);
    const today = formatDateLocal(new Date());
    const [todayRow] = await db
      .select()
      .from(todayPatterns)
      .where(and(eq(todayPatterns.userId, patientId), eq(todayPatterns.patternDate, today)))
      .limit(1);
    if (!todayRow) {
      const seed = loadSeed();
      await db.insert(todayPatterns).values({ userId: patientId, pattern: seed.todayPattern, patternDate: today });
    }

    const [general] = await db
      .select()
      .from(generalPatterns)
      .where(eq(generalPatterns.userId, patientId))
      .limit(1);
    const [todayFinal] = await db
      .select()
      .from(todayPatterns)
      .where(and(eq(todayPatterns.userId, patientId), eq(todayPatterns.patternDate, today)))
      .limit(1);

    const featureA = toNumberArray(general.pattern);
    const featureB = toNumberArray(todayFinal.pattern);

    const modelsUrl = process.env.MODELS_URL || 'http://127.0.0.1:8000';
    const aiRes = await fetch(`${modelsUrl}/predict-closeness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_a: featureA, feature_b: featureB }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text().catch(() => '');
      return res.status(502).json({ error: `Adherence model returned ${aiRes.status}.`, detail: text.slice(0, 500) });
    }

    const result = await aiRes.json();
    const scorePct = result.similarity_pct ?? Math.round((result.similarity_score ?? 0) * 10000) / 100;
    const medicationTaken = scorePct > 50;

    return res.json({
      similarity_score: result.similarity_score,
      similarity_pct: scorePct,
      is_close: result.is_close,
      prediction_label: result.prediction_label,
      status: result.status,
      medication_taken: medicationTaken,
      verdict: medicationTaken ? 'Medication Taken' : 'Medication Not Taken',
      patternDate: today,
    });
  } catch (err) {
    console.error('[medication/check]', err);
    return res.status(500).json({ error: 'Failed to check medication adherence.', detail: err.message });
  }
});

export default router;
