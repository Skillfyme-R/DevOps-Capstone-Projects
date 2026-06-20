import cron from 'node-cron';
import { getDb } from './database';
import { logger } from '../utils/logger';

export function startScheduler() {
  // Runs every minute — auto-progress appointment statuses based on real time
  cron.schedule('* * * * *', async () => {
    try {
      const db = getDb();
      const now = new Date();

      // confirmed/scheduled → in_progress when scheduled time has been reached
      const toInProgress = await db('mc_appointments')
        .whereIn('status', ['confirmed', 'scheduled'])
        .where('scheduled_at', '<=', now)
        .where(
          db.raw('"scheduled_at" + ("duration_minutes" * interval \'1 minute\') > ?', [now])
        )
        .where({ is_cancelled: false });

      if (toInProgress.length > 0) {
        await db('mc_appointments')
          .whereIn('id', toInProgress.map((a: any) => a.id))
          .update({ status: 'in_progress', updated_at: now });
        logger.info(`Scheduler: ${toInProgress.length} appointment(s) → in_progress`);
      }

      // in_progress → completed when scheduled_at + duration has passed
      const toCompleted = await db('mc_appointments')
        .where({ status: 'in_progress', is_cancelled: false })
        .where(
          db.raw('"scheduled_at" + ("duration_minutes" * interval \'1 minute\') <= ?', [now])
        );

      if (toCompleted.length > 0) {
        await db('mc_appointments')
          .whereIn('id', toCompleted.map((a: any) => a.id))
          .update({ status: 'completed', updated_at: now });
        logger.info(`Scheduler: ${toCompleted.length} appointment(s) → completed`);
      }
    } catch (err) {
      logger.error('Scheduler error', { error: (err as Error).message });
    }
  });

  logger.info('Appointment status scheduler started (runs every minute)');
}
