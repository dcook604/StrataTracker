import * as cron from 'node-cron';
import { EmailDeduplicationService } from './email-deduplication';

export class EmailCleanupScheduler {
  private static cleanupJob: cron.ScheduledTask | null = null;

  /**
   * Start the email cleanup scheduler
   * Runs daily at 2 AM to clean up expired records
   */
  static start(): void {
    if (this.cleanupJob) {
      console.log('[EMAIL_CLEANUP_SCHEDULER] Cleanup job already running');
      return;
    }

    // Schedule cleanup every day at 2:00 AM
    this.cleanupJob = cron.schedule('0 2 * * *', async () => {
      console.log('[EMAIL_CLEANUP_SCHEDULER] Starting scheduled email cleanup...');
      
      try {
        const result = await EmailDeduplicationService.cleanupExpiredRecords();
        console.log(`[EMAIL_CLEANUP_SCHEDULER] Cleanup completed successfully:`, result);
        
        // Log statistics
        const stats = await EmailDeduplicationService.getEmailStats(24);
        console.log(`[EMAIL_CLEANUP_SCHEDULER] Email stats (last 24h):`, stats);
        
      } catch (error) {
        console.error('[EMAIL_CLEANUP_SCHEDULER] Cleanup failed:', error);
      }
    }, {
      timezone: 'America/Vancouver' // Adjust to your timezone
    });

    console.log('[EMAIL_CLEANUP_SCHEDULER] Email cleanup scheduler started - runs daily at 2:00 AM');
  }

  /**
   * Stop the email cleanup scheduler
   */
  static stop(): void {
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      this.cleanupJob = null;
      console.log('[EMAIL_CLEANUP_SCHEDULER] Email cleanup scheduler stopped');
    }
  }

  /**
   * Run cleanup manually (for testing or admin purposes)
   */
  static async runCleanupNow(): Promise<{ deletedKeys: number; deletedLogs: number; deletedAttempts: number }> {
    console.log('[EMAIL_CLEANUP_SCHEDULER] Running manual cleanup...');
    
    try {
      const result = await EmailDeduplicationService.cleanupExpiredRecords();
      console.log(`[EMAIL_CLEANUP_SCHEDULER] Manual cleanup completed:`, result);
      return result;
    } catch (error) {
      console.error('[EMAIL_CLEANUP_SCHEDULER] Manual cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get current scheduler status
   */
  static getStatus(): { isRunning: boolean; nextRun?: string } {
    if (this.cleanupJob) {
      return {
        isRunning: true,
        nextRun: 'Daily at 2:00 AM'
      };
    }
    
    return { isRunning: false };
  }
}

// Export convenience functions
export const startEmailCleanupScheduler = EmailCleanupScheduler.start.bind(EmailCleanupScheduler);
export const stopEmailCleanupScheduler = EmailCleanupScheduler.stop.bind(EmailCleanupScheduler);
export const runEmailCleanupNow = EmailCleanupScheduler.runCleanupNow.bind(EmailCleanupScheduler); 