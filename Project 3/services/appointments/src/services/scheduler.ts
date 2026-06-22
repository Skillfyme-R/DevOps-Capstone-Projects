import cron from 'node-cron';
import { getDb } from './database';
import { logger } from '../utils/logger';

const GRACE_MINUTES = 30; // wait 30 min before marking no_show

export function startScheduler() {
  cron.schedule('* * * * *', async () => {
    try {
      const db = getDb();
      const now = new Date();
      const graceDeadline = new Date(now.getTime() - GRACE_MINUTES * 60 * 1000);

      // Rule 1: checked_in → in_progress when scheduled time is reached
      // Safe: patient is physically present (staff confirmed check-in), doctor can start
      const toInProgress = await db('mc_appointments')
        .where({ status: 'checked_in', is_cancelled: false })
        .where('scheduled_at', '<=', now)
        .where(db.raw('"scheduled_at" + ("duration_minutes" * interval \'1 minute\') > ?', [now]));

      if (toInProgress.length > 0) {
        await db('mc_appointments')
          .whereIn('id', toInProgress.map((a: any) => a.id))
          .update({ status: 'in_progress', updated_at: now });
        logger.info(`Scheduler: ${toInProgress.length} appointment(s) checked_in → in_progress`);
      }

      // Rule 2: in_progress → completed when scheduled_at + duration has passed
      // Safe: patient was checked in (physically present), visit time is over
      const toCompleted = await db('mc_appointments')
        .where({ status: 'in_progress', is_cancelled: false })
        .where(db.raw('"scheduled_at" + ("duration_minutes" * interval \'1 minute\') <= ?', [now]));

      if (toCompleted.length > 0) {
        await db('mc_appointments')
          .whereIn('id', toCompleted.map((a: any) => a.id))
          .update({ status: 'completed', updated_at: now });
        logger.info(`Scheduler: ${toCompleted.length} appointment(s) in_progress → completed`);
      }

      // Rule 3: confirmed/scheduled → no_show after grace period with no check-in
      // Patient never checked in + 30 min past appointment time = no show
      const toNoShow = await db('mc_appointments')
        .whereIn('status', ['confirmed', 'scheduled'])
        .where({ is_cancelled: false })
        .where('scheduled_at', '<=', graceDeadline);

      if (toNoShow.length > 0) {
        await db('mc_appointments')
          .whereIn('id', toNoShow.map((a: any) => a.id))
          .update({ status: 'no_show', updated_at: now });
        logger.info(`Scheduler: ${toNoShow.length} appointment(s) → no_show (no check-in after ${GRACE_MINUTES}min grace)`);
      }

    } catch (err) {
      logger.error('Scheduler error', { error: (err as Error).message });
    }
  });

  logger.info('Smart appointment scheduler started — grace period: 30 min for no-show detection');
}
