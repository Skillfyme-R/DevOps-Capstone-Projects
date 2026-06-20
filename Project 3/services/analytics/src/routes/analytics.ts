import { Router, Request, Response } from 'express';
import { getDb } from '../services/database';
import { getCache } from '../services/cache';
import { authenticate, requireRole } from '../middleware/authMiddleware';

const router = Router();

async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const cache = getCache();
  const hit = await cache.get(key);
  if (hit) return JSON.parse(hit) as T;
  const result = await fn();
  await cache.setex(key, ttl, JSON.stringify(result));
  return result;
}

router.get('/summary', authenticate, requireRole('admin', 'superadmin', 'clinician'), async (req: Request, res: Response) => {
  const db = getDb();
  const facilityId = req.query.facilityId as string | undefined;

  const summary = await cached(`mc:analytics:summary:${facilityId || 'all'}`, 300, async () => {
    const patientQ = db('mc_patients').where({ is_deleted: false });
    const apptQ = db('mc_appointments').where({ is_cancelled: false });
    if (facilityId) {
      patientQ.where({ facility_id: facilityId });
      apptQ.where({ facility_id: facilityId });
    }

    const [totalPatients, todayAppts, thisWeekAppts, completedAppts] = await Promise.all([
      patientQ.count('id as count').first(),
      apptQ.clone().whereRaw("DATE(scheduled_at) = CURRENT_DATE").count('id as count').first(),
      apptQ.clone().whereRaw("scheduled_at >= CURRENT_DATE - INTERVAL '7 days'").count('id as count').first(),
      apptQ.clone().where({ status: 'completed' }).count('id as count').first(),
    ]);

    return {
      totalPatients: Number(totalPatients?.count || 0),
      todayAppointments: Number(todayAppts?.count || 0),
      weeklyAppointments: Number(thisWeekAppts?.count || 0),
      completedAppointments: Number(completedAppts?.count || 0),
    };
  });

  res.json(summary);
});

router.get('/appointments/trend', authenticate, requireRole('admin', 'superadmin', 'clinician'), async (req: Request, res: Response) => {
  const db = getDb();
  const { days = 30, facilityId } = req.query;

  const trend = await cached(`mc:analytics:appt-trend:${facilityId || 'all'}:${days}`, 300, async () => {
    let query = db('mc_appointments')
      .select(db.raw("DATE(scheduled_at) as date"), db.raw('COUNT(*) as total'), db.raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed"), db.raw("SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show"))
      .where({ is_cancelled: false })
      .whereRaw(`scheduled_at >= CURRENT_DATE - INTERVAL '${Number(days)} days'`)
      .groupByRaw('DATE(scheduled_at)')
      .orderBy('date');

    if (facilityId) query = query.where({ facility_id: facilityId });
    return query;
  });

  res.json({ trend, period: `${days} days` });
});

router.get('/patients/demographics', authenticate, requireRole('admin', 'superadmin'), async (req: Request, res: Response) => {
  const db = getDb();
  const facilityId = req.query.facilityId as string | undefined;

  const demographics = await cached(`mc:analytics:demographics:${facilityId || 'all'}`, 600, async () => {
    let q = db('mc_patients').where({ is_deleted: false });
    if (facilityId) q = q.where({ facility_id: facilityId });

    const [genderBreakdown, bloodGroupBreakdown, ageGroups] = await Promise.all([
      q.clone().select('gender').count('id as count').groupBy('gender'),
      q.clone().select('blood_group').count('id as count').groupBy('blood_group').whereNotNull('blood_group'),
      q.clone().select(
        db.raw(`CASE
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) < 18 THEN 'pediatric'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 18 AND 35 THEN 'young_adult'
          WHEN EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 36 AND 60 THEN 'adult'
          ELSE 'senior'
        END as age_group`),
        db.raw('COUNT(*) as count')
      ).groupByRaw('age_group'),
    ]);

    return { genderBreakdown, bloodGroupBreakdown, ageGroups };
  });

  res.json(demographics);
});

router.get('/clinical/conditions', authenticate, requireRole('admin', 'superadmin', 'clinician'), async (_req: Request, res: Response) => {
  const db = getDb();

  const conditions = await cached('mc:analytics:conditions', 600, async () =>
    db('mc_conditions')
      .select('icd10_code', 'description')
      .count('id as count')
      .where({ status: 'active' })
      .groupBy('icd10_code', 'description')
      .orderBy('count', 'desc')
      .limit(20)
  );

  res.json({ topConditions: conditions });
});

router.get('/operational/kpis', authenticate, requireRole('admin', 'superadmin'), async (_req: Request, res: Response) => {
  const db = getDb();

  const kpis = await cached('mc:analytics:kpis', 300, async () => {
    const [avgApptDuration, noShowRate, completionRate] = await Promise.all([
      db('mc_appointments').avg('duration_minutes as avg').where({ is_cancelled: false, status: 'completed' }).first(),
      db('mc_appointments').where({ is_cancelled: false }).select(
        db.raw("ROUND(100.0 * SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as no_show_rate")
      ).whereRaw("scheduled_at >= CURRENT_DATE - INTERVAL '30 days'").first(),
      db('mc_appointments').where({ is_cancelled: false }).select(
        db.raw("ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) as completion_rate")
      ).whereRaw("scheduled_at >= CURRENT_DATE - INTERVAL '30 days'").first(),
    ]);

    return {
      avgAppointmentDurationMinutes: Number(avgApptDuration?.avg || 0),
      noShowRate30Days: Number(noShowRate?.no_show_rate || 0),
      completionRate30Days: Number(completionRate?.completion_rate || 0),
    };
  });

  res.json(kpis);
});

export default router;
