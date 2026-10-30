import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { healthMetrics } from '../db/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Middleware to extract user from proxy headers or JWT
const authenticateUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (userId) {
    req.user = { id: userId, role: userRole };
    return next();
  }

  // Fallback to JWT Bearer token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
  }

  return res.status(401).json({ error: 'Unauthorized. Missing x-user-id or Authorization header.' });
};

/**
 * GET /api/health/metrics
 */
router.get('/metrics', authenticateUser, async (req, res) => {
  try {
    let patientId = req.user.id;
    if (req.user.role === 'DOCTOR' && req.query.patientId) {
      patientId = req.query.patientId;
    }
    const metrics = await db
      .select()
      .from(healthMetrics)
      .where(eq(healthMetrics.patientId, patientId))
      .orderBy(desc(healthMetrics.metricDate));

    return res.json(metrics);
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

/**
 * POST /api/health/metrics
 */
router.post('/metrics', authenticateUser, async (req, res) => {
  try {
    let patientId = req.user.id;
    if (req.user.role === 'DOCTOR' && req.body.patientId) {
      patientId = req.body.patientId;
    }

    const {
      steps,
      heartRateAvg,
      heartRateMin,
      heartRateMax,
      caloriesBurnt,
      distanceMeters,
      spo2Percentage,
      sleepDurationMinutes,
      metricDate,
      source,
    } = req.body;

    const dateToUse = metricDate || new Date().toISOString().slice(0, 10);

    const existing = await db
      .select({ id: healthMetrics.id })
      .from(healthMetrics)
      .where(and(eq(healthMetrics.patientId, patientId), eq(healthMetrics.metricDate, dateToUse)))
      .limit(1);

    const metricPayload = {
      patientId,
      steps: steps !== undefined && steps !== null && steps !== '' ? parseInt(steps, 10) : null,
      heartRateAvg: heartRateAvg !== undefined && heartRateAvg !== null && heartRateAvg !== '' ? parseInt(heartRateAvg, 10) : null,
      heartRateMin: heartRateMin !== undefined && heartRateMin !== null && heartRateMin !== '' ? parseInt(heartRateMin, 10) : null,
      heartRateMax: heartRateMax !== undefined && heartRateMax !== null && heartRateMax !== '' ? parseInt(heartRateMax, 10) : null,
      caloriesBurnt: caloriesBurnt !== undefined && caloriesBurnt !== null && caloriesBurnt !== '' ? parseFloat(caloriesBurnt).toFixed(2) : null,
      distanceMeters: distanceMeters !== undefined && distanceMeters !== null && distanceMeters !== '' ? parseFloat(distanceMeters).toFixed(2) : null,
      spo2Percentage: spo2Percentage !== undefined && spo2Percentage !== null && spo2Percentage !== '' ? parseFloat(spo2Percentage).toFixed(2) : null,
      sleepDurationMinutes: sleepDurationMinutes !== undefined && sleepDurationMinutes !== null && sleepDurationMinutes !== '' ? parseInt(sleepDurationMinutes, 10) : null,
      source: source || 'MANUAL',
      syncedAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(healthMetrics)
        .set(metricPayload)
        .where(and(eq(healthMetrics.patientId, patientId), eq(healthMetrics.metricDate, dateToUse)));
    } else {
      await db.insert(healthMetrics).values({
        ...metricPayload,
        metricDate: dateToUse,
      });
    }

    return res.json({ message: 'Health metrics saved successfully.' });
  } catch (error) {
    console.error('Error saving health metrics:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
});

/**
 * Aggregates Health Connect data arrays into daily buckets.
 */
function aggregateByDay(healthData) {
  const dayMap = {};

  const ensureDay = (dateStr) => {
    if (!dayMap[dateStr]) {
      dayMap[dateStr] = {
        steps: 0,
        heartRates: [],
        spo2Readings: [],
        caloriesBurnt: 0,
        distanceMeters: 0,
        sleepDurationMinutes: 0,
        sleepStages: [],
      };
    }
    return dayMap[dateStr];
  };

  const toDateStr = (isoTime) => isoTime?.slice(0, 10);

  (healthData.Steps || []).forEach((r) => {
    const d = toDateStr(r.startTime);
    if (!d) return;
    ensureDay(d).steps += r.count || 0;
  });

  (healthData.HeartRate || []).forEach((r) => {
    const d = toDateStr(r.startTime);
    if (!d) return;
    const day = ensureDay(d);
    (r.samples || []).forEach((s) => {
      if (s.beatsPerMinute != null) day.heartRates.push(s.beatsPerMinute);
    });
  });

  (healthData.OxygenSaturation || []).forEach((r) => {
    const d = toDateStr(r.time || r.startTime);
    if (!d) return;
    const day = ensureDay(d);
    const val = typeof r.percentage === 'number' ? r.percentage : r.percentage?.value;
    if (val != null && !isNaN(val)) {
      day.spo2Readings.push(val);
    }
  });

  (healthData.ActiveCaloriesBurned || []).forEach((r) => {
    const d = toDateStr(r.startTime);
    if (!d) return;
    ensureDay(d).caloriesBurnt += r.energy?.inKilocalories || 0;
  });

  (healthData.Distance || []).forEach((r) => {
    const d = toDateStr(r.startTime);
    if (!d) return;
    ensureDay(d).distanceMeters += r.distance?.inMeters || 0;
  });

  (healthData.SleepSession || []).forEach((r) => {
    const d = toDateStr(r.startTime);
    if (!d) return;
    const day = ensureDay(d);
    const startMs = new Date(r.startTime).getTime();
    const endMs = new Date(r.endTime).getTime();
    if (!isNaN(startMs) && !isNaN(endMs)) {
      day.sleepDurationMinutes += Math.round((endMs - startMs) / 60000);
    }
    if (r.stages && r.stages.length > 0) {
      day.sleepStages.push(...r.stages);
    }
  });

  const result = {};
  for (const [date, d] of Object.entries(dayMap)) {
    const hrs = d.heartRates;
    const spo2s = d.spo2Readings;
    result[date] = {
      steps: d.steps || null,
      heartRateAvg: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null,
      heartRateMin: hrs.length ? Math.min(...hrs) : null,
      heartRateMax: hrs.length ? Math.max(...hrs) : null,
      spo2Percentage: spo2s.length ? parseFloat((spo2s.reduce((a, b) => a + b, 0) / spo2s.length).toFixed(2)) : null,
      caloriesBurnt: d.caloriesBurnt || null,
      distanceMeters: d.distanceMeters || null,
      sleepDurationMinutes: d.sleepDurationMinutes || null,
      sleepStages: d.sleepStages.length > 0 ? d.sleepStages : null,
    };
  }

  return result;
}

/**
 * POST /api/health/sync
 */
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const patientId = req.user.id;
    const { healthData } = req.body;

    if (!healthData || typeof healthData !== 'object') {
      return res.status(400).json({ error: 'healthData object is required.' });
    }

    const dailyData = aggregateByDay(healthData);
    const dates = Object.keys(dailyData);

    if (dates.length === 0) {
      return res.json({ synced: 0, message: 'No data to sync.' });
    }

    let synced = 0;

    for (const metricDate of dates) {
      const d = dailyData[metricDate];

      const existing = await db
        .select({ id: healthMetrics.id })
        .from(healthMetrics)
        .where(
          and(
            eq(healthMetrics.patientId, patientId),
            eq(healthMetrics.metricDate, metricDate)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(healthMetrics)
          .set({
            steps: d.steps,
            heartRateAvg: d.heartRateAvg,
            heartRateMin: d.heartRateMin,
            heartRateMax: d.heartRateMax,
            spo2Percentage: d.spo2Percentage?.toFixed(2),
            caloriesBurnt: d.caloriesBurnt?.toFixed(2),
            distanceMeters: d.distanceMeters?.toFixed(2),
            sleepDurationMinutes: d.sleepDurationMinutes,
            sleepStages: d.sleepStages,
            source: 'HEALTH_CONNECT',
            syncedAt: new Date(),
          })
          .where(
            and(
              eq(healthMetrics.patientId, patientId),
              eq(healthMetrics.metricDate, metricDate)
            )
          );
      } else {
        await db.insert(healthMetrics).values({
          patientId,
          steps: d.steps,
          heartRateAvg: d.heartRateAvg,
          heartRateMin: d.heartRateMin,
          heartRateMax: d.heartRateMax,
          spo2Percentage: d.spo2Percentage?.toFixed(2),
          caloriesBurnt: d.caloriesBurnt?.toFixed(2),
          distanceMeters: d.distanceMeters?.toFixed(2),
          sleepDurationMinutes: d.sleepDurationMinutes,
          sleepStages: d.sleepStages,
          metricDate,
          source: 'HEALTH_CONNECT',
        });
      }

      synced++;
    }

    return res.json({
      synced,
      message: `Successfully synced ${synced} day(s) of health data.`,
    });
  } catch (err) {
    console.error('[Health Sync Error]', err);
    return res.status(500).json({ error: 'Internal server error during sync.' });
  }
});

export default router;
