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
import { db, migrationRunner } from './db.js';
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

  // Add helmet for security headers (disable CSP to avoid conflicts with nginx)
  app.use(helmet({
    contentSecurityPolicy: false, // CSP handled by nginx
  }));

  // Add CORS
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN || 'https://your-production-domain.com'
    : '*';
  
  // Enhanced CORS configuration for Cloudflare tunnel
  app.use(cors({
    origin: (origin, callback) => {
      // Always allow same-origin requests (no origin header)
      if (!origin) return callback(null, true);
      
      if (process.env.NODE_ENV === 'production') {
        const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
        
        // Add debugging for Cloudflare tunnel
        console.log('[CORS] Origin:', origin, 'Allowed:', allowedOrigins);
        
        // Allow configured origins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Also allow Cloudflare tunnel domain
        if (origin.includes('cfargotunnel.com') || origin.includes('spectrum4.ca')) {
          console.log('[CORS] Allowing Cloudflare tunnel origin:', origin);
          return callback(null, true);
        }
        
        console.log('[CORS] Rejecting origin:', origin);
        return callback(new Error('Not allowed by CORS'));
      } else {
        // Development mode - allow all
        return callback(null, true);
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    exposedHeaders: ['X-Request-ID']
  }));

  // Add middleware to log Cloudflare headers for debugging
  app.use('/api/', (req, res, next) => {
    if (process.env.NODE_ENV === 'production' && process.env.LOG_LEVEL === 'DEBUG') {
      console.log('[CF-Debug]', {
        'CF-Ray': req.headers['cf-ray'],
        'CF-Connecting-IP': req.headers['cf-connecting-ip'],
        'X-Forwarded-For': req.headers['x-forwarded-for'],
        'X-Real-IP': req.headers['x-real-ip'],
        'Origin': req.headers.origin,
        'Referer': req.headers.referer,
        'Host': req.headers.host,
        'Remote-Addr': req.ip
      });
    }
    next();
  });

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
    } catch (error) {
      logger.error("Error fetching admin announcements:", error);
      res.status(500).json({ message: 'Failed to fetch announcements' });
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
      if (user) {
        await db.execute(sql`
          UPDATE admin_announcements 
          SET created_by_new = ${user.id}, updated_by_new = ${user.id}
          WHERE id = ${announcement.id}
        `);
      }

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
      if (user) {
        await db.execute(sql`
          UPDATE admin_announcements 
          SET updated_by_new = ${user.id}
          WHERE id = ${parseInt(id)}
        `);
      }

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

  // Add database status endpoint for deployment verification
  app.get('/api/database-status', authenticateUser, requireAdmin, async (req, res) => {
    try {
      const status = await migrationRunner.getDatabaseStatus();
      res.json({
        success: true,
        database: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to get database status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get database status',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get the profile of the currently authenticated user
  app.get("/api/user-profile", authenticateUser, async (req, res) => {
    try {
      console.log('[API] /api/user-profile called - route is working!');
      
      // Cast the request to our custom type to access appUser
      const request = req as AuthenticatedRequest;
      const user = request.appUser;

      console.log('[API] User auth check:', {
        hasUser: !!user,
        hasProfile: !!user?.profile,
        userEmail: user?.email || 'no-email'
      });

      if (!user || !user.profile) {
        console.log('[API] User profile not found, returning 404');
        return res.status(404).json({ message: "User profile not found." });
      }
      
      console.log('[API] Returning user profile:', { role: user.profile.role });
      // Return the profile part of the user object
      res.json(user.profile);

    } catch (error) {
      console.error("[API] Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile." });
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
