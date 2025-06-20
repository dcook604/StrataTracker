import crypto from 'crypto';
import { db } from './db.js';
import {
  emailDeduplicationLog,
  emailIdempotencyKeys,
  emailSendAttempts,
} from '#shared/schema';
import { sql, and, eq, gte, lte, asc, desc, inArray } from 'drizzle-orm';
import { sendEmail } from './email-service';
import logger from './utils/logger.js';

export interface EmailRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  emailType: 'violation_notification' | 'violation_approved' | 'campaign' | 'system';
  metadata?: Record<string, unknown>;
  idempotencyKey?: string; // Optional - will be generated if not provided
}

export interface EmailResult {
  success: boolean;
  idempotencyKey: string;
  isDuplicate: boolean;
  message: string;
  attemptNumber: number;
}

export class EmailDeduplicationService {
  private static readonly DEFAULT_TTL_HOURS = 24;
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly DUPLICATE_WINDOW_MINUTES = 5; // Prevent duplicates within 5 minutes

  /**
   * Generate a deterministic idempotency key based on email content and context
   */
  static generateIdempotencyKey(emailRequest: EmailRequest): string {
    const { to, subject, emailType, metadata } = emailRequest;
    
    // Create a deterministic key based on email context
    const contextData = [
      emailType,
      to.toLowerCase().trim(),
      subject.trim(),
      metadata?.violationId || '',
      metadata?.campaignId || '',
      metadata?.userId || '',
      // Add date component to prevent very old duplicates
      new Date().toISOString().substring(0, 13) // YYYY-MM-DDTHH (hourly buckets)
    ].join('|');
    
    return crypto.createHash('sha256').update(contextData).digest('hex').substring(0, 32);
  }

  /**
   * Generate content hash for deduplication
   */
  static generateContentHash(subject: string, content: string): string {
    const combined = `${subject.trim()}|${content.trim()}`;
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 32);
  }

  /**
   * Send email with comprehensive deduplication and tracking
   */
  static async sendEmailWithDeduplication(emailRequest: EmailRequest): Promise<EmailResult> {
    const idempotencyKey = emailRequest.idempotencyKey || this.generateIdempotencyKey(emailRequest);
    const emailHash = this.generateContentHash(emailRequest.subject, emailRequest.html || emailRequest.text || '');
    
    try {
      // Check if this exact email was already sent (idempotency check)
      const existingKey = await db
        .select()
        .from(emailIdempotencyKeys)
        .where(eq(emailIdempotencyKeys.idempotencyKey, idempotencyKey))
        .limit(1);

      if (existingKey.length > 0) {
        const existing = existingKey[0];
        
        // Check if it was successfully sent
        if (existing.status === 'sent') {
          console.log(`[EMAIL_DEDUP] Duplicate email prevented - already sent with key: ${idempotencyKey}`);
          return {
            success: true,
            idempotencyKey,
            isDuplicate: true,
            message: 'Email already sent successfully',
            attemptNumber: 0
          };
        }
        
        // If it failed, check if we should retry
        const attempts = await db
          .select()
          .from(emailSendAttempts)
          .where(eq(emailSendAttempts.idempotencyKey, idempotencyKey))
          .orderBy(sql`${emailSendAttempts.attemptNumber} DESC`)
          .limit(1);

        const lastAttempt = attempts[0];
        if (lastAttempt && lastAttempt.attemptNumber >= this.MAX_RETRY_ATTEMPTS) {
          console.log(`[EMAIL_DEDUP] Max retry attempts reached for key: ${idempotencyKey}`);
          return {
            success: false,
            idempotencyKey,
            isDuplicate: false,
            message: 'Maximum retry attempts exceeded',
            attemptNumber: lastAttempt.attemptNumber
          };
        }
      }

      // Check for recent similar emails to the same recipient (content-based deduplication)
      const recentDuplicateWindow = new Date();
      recentDuplicateWindow.setMinutes(recentDuplicateWindow.getMinutes() - this.DUPLICATE_WINDOW_MINUTES);

      const recentSimilarEmails = await db
        .select()
        .from(emailIdempotencyKeys)
        .where(and(
          eq(emailIdempotencyKeys.recipientEmail, emailRequest.to.toLowerCase().trim()),
          eq(emailIdempotencyKeys.emailType, emailRequest.emailType),
          eq(emailIdempotencyKeys.emailHash, emailHash),
          eq(emailIdempotencyKeys.status, 'sent'),
          gte(emailIdempotencyKeys.sentAt, recentDuplicateWindow)
        ))
        .limit(1);

      if (recentSimilarEmails.length > 0) {
        const originalEmail = recentSimilarEmails[0];
        
        // Log the duplicate prevention
        await db.insert(emailDeduplicationLog).values({
          recipientEmail: emailRequest.to.toLowerCase().trim(),
          emailType: emailRequest.emailType,
          contentHash: emailHash,
          originalIdempotencyKey: originalEmail.idempotencyKey,
          duplicateIdempotencyKey: idempotencyKey,
          metadata: {
            reason: 'content_duplicate',
            windowMinutes: this.DUPLICATE_WINDOW_MINUTES,
            originalSentAt: originalEmail.sentAt,
            ...emailRequest.metadata
          }
        });

        console.log(`[EMAIL_DEDUP] Content duplicate prevented for ${emailRequest.to}, original sent at ${originalEmail.sentAt}`);
        
        return {
          success: true,
          idempotencyKey,
          isDuplicate: true,
          message: 'Duplicate content email prevented',
          attemptNumber: 0
        };
      }

      // Create or update the idempotency key record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.DEFAULT_TTL_HOURS);

      if (existingKey.length === 0) {
        await db.insert(emailIdempotencyKeys).values({
          idempotencyKey,
          emailType: emailRequest.emailType,
          recipientEmail: emailRequest.to.toLowerCase().trim(),
          emailHash,
          status: 'pending',
          metadata: emailRequest.metadata,
          expiresAt
        });
      }

      // Get current attempt number
      const currentAttempts = await db
        .select()
        .from(emailSendAttempts)
        .where(eq(emailSendAttempts.idempotencyKey, idempotencyKey));

      const attemptNumber = currentAttempts.length + 1;

      // Record the attempt
      const [attempt] = await db.insert(emailSendAttempts).values({
        idempotencyKey,
        attemptNumber,
        status: 'pending'
      }).returning();

      try {
        // Actually send the email
        const emailSent = await sendEmail({
          to: emailRequest.to,
          subject: emailRequest.subject,
          html: emailRequest.html,
          text: emailRequest.text
        });

        if (emailSent) {
          // Mark as successfully sent
          await Promise.all([
            db.update(emailIdempotencyKeys)
              .set({ 
                status: 'sent', 
                sentAt: new Date() 
              })
              .where(eq(emailIdempotencyKeys.idempotencyKey, idempotencyKey)),
            
            db.update(emailSendAttempts)
              .set({ 
                status: 'sent', 
                completedAt: new Date() 
              })
              .where(eq(emailSendAttempts.id, attempt.id))
          ]);

          console.log(`[EMAIL_DEDUP] Email sent successfully with key: ${idempotencyKey}`);
          
          return {
            success: true,
            idempotencyKey,
            isDuplicate: false,
            message: 'Email sent successfully',
            attemptNumber
          };
        } else {
          throw new Error('Email service returned false');
        }
      } catch (emailError) {
        // Mark attempt as failed
        await Promise.all([
          db.update(emailIdempotencyKeys)
            .set({ status: 'failed' })
            .where(eq(emailIdempotencyKeys.idempotencyKey, idempotencyKey)),
          
          db.update(emailSendAttempts)
            .set({ 
              status: 'failed', 
              errorMessage: emailError instanceof Error ? emailError.message : 'Unknown error',
              completedAt: new Date() 
            })
            .where(eq(emailSendAttempts.id, attempt.id))
        ]);

        console.error(`[EMAIL_DEDUP] Email send failed for key: ${idempotencyKey}`, emailError);
        
        return {
          success: false,
          idempotencyKey,
          isDuplicate: false,
          message: emailError instanceof Error ? emailError.message : 'Email send failed',
          attemptNumber
        };
      }
    } catch (error) {
      console.error('[EMAIL_DEDUP] Error in sendEmailWithDeduplication:', error);
      
      return {
        success: false,
        idempotencyKey,
        isDuplicate: false,
        message: error instanceof Error ? error.message : 'Unexpected error',
        attemptNumber: 1
      };
    }
  }

  /**
   * Clean up expired idempotency keys and old deduplication logs
   */
  static async cleanupExpiredRecords(): Promise<{ deletedKeys: number; deletedLogs: number; deletedAttempts: number }> {
    const now = new Date();
    
    try {
      // Delete expired idempotency keys and their attempts
      const expiredKeys = await db
        .select({ idempotencyKey: emailIdempotencyKeys.idempotencyKey })
        .from(emailIdempotencyKeys)
        .where(sql`${emailIdempotencyKeys.expiresAt} < ${now}`);

      const expiredKeyStrings = expiredKeys.map(k => k.idempotencyKey);
      
      let deletedAttempts = 0;
      let deletedKeys = 0;
      
      if (expiredKeyStrings.length > 0) {
        const attemptsResult = await db
          .delete(emailSendAttempts)
          .where(sql`${emailSendAttempts.idempotencyKey} IN (${sql.join(expiredKeyStrings.map(k => sql`${k}`), sql`, `)})`);
        
        const keysResult = await db
          .delete(emailIdempotencyKeys)
          .where(sql`${emailIdempotencyKeys.expiresAt} < ${now}`);

        deletedAttempts = attemptsResult.rowCount || 0;
        deletedKeys = keysResult.rowCount || 0;
      }

      // Delete old deduplication logs (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const logsResult = await db
        .delete(emailDeduplicationLog)
        .where(sql`${emailDeduplicationLog.preventedAt} < ${thirtyDaysAgo}`);

      const deletedLogs = logsResult.rowCount || 0;

      console.log(`[EMAIL_CLEANUP] Cleaned up ${deletedKeys} expired keys, ${deletedAttempts} attempts, ${deletedLogs} old logs`);
      
      return { deletedKeys, deletedLogs, deletedAttempts };
    } catch (error) {
      console.error('[EMAIL_CLEANUP] Error during cleanup:', error);
      return { deletedKeys: 0, deletedLogs: 0, deletedAttempts: 0 };
    }
  }

  /**
   * Get email statistics for monitoring
   */
  static async getEmailStats(hours: number = 24): Promise<{
    totalSent: number;
    totalFailed: number;
    duplicatesPrevented: number;
    retryAttempts: number;
    uniqueRecipients: number;
  }> {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);

    try {
      const [sentStats, duplicateStats, retryStats] = await Promise.all([
        // Successful sends
        db
          .select({
            totalSent: sql<number>`COUNT(CASE WHEN ${emailIdempotencyKeys.status} = 'sent' THEN 1 END)`,
            totalFailed: sql<number>`COUNT(CASE WHEN ${emailIdempotencyKeys.status} = 'failed' THEN 1 END)`,
            uniqueRecipients: sql<number>`COUNT(DISTINCT ${emailIdempotencyKeys.recipientEmail})`
          })
          .from(emailIdempotencyKeys)
          .where(gte(emailIdempotencyKeys.createdAt, hoursAgo)),

        // Duplicates prevented
        db
          .select({
            duplicatesPrevented: sql<number>`COUNT(*)`
          })
          .from(emailDeduplicationLog)
          .where(gte(emailDeduplicationLog.preventedAt, hoursAgo)),

        // Retry attempts
        db
          .select({
            retryAttempts: sql<number>`COUNT(CASE WHEN ${emailSendAttempts.attemptNumber} > 1 THEN 1 END)`
          })
          .from(emailSendAttempts)
          .where(gte(emailSendAttempts.attemptedAt, hoursAgo))
      ]);

      return {
        totalSent: Number(sentStats[0]?.totalSent || 0),
        totalFailed: Number(sentStats[0]?.totalFailed || 0),
        duplicatesPrevented: Number(duplicateStats[0]?.duplicatesPrevented || 0),
        retryAttempts: Number(retryStats[0]?.retryAttempts || 0),
        uniqueRecipients: Number(sentStats[0]?.uniqueRecipients || 0)
      };
    } catch (error) {
      console.error('[EMAIL_STATS] Error getting email stats:', error);
      return {
        totalSent: 0,
        totalFailed: 0,
        duplicatesPrevented: 0,
        retryAttempts: 0,
        uniqueRecipients: 0
      };
    }
  }
}

// Export convenience function for direct use
export const sendEmailWithDeduplication = EmailDeduplicationService.sendEmailWithDeduplication.bind(EmailDeduplicationService); 