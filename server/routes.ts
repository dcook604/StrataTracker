import express from 'express';
import type { Express, Request, Response } from "express";
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import userManagementRoutes from "./routes/user-management";
import emailConfigRoutes from "./routes/email-config";
import communicationsRoutes from "./routes/communications";
import bylawsRoutes from './routes/bylaws';
import violationsRoutes from './routes/violations'; // Import the new violations router
import violationCategoriesRoutes from './routes/violation-categories'; // Import the dedicated violation categories router
import unitsRoutes from './routes/units'; // Import the new units router
import reportsRoutes from './routes/reports'; // Import the new reports router
import auditLogsRoutes from './routes/audit-logs'; // Import the audit logs router
import path from "path";
import fs from "fs/promises";
import logger from "./utils/logger";
import { getVirusScanner } from "./services/virusScanner";
import { adminAnnouncements, type AdminAnnouncement, type InsertAdminAnnouncement, users } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { AuditLogger, AuditAction, TargetType } from './audit-logger';
import { requireAdmin } from './auth';
import { db } from './db';

export async function registerRoutes(app: Express): Promise<Server> {
  // Public health endpoint for Docker health checks (no authentication required)
  app.get("/api/health", async (req, res) => {
    try {
      res.status(200).json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        service: "StrataTracker API"
      });
    } catch (error) {
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
  setupAuth(app);
  
  // Apply rate limiting specifically to /api routes
  const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests to API, please try again later.'
  });
  app.use("/api", apiRateLimiter);
  
  // Register modular routes
  app.use("/api/users", userManagementRoutes);
  app.use("/api/email-config", emailConfigRoutes);
  app.use("/api/communications", communicationsRoutes);
  app.use("/api/bylaws", bylawsRoutes);
  app.use("/api/violations", violationsRoutes);
  app.use('/api/violation-categories', violationCategoriesRoutes);
  app.use('/api/units', unitsRoutes);
  app.use('/api/property-units', unitsRoutes);
  app.use('/api/reports', reportsRoutes); // Register the reports router
  app.use('/api/audit-logs', auditLogsRoutes); // Register the audit logs router

  // Serve uploaded files statically
  app.use('/api/uploads', express.static(uploadsDir));

  // Admin Announcements Routes
  app.get('/api/admin-announcements', async (req, res) => {
    try {
      const announcements = await db
        .select()
        .from(adminAnnouncements)
        .where(eq(adminAnnouncements.isActive, true))
        .orderBy(desc(adminAnnouncements.priority), desc(adminAnnouncements.createdAt));
      
      res.json(announcements);
    } catch (error) {
      console.error('Error fetching admin announcements:', error);
      res.status(500).json({ message: 'Failed to fetch announcements' });
    }
  });

  app.get('/api/admin-announcements/manage', requireAdmin, async (req, res) => {
    try {
      const announcements = await db
        .select({
          id: adminAnnouncements.id,
          title: adminAnnouncements.title,
          content: adminAnnouncements.content,
          htmlContent: adminAnnouncements.htmlContent,
          isActive: adminAnnouncements.isActive,
          priority: adminAnnouncements.priority,
          createdAt: adminAnnouncements.createdAt,
          updatedAt: adminAnnouncements.updatedAt,
          createdBy: adminAnnouncements.createdBy,
          updatedBy: adminAnnouncements.updatedBy,
          createdByName: users.fullName,
          updatedByName: sql<string | null>`updated_by_user.full_name`,
        })
        .from(adminAnnouncements)
        .leftJoin(users, eq(adminAnnouncements.createdBy, users.id))
        .leftJoin(sql`users updated_by_user`, sql`admin_announcements.updated_by = updated_by_user.id`)
        .orderBy(desc(adminAnnouncements.priority), desc(adminAnnouncements.createdAt));
      
      res.json(announcements);
    } catch (error) {
      console.error('Error fetching admin announcements for management:', error);
      res.status(500).json({ message: 'Failed to fetch announcements' });
    }
  });

  app.post('/api/admin-announcements', requireAdmin, async (req, res) => {
    try {
      const { title, content, htmlContent, isActive, priority } = req.body;
      
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
          createdBy: req.user!.id,
          updatedBy: req.user!.id,
        })
        .returning();

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

  app.put('/api/admin-announcements/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, htmlContent, isActive, priority } = req.body;
      
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
          updatedBy: req.user!.id,
          updatedAt: new Date(),
        })
        .where(eq(adminAnnouncements.id, parseInt(id)))
        .returning();

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

  app.delete('/api/admin-announcements/:id', requireAdmin, async (req, res) => {
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

  // Any remaining, un-refactored routes can be cleaned up or moved next.
  
  const httpServer = createServer(app);
  return httpServer;
}
