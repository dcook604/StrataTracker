import { db } from './db';
import { auditLogs, type InsertAuditLog, type Profile } from '@shared/schema';
import logger from './utils/logger';
import type { Request } from 'express';

export enum AuditAction {
  // Authentication
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_LOGIN_FAILED = 'USER_LOGIN_FAILED',
  
  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_PASSWORD_CHANGED = 'USER_PASSWORD_CHANGED',
  USER_PASSWORD_RESET = 'USER_PASSWORD_RESET',
  
  // Violation Management
  VIOLATION_CREATED = 'VIOLATION_CREATED',
  VIOLATION_UPDATED = 'VIOLATION_UPDATED',
  VIOLATION_DELETED = 'VIOLATION_DELETED',
  VIOLATION_STATUS_CHANGED = 'VIOLATION_STATUS_CHANGED',
  VIOLATION_APPROVED = 'VIOLATION_APPROVED',
  VIOLATION_REJECTED = 'VIOLATION_REJECTED',
  VIOLATION_DISPUTED = 'VIOLATION_DISPUTED',
  
  // Unit Management
  UNIT_CREATED = 'UNIT_CREATED',
  UNIT_UPDATED = 'UNIT_UPDATED',
  UNIT_DELETED = 'UNIT_DELETED',
  
  // System Settings
  SYSTEM_SETTING_UPDATED = 'SYSTEM_SETTING_UPDATED',
  EMAIL_CONFIG_UPDATED = 'EMAIL_CONFIG_UPDATED',
  
  // Communications
  EMAIL_CAMPAIGN_CREATED = 'EMAIL_CAMPAIGN_CREATED',
  EMAIL_CAMPAIGN_SENT = 'EMAIL_CAMPAIGN_SENT',
  EMAIL_SENT = 'EMAIL_SENT',
  
  // Bylaws
  BYLAW_CREATED = 'BYLAW_CREATED',
  BYLAW_UPDATED = 'BYLAW_UPDATED',
  BYLAW_DELETED = 'BYLAW_DELETED',
  
  // Data Access
  DATA_EXPORT = 'DATA_EXPORT',
  REPORT_GENERATED = 'REPORT_GENERATED',
  
  // Security
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

export enum TargetType {
  USER = 'USER',
  VIOLATION = 'VIOLATION',
  UNIT = 'UNIT',
  SYSTEM_SETTING = 'SYSTEM_SETTING',
  EMAIL_CAMPAIGN = 'EMAIL_CAMPAIGN',
  BYLAW = 'BYLAW',
  REPORT = 'REPORT',
  SESSION = 'SESSION',
}

interface AuditLogData {
  action: AuditAction;
  targetType?: TargetType;
  targetId?: string | number;
  details?: Record<string, any>;
  userId?: string | number;
  userName?: string | null;
  userEmail?: string;
  ipAddress?: string;
}

export class AuditLogger {
  /**
   * Log an audit event
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      const auditEntry: Partial<InsertAuditLog> = {
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId?.toString(),
        details: data.details,
        userName: data.userName,
        userEmail: data.userEmail,
        ipAddress: data.ipAddress,
        timestamp: new Date(),
      };

      if (typeof data.userId === 'string') {
        auditEntry.userIdNew = data.userId;
      } else if (typeof data.userId === 'number') {
        auditEntry.userId = data.userId;
      }

      await db.insert(auditLogs).values(auditEntry);
      
      // Also log to application logger for immediate visibility
      logger.info(`[AUDIT] ${data.action} by ${data.userName || 'system'} (${data.userEmail || 'N/A'}) - ${data.targetType || 'N/A'}:${data.targetId || 'N/A'}`, {
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        userId: data.userId,
        ipAddress: data.ipAddress,
        details: data.details,
      });
    } catch (error) {
      logger.error('Failed to create audit log entry:', error);
      // Don't throw error to avoid breaking the main application flow
    }
  }

  /**
   * Log from Express request context
   */
  static async logFromRequest(req: Request, action: AuditAction, options: {
    targetType?: TargetType;
    targetId?: string | number;
    details?: Record<string, any>;
  } = {}): Promise<void> {
    const user = req.user as (Profile & { email?: string });
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;

    await this.log({
      action,
      targetType: options.targetType,
      targetId: options.targetId,
      details: options.details,
      userId: user?.id,
      userName: user?.fullName,
      userEmail: user?.email,
      ipAddress,
    });
  }

  /**
   * Log authentication events
   */
  static async logAuth(action: AuditAction.USER_LOGIN | AuditAction.USER_LOGOUT | AuditAction.USER_LOGIN_FAILED, data: {
    userEmail?: string;
    userId?: number;
    userName?: string;
    ipAddress?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      action,
      targetType: TargetType.SESSION,
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      ipAddress: data.ipAddress,
      details: data.details,
    });
  }

  /**
   * Log system events (when no user context is available)
   */
  static async logSystem(action: AuditAction, options: {
    targetType?: TargetType;
    targetId?: string | number;
    details?: Record<string, any>;
  } = {}): Promise<void> {
    await this.log({
      action,
      targetType: options.targetType,
      targetId: options.targetId,
      details: options.details,
      userName: 'SYSTEM',
    });
  }
}

export default AuditLogger; 