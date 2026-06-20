import { Router, Request, Response } from 'express';
import { getDb } from '../services/database';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/available', authenticate, async (req: Request, res: Response) => {
  const { physicianId, date } = req.query;
  if (!physicianId || !date) return res.status(400).json({ error: { message: 'physicianId and date are required' } });

  const db = getDb();
  const startOfDay = new Date(`${date}T08:00:00`);
  const endOfDay = new Date(`${date}T18:00:00`);

  const booked = await db('mc_appointments')
    .where({ physician_id: physicianId, is_cancelled: false })
    .whereBetween('scheduled_at', [startOfDay, endOfDay])
    .select('scheduled_at', 'duration_minutes');

  const slots: { time: string; available: boolean }[] = [];
  const current = new Date(startOfDay);

  while (current < endOfDay) {
    const timeStr = current.toISOString();
    const isBooked = booked.some((b) => {
      const bStart = new Date(b.scheduled_at).getTime();
      const bEnd = bStart + b.duration_minutes * 60000;
      const slotTime = current.getTime();
      return slotTime >= bStart && slotTime < bEnd;
    });
    slots.push({ time: timeStr, available: !isBooked });
    current.setMinutes(current.getMinutes() + 30);
  }

  res.json({ physicianId, date, slots });
});

export default router;
