import express from 'express';
import { db } from '../db.js';
import { auditLogs, profiles } from '#shared/schema.js';
import { eq, desc, and, gte, lte, like, or, inArray, sql } from 'drizzle-orm';
import { AuditLogger, AuditAction, TargetType } from '../audit-logger.js';
import { requireAdmin } from '../middleware/supabase-auth-middleware.js';

const router = express.Router();

// Middleware to ensure only admins can access audit logs
router.use(requireAdmin);

// GET /api/audit-logs - Retrieve audit logs with filtering and pagination
router.get('/', async (req, res) => {
  try {
    await AuditLogger.logFromRequest(req, AuditAction.DATA_EXPORT, {
      targetType: TargetType.REPORT,
      details: { reportType: 'audit_logs', query: req.query },
    });

    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      userId,
      action,
      targetType,
      search,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 1000); // Max 1000 records per page
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const conditions = [];

    // Date range filter
    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, new Date(startDate as string)));
    }
    if (endDate) {
      // Set end date to end of day (23:59:59.999) to include all records from that day
      const endOfDay = new Date(endDate as string);
      endOfDay.setUTCHours(23, 59, 59, 999);
      conditions.push(lte(auditLogs.timestamp, endOfDay));
    }

    // User filter
    if (userId) {
      conditions.push(eq(auditLogs.userId, String(userId)));
    }

    // Action filter
    if (action) {
      if (Array.isArray(action)) {
        conditions.push(inArray(auditLogs.action, action as string[]));
      } else {
        conditions.push(eq(auditLogs.action, action as string));
      }
    }

    // Target type filter
    if (targetType) {
      if (Array.isArray(targetType)) {
        conditions.push(inArray(auditLogs.targetType, targetType as string[]));
      } else {
        conditions.push(eq(auditLogs.targetType, targetType as string));
      }
    }

    // Search filter (search in user name, user email, action, or details)
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          like(auditLogs.userName, searchTerm),
          like(auditLogs.userEmail, searchTerm),
          like(auditLogs.action, searchTerm),
          like(auditLogs.targetId, searchTerm)
        )
      );
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(whereClause);
    const totalCount = totalCountResult[0]?.count || 0;

    // Get the audit logs
    const logs = await db
      .select({
        id: auditLogs.id,
        timestamp: auditLogs.timestamp,
        userId: auditLogs.userId,
        userName: auditLogs.userName,
        userEmail: auditLogs.userEmail,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
      })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limitNum)
      .offset(offset);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasNext,
        hasPrev,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Failed to retrieve audit logs' });
  }
});

// GET /api/audit-logs/stats - Get audit log statistics
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    await AuditLogger.logFromRequest(req, AuditAction.DATA_EXPORT, {
      targetType: TargetType.REPORT,
      details: { reportType: 'audit_stats', startDate, endDate },
    });

    // Build date filter
    const conditions = [];
    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, new Date(startDate as string)));
    }
    if (endDate) {
      // Set end date to end of day (23:59:59.999) to include all records from that day
      const endOfDay = new Date(endDate as string);
      endOfDay.setUTCHours(23, 59, 59, 999);
      conditions.push(lte(auditLogs.timestamp, endOfDay));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get action statistics
    const actionStats = await db
      .select({
        action: auditLogs.action,
        count: sql<number>`count(*)`,
      })
      .from(auditLogs)
      .where(whereClause)
      .groupBy(auditLogs.action)
      .orderBy(desc(sql`count(*)`));

    // Get user activity statistics
    const userStats = await db
      .select({
        userId: auditLogs.userId,
        userName: auditLogs.userName,
        userEmail: auditLogs.userEmail,
        count: sql<number>`count(*)`,
      })
      .from(auditLogs)
      .where(whereClause)
      .groupBy(auditLogs.userId, auditLogs.userName, auditLogs.userEmail)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Get daily activity (last 30 days)
    const dailyActivity = await db
      .select({
        date: sql<string>`DATE(timestamp)`,
        count: sql<number>`count(*)`,
      })
      .from(auditLogs)
      .where(
        and(
          whereClause,
          gte(auditLogs.timestamp, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        )
      )
      .groupBy(sql`DATE(timestamp)`)
      .orderBy(sql`DATE(timestamp)`);

    res.json({
      actionStats,
      userStats,
      dailyActivity,
    });
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    res.status(500).json({ message: 'Failed to retrieve audit log statistics' });
  }
});

// GET /api/audit-logs/actions - Get list of available actions for filtering
router.get('/actions', async (req, res) => {
  try {
    const actions = Object.values(AuditAction);
    const targetTypes = Object.values(TargetType);
    
    res.json({
      actions,
      targetTypes,
    });
  } catch (error) {
    console.error('Error fetching audit actions:', error);
    res.status(500).json({ message: 'Failed to retrieve audit actions' });
  }
});

// GET /api/audit-logs/export - Export audit logs as CSV
router.get('/export', async (req, res) => {
  try {
    await AuditLogger.logFromRequest(req, AuditAction.DATA_EXPORT, {
      targetType: TargetType.REPORT,
      details: { reportType: 'audit_logs_export', query: req.query },
    });

    // Same filtering logic as the main GET route
    const {
      startDate,
      endDate,
      userId,
      action,
      targetType,
      search,
    } = req.query;

    const conditions = [];
    if (startDate) conditions.push(gte(auditLogs.timestamp, new Date(startDate as string)));
    if (endDate) {
      // Set end date to end of day (23:59:59.999) to include all records from that day
      const endOfDay = new Date(endDate as string);
      endOfDay.setUTCHours(23, 59, 59, 999);
      conditions.push(lte(auditLogs.timestamp, endOfDay));
    }
    if (userId) conditions.push(eq(auditLogs.userId, String(userId)));
    if (action) {
      if (Array.isArray(action)) {
        conditions.push(inArray(auditLogs.action, action as string[]));
      } else {
        conditions.push(eq(auditLogs.action, action as string));
      }
    }
    if (targetType) {
      if (Array.isArray(targetType)) {
        conditions.push(inArray(auditLogs.targetType, targetType as string[]));
      } else {
        conditions.push(eq(auditLogs.targetType, targetType as string));
      }
    }
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          like(auditLogs.userName, searchTerm),
          like(auditLogs.userEmail, searchTerm),
          like(auditLogs.action, searchTerm),
          like(auditLogs.targetId, searchTerm)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get all matching logs (limit to 10,000 for export safety)
    const logs = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(10000);

    // Convert to CSV
    const csvHeader = 'Timestamp,User ID,User Name,User Email,Action,Target Type,Target ID,IP Address,Details\n';
    const csvRows = logs.map(log => {
      const details = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
      return [
        log.timestamp?.toISOString() || '',
        log.userId || '',
        log.userName || '',
        log.userEmail || '',
        log.action || '',
        log.targetType || '',
        log.targetId || '',
        log.ipAddress || '',
        `"${details}"`,
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ message: 'Failed to export audit logs' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const userList = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
      })
      .from(profiles)
      .orderBy(desc(profiles.fullName));
    res.json(userList);
  } catch (error) {
    console.error('Error fetching users for audit log filter:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

export default router; 