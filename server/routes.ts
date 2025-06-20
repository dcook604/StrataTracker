import express from 'express';
import type { Express } from "express";
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer, type Server } from "http";
import userManagementRoutes from "./routes/user-management.js";
import emailConfigRoutes from "./routes/email-config.js";
import communicationsRoutes from "./routes/communications.js";
import bylawsRoutes from './routes/bylaws.js';
import violationsRoutes from './routes/violations.js'; // Import the new violations router
import violationCategoriesRoutes from './routes/violation-categories.js'; // Import the dedicated violation categories router
import unitsRoutes from './routes/units.js'; // Import the new units router
import reportsRoutes from './routes/reports.js'; // Import the new reports router
import auditLogsRoutes from './routes/audit-logs.js'; // Import the audit logs router
import publicViolationsRoutes from './routes/public-violations.js'; // Import public violations router
import healthRoutes from './routes/health.js';
import path from "path";
import fs from "fs/promises";
import logger from "./utils/logger.js";
import { getVirusScanner } from "./services/virusScanner.js";
import { adminAnnouncements } from '#shared/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { AuditLogger, AuditAction, TargetType } from './audit-logger.js';
import { db } from './db.js';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from './middleware/supabase-auth-middleware.js';

export async function registerRoutes(app: Express): Promise<Server> {
  // Public health endpoint for Docker health checks (no authentication required)
  app.get("/api/health", async (req, res) => {
    try {
      res.status(200).json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        service: "StrataTracker API"
      });
    } catch {
      res.status(503).json({ 
        status: "unhealthy", 
        timestamp: new Date().toISOString(),
        error: "Service unavailable"
      });
    }
  });

  // Add helmet for security headers
  app.use(helmet());

  // Add CORS
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN || 'https://your-production-domain.com'
    : '*';
  app.use(cors({
    origin: allowedOrigin,
    credentials: true,
  }));

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), "uploads");
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create uploads directory:", error);
  }
  
  // Initialize virus scanner
  const virusScanner = getVirusScanner();
  try {
    await virusScanner.initialize();
    logger.info('[App] Virus scanner initialized successfully');
  } catch (error) {
    logger.warn('[App] Virus scanner initialization failed:', error);
    if (process.env.VIRUS_SCANNING_ENABLED === 'true') {
      logger.error('[App] Virus scanning is enabled but initialization failed. Consider disabling if ClamAV is not available.');
    }
  }
  
  // Set up authentication routes first
  // setupAuth(app); // Old auth setup removed
  
  // Apply rate limiting specifically to /api routes
  const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests to API, please try again later.'
  });
  app.use("/api", apiRateLimiter);

  // Apply optional auth to admin announcements (public route)
  // Note: Individual routes will apply authenticateUser where needed
  
  // Admin Announcements Routes - MUST be defined before modular routes to avoid conflicts
  app.get('/api/admin-announcements', async (req, res) => {
    try {
      const announcements = await db
        .select()
        .from(adminAnnouncements)
        .where(eq(adminAnnouncements.isActive, true))
        .orderBy(desc(adminAnnouncements.priority), desc(adminAnnouncements.createdAt));
      
      res.json(announcements);
    } catch {
      logger.error("Error fetching admin announcements:", "No details available.");
    }
  });

  app.get('/api/admin-announcements/manage', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const announcements = await db
        .select()
        .from(adminAnnouncements)
        .orderBy(desc(adminAnnouncements.priority), desc(adminAnnouncements.createdAt));
      
      res.json(announcements);
    } catch (error) {
      console.error('Error fetching admin announcements for management:', error);
      res.status(500).json({ message: 'Failed to fetch announcements' });
    }
  });

  app.post('/api/admin-announcements', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { title, content, htmlContent, isActive, priority } = req.body;
      const user = (req as AuthenticatedRequest).user;
      
      if (!title || !content || !htmlContent) {
        return res.status(400).json({ message: 'Title, content, and htmlContent are required' });
      }

      const [announcement] = await db
        .insert(adminAnnouncements)
        .values({
          title,
          content,
          htmlContent,
          isActive: isActive ?? true,
          priority: priority ?? 0,
          createdBy: null, // Old column - set to null
          updatedBy: null, // Old column - set to null  
        })
        .returning();

      // Update with new UUID columns using raw SQL since schema might not be updated yet
      await db.execute(sql`
        UPDATE admin_announcements 
        SET created_by_new = ${user.id}, updated_by_new = ${user.id}
        WHERE id = ${announcement.id}
      `);

      await AuditLogger.logFromRequest(req, AuditAction.SYSTEM_SETTING_UPDATED, {
        targetType: TargetType.SYSTEM_SETTING,
        targetId: announcement.id.toString(),
        details: { action: 'created_announcement', title, isActive, priority },
      });

      res.json(announcement);
    } catch (error) {
      console.error('Error creating admin announcement:', error);
      res.status(500).json({ message: 'Failed to create announcement' });
    }
  });

  app.put('/api/admin-announcements/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, htmlContent, isActive, priority } = req.body;
      const user = (req as AuthenticatedRequest).user;
      
      if (!title || !content || !htmlContent) {
        return res.status(400).json({ message: 'Title, content, and htmlContent are required' });
      }

      const [announcement] = await db
        .update(adminAnnouncements)
        .set({
          title,
          content,
          htmlContent,
          isActive,
          priority,
          updatedBy: null, // Old column - set to null
          updatedAt: new Date(),
        })
        .where(eq(adminAnnouncements.id, parseInt(id)))
        .returning();

      // Update with new UUID column using raw SQL
      await db.execute(sql`
        UPDATE admin_announcements 
        SET updated_by_new = ${user.id}
        WHERE id = ${parseInt(id)}
      `);

      if (!announcement) {
        return res.status(404).json({ message: 'Announcement not found' });
      }

      await AuditLogger.logFromRequest(req, AuditAction.SYSTEM_SETTING_UPDATED, {
        targetType: TargetType.SYSTEM_SETTING,
        targetId: id,
        details: { action: 'updated_announcement', title, isActive, priority },
      });

      res.json(announcement);
    } catch (error) {
      console.error('Error updating admin announcement:', error);
      res.status(500).json({ message: 'Failed to update announcement' });
    }
  });

  app.delete('/api/admin-announcements/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const [announcement] = await db
        .delete(adminAnnouncements)
        .where(eq(adminAnnouncements.id, parseInt(id)))
        .returning({ title: adminAnnouncements.title });

      if (!announcement) {
        return res.status(404).json({ message: 'Announcement not found' });
      }

      await AuditLogger.logFromRequest(req, AuditAction.SYSTEM_SETTING_UPDATED, {
        targetType: TargetType.SYSTEM_SETTING,
        targetId: id,
        details: { action: 'deleted_announcement', title: announcement.title },
      });

      res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
      console.error('Error deleting admin announcement:', error);
      res.status(500).json({ message: 'Failed to delete announcement' });
    }
  });

  // Register modular routes - apply authentication middleware where needed
  app.use("/api/users", authenticateUser, userManagementRoutes);
  app.use("/api/email-config", authenticateUser, emailConfigRoutes);
  app.use("/api/communications", authenticateUser, communicationsRoutes);
  app.use("/api/bylaws", authenticateUser, bylawsRoutes);
  app.use("/api/violations", authenticateUser, violationsRoutes);
  app.use('/api/violation-categories', authenticateUser, violationCategoriesRoutes);
  app.use('/api/units', authenticateUser, unitsRoutes);
  app.use('/api/property-units', authenticateUser, unitsRoutes);
  app.use('/api/reports', authenticateUser, reportsRoutes); // Register the reports router
  app.use('/api/audit-logs', authenticateUser, auditLogsRoutes); // Register the audit logs router
  app.use('/public', publicViolationsRoutes); // Register public violations router (no auth)

  // Serve uploaded files statically
  app.use('/api/uploads', express.static(uploadsDir));

  // Any remaining, un-refactored routes can be cleaned up or moved next.
  
  const httpServer = createServer(app);
  return httpServer;
}
