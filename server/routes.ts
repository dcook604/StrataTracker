import express from 'express';
import type { Express, Request, Response } from "express";
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { setupAuth } from "./auth";
import { 
  sendNewViolationToOccupantsNotification,
  sendViolationApprovedNotification, 
  sendViolationApprovedToOccupantsNotification,
  sendViolationPendingApprovalToAdminsNotification,
  sendViolationDisputedToAdminsNotification,
  sendViolationRejectedToOccupantsNotification
} from "./email";
import { z } from "zod";
import { format } from 'date-fns'; // Added for CSV date formatting
import { generateViolationsPdf } from "./pdfGenerator"; // Corrected PDF generator import path
import { 
  insertViolationSchema, 
  insertPropertyUnitSchema, 
  insertViolationHistorySchema,
  insertViolationCategorySchema,
  insertCustomerSchema,
  insertSystemSettingSchema,
  insertUnitFacilitySchema,
  type User
} from "@shared/schema";
import userManagementRoutes from "./routes/user-management";
import emailConfigRoutes from "./routes/email-config";
import communicationsRoutes from "./routes/communications";
import bylawsRoutes from './routes/bylaws';
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import logger from "./utils/logger";
import { eq, desc, and, gte, lte, SQL, asc, count, like, isNull, or } from "drizzle-orm";
import archiver from "archiver";
import crypto from "crypto";
import { createSecureUpload, cleanupUploadedFiles } from "./middleware/fileUploadSecurity";
import { getVirusScanner } from "./services/virusScanner";
import { sendEmailWithDeduplication } from "./email";

// Ensure user is authenticated middleware
const ensureAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Ensure user is council member middleware
const ensureCouncilMember = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user && (req.user.isCouncilMember || req.user.isAdmin)) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin or Council access required" });
};

// Helper to ensure userId is present
function getUserId(req: Request, res: Response): number | undefined {
  if (typeof req.user?.id !== "number") {
    res.status(401).json({ message: "User ID is required" });
    return undefined;
  }
  return req.user.id;
}

// Utility function to determine if a parameter is a UUID or integer ID
function isUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// Helper function to get violation by ID or UUID
async function getViolationByIdOrUuid(idOrUuid: string) {
  if (isUUID(idOrUuid)) {
    return await dbStorage.getViolationWithUnitByUuid(idOrUuid);
  } else {
    const id = parseInt(idOrUuid);
    if (isNaN(id)) {
      throw new Error("Invalid violation identifier");
    }
    return await dbStorage.getViolationWithUnit(id);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Public health endpoint for Docker health checks (no authentication required)
  app.get("/api/health", async (req, res) => {
    try {
      // Basic health check - just verify the server is responding
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
  app.use("/api", apiRateLimiter); // Apply to all /api routes
  
  // Register user management routes
  app.use("/api/users", userManagementRoutes);
  
  // Register email configuration routes
  app.use("/api/email-config", emailConfigRoutes);
  
  // Register communications routes
  app.use("/api/communications", communicationsRoutes);

  // Register bylaws routes
  app.use("/api/bylaws", bylawsRoutes);

  // Serve uploaded files statically
  app.use('/api/uploads', express.static(uploadsDir));

  // Unit Management API (New)
  app.get("/api/units", ensureAuthenticated, async (req, res) => {
    try {
      const { page, limit, sortBy, sortOrder } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const result = await dbStorage.getAllUnitsPaginated(
        pageNum,
        limitNum,
        sortBy as string | undefined,
        sortOrder as 'asc' | 'desc' | undefined
      );
      res.json(result); // Should be { units: PropertyUnit[], total: number }
    } catch (error: any) {
      console.error("Failed to fetch units:", error);
      res.status(500).json({ message: "Failed to fetch units", details: error.message });
    }
  });

  app.get("/api/units/:id/details", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }
      
      const unitDetails = await dbStorage.getUnitWithPersonsAndFacilities(id);
      if (!unitDetails) {
        return res.status(404).json({ message: "Unit not found" });
      }
      
      res.json(unitDetails);
    } catch (error: any) {
      console.error("Failed to fetch unit details:", error);
      res.status(500).json({ message: "Failed to fetch unit details", details: error.message });
    }
  });

  // Create secure upload configuration
  const { upload, virusScanMiddleware, contentValidationMiddleware } = createSecureUpload({
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    enableVirusScanning: process.env.VIRUS_SCANNING_ENABLED === 'true',
    enableDeepValidation: true
  });

  // Health check endpoint for virus scanner
  app.get("/api/health/virus-scanner", ensureAuthenticated, async (req, res) => {
    const scanner = getVirusScanner();
    try {
      const version = await scanner.getVersion();
      res.json({
        enabled: scanner.isEnabled(),
        ready: scanner.isReady(),
        version: version || 'Unknown',
        status: scanner.isReady() ? 'operational' : 'unavailable'
      });
    } catch (error: any) {
      res.status(500).json({
        enabled: scanner.isEnabled(),
        ready: false,
        version: null,
        status: 'error',
        error: error.message
      });
    }
  });

  // Property Units API
  app.get("/api/property-units", ensureAuthenticated, async (req, res) => {
    try {
      const units = await dbStorage.getAllPropertyUnits();
      res.json(units);
    } catch (error) {
      console.error("Property units fetch error:", error);
      // Return empty array as fallback
      res.json([]);
    }
  });

  app.post("/api/property-units", ensureAuthenticated, async (req, res) => {
    try {
      const unitData = insertPropertyUnitSchema.parse(req.body);
      const unit = await dbStorage.createPropertyUnit(unitData);
      res.status(201).json(unit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create property unit" });
    }
  });

  // Violations API
  app.get("/api/violations", ensureAuthenticated, async (req, res) => {
    try {
      const { status, unitId, page, limit, sortBy, sortOrder } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const result = await dbStorage.getViolationsPaginated(
        pageNum,
        limitNum,
        status as string | undefined,
        unitId ? parseInt(unitId as string) : undefined,
        sortBy as string | undefined,
        sortOrder as 'asc' | 'desc' | undefined
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch violations" });
    }
  });

  app.get("/api/violations/recent", ensureAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const violations = await dbStorage.getRecentViolations(limit);
      res.json(violations);
    } catch (error) {
      console.error("Recent violations fetch error:", error);
      // Return empty array as fallback
      res.json([]);
    }
  });

  // --- API: Get all violations pending approval (council/admin only) ---
  app.get("/api/violations/pending-approval", ensureAuthenticated, ensureCouncilMember, async (req, res) => {
    try {
      const userId = getUserId(req, res);
      if (userId === undefined) return;

      const pendingViolations = await dbStorage.getPendingApprovalViolations(userId);
      
      res.json(pendingViolations);
    } catch (error) {
      logger.error('[API] Error fetching pending violations:', error);
      res.status(500).json({ message: "Failed to fetch pending violations" });
    }
  });

  app.get("/api/violations/:id", ensureAuthenticated, async (req, res) => {
    try {
      const violation = await getViolationByIdOrUuid(req.params.id);
      
      if (!violation) {
        return res.status(404).json({ message: "Violation not found" });
      }
      
      res.json(violation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch violation" });
    }
  });

  app.post("/api/violations", 
    ensureAuthenticated, 
    upload.array("attachments", 5),
    contentValidationMiddleware,
    virusScanMiddleware,
    async (req, res) => {
      const userId = getUserId(req, res);
      if (userId === undefined) return;

      const files = req.files as Express.Multer.File[];

      try {
        // Handle file uploads with enhanced security
        const attachments = files ? files.map(file => file.filename) : [];
        logger.info(`[Violation Upload] User ${userId} uploaded ${files?.length || 0} files:`, files?.map(f => f.originalname));
        
        const violationData = {
          ...req.body,
          reportedById: userId,
          attachments,
          categoryId: req.body.categoryId ? parseInt(req.body.categoryId, 10) : undefined,
          unitId: req.body.unitId ? parseInt(req.body.unitId, 10) : undefined,
        };
        
        const validatedData = insertViolationSchema.parse({
          ...violationData,
          violationDate: new Date(violationData.violationDate), 
          attachments: Array.isArray(violationData.attachments) ? violationData.attachments : [],
        });

        const violation = await dbStorage.createViolation(validatedData);
        logger.info(`[Violation Upload] Created violation with UUID: ${violation.uuid}`);
        
        const unit = await dbStorage.getPropertyUnit(violation.unitId);
        const reporterUser = req.user as User;

        // NEW LOGIC: Send notification to occupants
        if (unit && reporterUser) {
          try {
            const personsForUnit = await dbStorage.getPersonsWithRolesForUnit(violation.unitId);
            const personsToNotifyForEmail = [];

            for (const person of personsForUnit) {
              let accessLinkForPerson: string | undefined = undefined;
              // Generate access link if person is set to receive notifications OR always generate and let email function decide?
              // For now, generate if notifications are enabled, as the link is for them to use.
              if (person.receiveEmailNotifications && person.email) {
                const token = await dbStorage.createViolationAccessLink({
                  violationId: violation.id,
                  violationUuid: violation.uuid,
                  recipientEmail: person.email,
                  // role and personId are not stored in violationAccessLinks table per schema
                });
                if (token) {
                  // Ensure APP_URL is available in your environment variables
                  const appUrl = process.env.APP_URL || 'http://localhost:5173'; 
                  accessLinkForPerson = `${appUrl}/public/violation-dispute/${token}`;
                }
              }
              personsToNotifyForEmail.push({
                ...person, // includes personId, fullName, email, role, receiveEmailNotifications
                accessLink: accessLinkForPerson,
              });
            }

            if (personsToNotifyForEmail.length > 0) {
              await sendNewViolationToOccupantsNotification({
                violationId: violation.id,
                unitId: unit.id, // or violation.unitId
                unitNumber: unit.unitNumber,
                violationType: violation.violationType,
                reporterName: reporterUser.fullName,
                personsToNotify: personsToNotifyForEmail,
              });
              logger.info(`[Violation Upload] Attempted to send new violation notifications for violation ${violation.uuid}`);
            }
          } catch (emailError) {
            logger.error(`[Violation Upload] Failed to prepare or send new violation notifications for violation ${violation.uuid}:`, emailError);
            // Continue with success response even if email preparation/sending fails
          }
        }
        // END OF NEW LOGIC for occupant notifications

        // NEW: Admin/Council Notification for Pending Approval
        if (reporterUser) { // reporterUser implies successful user auth and detail fetch
          try {
            const adminCouncilUsers = await dbStorage.getAdminAndCouncilUsers();
            const appUrl = process.env.APP_URL || 'http://localhost:5173';

            for (const adminUser of adminCouncilUsers) {
              await sendViolationPendingApprovalToAdminsNotification({
                violation: {
                  id: violation.id,
                  uuid: violation.uuid,
                  referenceNumber: violation.referenceNumber,
                  violationType: violation.violationType,
                  unitNumber: unit?.unitNumber, // unit might be null if not found, handle gracefully
                },
                adminUser: {
                  id: adminUser.id, // Assumes getAdminAndCouncilUsers returns id
                  fullName: adminUser.fullName,
                  email: adminUser.email,
                },
                reporterName: reporterUser.fullName,
                appUrl: appUrl,
              });
            }
            logger.info(`[Violation Upload] Attempted to send pending approval notifications to admins/council for violation ${violation.uuid}`);
          } catch (adminEmailError) {
            logger.error(`[Violation Upload] Failed to send pending approval notifications to admins/council for ${violation.uuid}:`, adminEmailError);
          }
        }

        res.status(201).json(violation);
      } catch (error: any) {
        // Clean up uploaded files on error
        if (files && files.length > 0) {
          await cleanupUploadedFiles(files);
        }

        if (error instanceof z.ZodError) {
          logger.error("[Validation Error] POST /api/violations:", error.errors);
          return res.status(400).json({ errors: error.errors });
        }
        
        logger.error("Error creating violation:", error);
        
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
        }
        if (error.message?.includes("Only images and PDF files are allowed")) {
          return res.status(400).json({ message: error.message });
        }
        if (error.message?.includes("Malware detected")) {
          return res.status(403).json({ message: 'File rejected due to security concerns.' });
        }
        
        res.status(500).json({ message: "Failed to create violation" });
      }
    }
  );

  app.patch("/api/violations/:id/status", ensureAuthenticated, async (req, res) => {
    const userId = getUserId(req, res);
    if (userId === undefined) return;
    try {
      const { status, comment, rejectionReason } = req.body;
      
      // Validate status
      if (!["new", "pending_approval", "approved", "disputed", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Validate rejection reason if status is rejected
      if (status === "rejected" && (!rejectionReason || rejectionReason.trim() === "")) {
        return res.status(400).json({ message: "Rejection reason is required when rejecting a violation" });
      }
      
      // Update the violation status using UUID or ID
      let violation;
      if (isUUID(req.params.id)) {
        violation = await dbStorage.updateViolationStatusByUuid(req.params.id, status);
      } else {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid violation identifier" });
        }
        violation = await dbStorage.updateViolationStatus(id, status);
      }
      
      if (!violation) {
        return res.status(404).json({ message: "Violation not found" });
      }
      
      // Get the user who made this status change for history/notifications
      const statusChangedByUser = req.user as User;
      
      // Add to history with rejection reason if applicable
      const historyComment = status === "rejected" 
        ? `${comment || ''} Rejection reason: ${rejectionReason}`.trim()
        : comment;
        
      await dbStorage.addViolationHistory({
        violationId: violation.id,
        userId,
        action: `status_changed_to_${status}`,
        comment: historyComment
      });
      
      // Handle notifications based on status change
      if (status === "approved" && violation.fineAmount) {
        // NEW: Modern approval notification using persons table and EmailDeduplicationService
        try {
          const unit = await dbStorage.getPropertyUnit(violation.unitId);
          const personsForUnit = await dbStorage.getPersonsWithRolesForUnit(violation.unitId);
          
          if (personsForUnit.length > 0) {
            await sendViolationApprovedToOccupantsNotification({
              violation: {
                id: violation.id,
                uuid: violation.uuid,
                referenceNumber: violation.referenceNumber,
                violationType: violation.violationType,
                unitNumber: unit?.unitNumber,
              },
              fineAmount: violation.fineAmount ?? 0,
              approvedBy: statusChangedByUser?.fullName || 'Council Member',
              personsToNotify: personsForUnit,
            });
            logger.info(`[Email] Violation approval notification sent for violation ID: ${violation.id}`);
          } else {
            logger.info(`[Email] No persons to notify for violation ${violation.id} approval`);
          }
        } catch (emailError: any) {
          logger.error(`[Email Error] Failed to send violation approval notification for violation ID: ${violation.id}: ${emailError.message}`, { stack: emailError.stack });
          // Do not re-throw; allow the main operation to succeed
        }
      } else if (status === "rejected") {
        // NEW: Send rejection notification to occupants
        try {
          const unit = await dbStorage.getPropertyUnit(violation.unitId);
          const personsForUnit = await dbStorage.getPersonsWithRolesForUnit(violation.unitId);
          
          if (personsForUnit.length > 0) {
            await sendViolationRejectedToOccupantsNotification({
              violation: {
                id: violation.id,
                uuid: violation.uuid,
                referenceNumber: violation.referenceNumber,
                violationType: violation.violationType,
                unitNumber: unit?.unitNumber,
              },
              rejectionReason: rejectionReason,
              rejectedBy: statusChangedByUser?.fullName || 'Council Member',
              personsToNotify: personsForUnit,
            });
            logger.info(`[Email] Violation rejection notification sent for violation ID: ${violation.id}`);
          }
        } catch (emailError: any) {
          logger.error(`[Email Error] Failed to send violation rejection notification for violation ID: ${violation.id}: ${emailError.message}`, { stack: emailError.stack });
          // Do not re-throw; allow the main operation to succeed
        }
      }
      
      res.json(violation);
    } catch (error) {
      logger.error('Error updating violation status:', error);
      res.status(500).json({ message: "Failed to update violation status" });
    }
  });

  app.patch("/api/violations/:id/fine", ensureCouncilMember, async (req, res) => {
    const userId = getUserId(req, res);
    if (userId === undefined) return;
    try {
      const { amount } = req.body;
      
      if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({ message: "Invalid fine amount" });
      }
      
      // Set fine using UUID or ID
      let violation;
      if (isUUID(req.params.id)) {
        violation = await dbStorage.setViolationFineByUuid(req.params.id, amount);
      } else {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid violation identifier" });
        }
        violation = await dbStorage.setViolationFine(id, amount);
      }
      
      if (!violation) {
        return res.status(404).json({ message: "Violation not found" });
      }
      
      // Add to history
      await dbStorage.addViolationHistory({
        violationId: violation.id,
        userId,
        action: "fine_set",
        comment: `Fine amount set to $${amount}`
      });
      
      // If violation is already approved, send approval notification with fine using new system
      if (violation.status === "approved") {
        const unit = await dbStorage.getPropertyUnit(violation.unitId);
        const personsForUnit = await dbStorage.getPersonsWithRolesForUnit(violation.unitId);
        
        if (personsForUnit.length > 0) {
          await sendViolationApprovedToOccupantsNotification({
            violation: {
              id: violation.id,
              uuid: violation.uuid,
              referenceNumber: violation.referenceNumber,
              violationType: violation.violationType,
              unitNumber: unit?.unitNumber,
            },
            fineAmount: amount ?? 0,
            approvedBy: 'Council Member', // Fine setting context
            personsToNotify: personsForUnit,
          });
        }
      }
      
      res.json(violation);
    } catch (error) {
      res.status(500).json({ message: "Failed to set fine amount" });
    }
  });

  app.post("/api/violations/:id/history", ensureAuthenticated, async (req, res) => {
    const userId = getUserId(req, res);
    if (userId === undefined) return;
    try {
      // Get violation by UUID or ID to get the integer ID for history
      const violation = await getViolationByIdOrUuid(req.params.id);
      if (!violation) {
        return res.status(404).json({ message: "Violation not found" });
      }
      
      const { action, comment } = req.body;
      
      const historyData = {
        violationId: violation.id, // Use integer ID for history
        userId,
        action,
        comment
      };
      
      const validatedData = insertViolationHistorySchema.parse(historyData);
      const history = await dbStorage.addViolationHistory(validatedData);
      
      res.status(201).json(history);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  app.get("/api/violations/:id/history", ensureAuthenticated, async (req, res) => {
    try {
      // Get violation by UUID or ID to get the integer ID for history lookup
      const violation = await getViolationByIdOrUuid(req.params.id);
      if (!violation) {
        return res.status(404).json({ message: "Violation not found" });
      }
      
      const history = await dbStorage.getViolationHistory(violation.id);
      
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch violation history" });
    }
  });

  app.delete("/api/violations/:id", ensureAuthenticated, async (req, res) => {
    const userId = getUserId(req, res);
    if (userId === undefined) return;
    
    try {
      // Check if identifier is UUID or integer ID
      let deleted = false;
      if (isUUID(req.params.id)) {
        deleted = await dbStorage.deleteViolationByUuid(req.params.id);
      } else {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid violation identifier" });
        }
        deleted = await dbStorage.deleteViolation(id);
      }
      
      if (!deleted) {
        return res.status(404).json({ message: "Violation not found" });
      }
      
      logger.info(`[VIOLATION_DELETE] User ID ${userId} deleted violation ${req.params.id}`);
      res.json({ message: "Violation deleted successfully" });
    } catch (error) {
      logger.error("Error deleting violation:", error);
      res.status(500).json({ message: "Failed to delete violation" });
    }
  });

  // Reports API
  app.get("/api/reports/stats", ensureAuthenticated, async (req, res) => {
    try {
      const filters = req.query;

      const stats = await dbStorage.getViolationStats(filters);
      
      // Get violations by month (last 12 months)
      const violationsByMonth = await dbStorage.getViolationsByMonth(filters);
      
      // Get violations by type
      const violationsByType = await dbStorage.getViolationsByType(filters);
      
      res.json({
        stats,
        violationsByMonth,
        violationsByType
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report statistics" });
    }
  });

  app.get("/api/reports/repeat-violations", ensureAuthenticated, async (req, res) => {
    try {
      const minCount = parseInt(req.query.minCount as string) || 3;
      const repeatViolations = await dbStorage.getRepeatViolations(minCount);
      res.json(repeatViolations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repeat violations" });
    }
  });
  
  // Violation Categories API endpoints
  app.get("/api/violation-categories", ensureAuthenticated, async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      
      const categories = await dbStorage.getAllViolationCategories(activeOnly);
      
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch violation categories" });
    }
  });
  
  app.get("/api/violation-categories/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await dbStorage.getViolationCategory(id);
      
      if (!category) {
        return res.status(404).json({ message: "Violation category not found" });
      }
      
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch violation category" });
    }
  });
  
  app.post("/api/violation-categories", ensureCouncilMember, async (req, res) => {
    try {
      const categoryData = insertViolationCategorySchema.parse(req.body);
      const newCategory = await dbStorage.createViolationCategory(categoryData);
      res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create violation category" });
    }
  });
  
  app.patch("/api/violation-categories/:id", ensureCouncilMember, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const categoryData = insertViolationCategorySchema.partial().parse(req.body);
      const updatedCategory = await dbStorage.updateViolationCategory(id, categoryData);
      
      if (!updatedCategory) {
        return res.status(404).json({ message: "Violation category not found" });
      }
      
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update violation category" });
    }
  });
  
  // Customer Management API endpoints
  app.get("/api/customers", ensureCouncilMember, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;
      const result = await dbStorage.getAllCustomers(page, limit, sortBy, sortOrder);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });
  
  app.get("/api/customers/search", ensureCouncilMember, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.status(400).json({ message: "Search query must be at least 2 characters" });
      }
      
      const customers = await dbStorage.searchCustomers(query);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to search customers" });
    }
  });
  
  app.get("/api/customers/:id", ensureCouncilMember, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await dbStorage.getCustomer(id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });
  
  app.post("/api/customers", ensureCouncilMember, async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const newCustomer = await dbStorage.createCustomer(customerData);
      res.status(201).json(newCustomer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });
  
  app.patch("/api/customers/:id", ensureCouncilMember, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const updatedCustomer = await dbStorage.updateCustomer(id, customerData);
      
      if (!updatedCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(updatedCustomer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update customer" });
    }
  });
  
  // System Settings API endpoints
  app.get("/api/settings", ensureCouncilMember, async (req, res) => {
    try {
      const settings = await dbStorage.getAllSystemSettings();
      // Add logo URL if logo is set
      const logoSetting = settings.find(s => s.settingKey === 'strata_logo');
      let logoUrl = null;
      if (logoSetting && logoSetting.settingValue) {
        logoUrl = `/api/uploads/${logoSetting.settingValue}`;
      }
      res.json({ settings, logoUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });
  
  app.get("/api/settings/:key", ensureCouncilMember, async (req, res) => {
    try {
      const key = req.params.key;
      const setting = await dbStorage.getSystemSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });
  
  app.post("/api/settings/:key", ensureCouncilMember, async (req, res) => {
    try {
      const key = req.params.key;
      const { value } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ message: "Setting value is required" });
      }
      
      const userId = getUserId(req, res);
      if (userId === undefined) return;
      const setting = await dbStorage.updateSystemSetting(key, value, userId);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Logo upload endpoint with enhanced security
  app.post("/api/settings/logo", 
    ensureCouncilMember, 
    upload.single("logo"),
    contentValidationMiddleware,
    virusScanMiddleware,
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        // Additional validation for logo files
        if (!req.file.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: "Only image files are allowed for logos" });
        }
        
        const userId = getUserId(req, res);
        if (userId === undefined) return;
        
        // Save filename in system_settings
        await dbStorage.updateSystemSetting('strata_logo', req.file.filename, userId);
        logger.info(`[Logo Upload] User ${userId} uploaded new logo: ${req.file.filename}`);
        
        res.json({ 
          filename: req.file.filename, 
          url: `/api/uploads/${req.file.filename}` 
        });
      } catch (error: any) {
        // Clean up uploaded file on error
        if (req.file) {
          await cleanupUploadedFiles([req.file]);
        }
        
        logger.error("[Logo Upload] Error:", error);
        res.status(500).json({ message: "Failed to upload logo" });
      }
    }
  );

  app.get("/api/reports/violations-by-month", ensureAuthenticated, async (req, res) => {
    try {
      const { from, to, categoryId } = req.query;
      const filters: { from?: Date, to?: Date, categoryId?: number } = {};

      if (from && typeof from === 'string') {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) filters.from = fromDate;
      }
      if (to && typeof to === 'string') {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
            toDate.setHours(23, 59, 59, 999);
            filters.to = toDate;
        }
      }
      if (categoryId && typeof categoryId === 'string' && categoryId !== 'all') {
        const catId = parseInt(categoryId, 10);
        if (!isNaN(catId)) filters.categoryId = catId;
      }
      const violationsByMonth = await dbStorage.getViolationsByMonth(filters); 
      res.json(violationsByMonth);
    } catch (error) {
      console.error("Failed to fetch violations by month:", error);
      res.status(500).json({ message: "Failed to fetch violations by month" });
    }
  });

  app.get("/api/reports/violations-by-type", ensureAuthenticated, async (req, res) => {
    try {
      const { from, to, categoryId } = req.query;
      const filters: { from?: Date, to?: Date, categoryId?: number } = {};

      if (from && typeof from === 'string') {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) filters.from = fromDate;
      }
      if (to && typeof to === 'string') {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
            toDate.setHours(23, 59, 59, 999);
            filters.to = toDate;
        }
      }
      if (categoryId && typeof categoryId === 'string' && categoryId !== 'all') {
        const catId = parseInt(categoryId, 10);
        if (!isNaN(catId)) filters.categoryId = catId;
      }
      const violationsByType = await dbStorage.getViolationsByType(filters);
      res.json(violationsByType);
    } catch (error) {
      console.error("Failed to fetch violations by type:", error);
      res.status(500).json({ message: "Failed to fetch violations by type" });
    }
  });

  // Serve uploaded files
  app.get("/api/uploads/:filename", ensureAuthenticated, async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), "uploads", filename);
    
    try {
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch (error) {
      res.status(404).json({ message: "File not found" });
    }
  });

  // Create Unit with Persons (owners/tenants) and Facilities
  app.post("/api/units-with-persons", ensureAuthenticated, async (req, res) => {
    try {
      // Define simple schemas without complex type inference
      const unitSchema = z.object({
        unitNumber: z.string(),
        strataLot: z.string().optional(),
        floor: z.string().nullable().optional(),
        townhouse: z.boolean().optional(),
        mailingStreet1: z.string().optional(),
        mailingStreet2: z.string().optional(),
        mailingCity: z.string().optional(),
        mailingStateProvince: z.string().optional(),
        mailingPostalCode: z.string().optional(),
        mailingCountry: z.string().optional(),
        phone: z.string().nullable().optional(),
        notes: z.string().optional()
      });
      
      const facilitiesSchema = z.object({
        parkingSpots: z.array(z.string()).optional(),
        storageLockers: z.array(z.string()).optional(),
        bikeLockers: z.array(z.string()).optional()
      });
      
      const personSchema = z.object({
        fullName: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        role: z.enum(["owner", "tenant"]),
        receiveEmailNotifications: z.boolean(),
        hasCat: z.boolean().optional(),
        hasDog: z.boolean().optional(),
      });
      
      const bodySchema = z.object({
        unit: unitSchema,
        facilities: facilitiesSchema, 
        persons: z.array(personSchema).min(1)
      });

      const parsedBody = bodySchema.parse(req.body);
      
      const result = await dbStorage.createUnitWithPersons(parsedBody);
      res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Failed to create unit with persons and facilities:", error);
      res.status(500).json({ message: "Failed to create unit with persons and facilities", error: error.message });
    }
  });

  // Unit Management API (Older - consider for deprecation or refactor if /api/units-with-persons covers all cases)
  app.post("/api/units", ensureAuthenticated, async (req, res) => {
    try {
      const { 
        unitNumber, 
        floor, 
        ownerName, 
        ownerEmail, 
        ownerReceiveNotifications,
        tenantName, 
        tenantEmail, 
        tenantReceiveNotifications,
        // Assuming facilities are not part of this older endpoint's direct body, add defaults
        // parkingSpots, storageLockers, bikeLockers 
      } = req.body;

      // Create unit payload for createUnitWithPersons
      const unitPayload = { unitNumber, floor };

      // Create default facilities payload
      const facilitiesPayload = {
        parkingSpots: req.body.parkingSpots || 0,
        storageLockers: req.body.storageLockers || 0,
        bikeLockers: req.body.bikeLockers || 0,
      };

      // Create persons array
      const personsPayload: Array<{
        fullName: string;
        email: string;
        phone?: string;
        role: 'owner' | 'tenant';
        receiveEmailNotifications: boolean;
        hasCat?: boolean;
        hasDog?: boolean;
      }> = [];

      if (ownerName && ownerEmail) {
        personsPayload.push({
          fullName: ownerName,
          email: ownerEmail,
          role: 'owner',
          receiveEmailNotifications: ownerReceiveNotifications ?? true,
          hasCat: req.body.ownerHasCat ?? false,
          hasDog: req.body.ownerHasDog ?? false,
        });
      }

      if (tenantName && tenantEmail) {
        personsPayload.push({
          fullName: tenantName,
          email: tenantEmail,
          role: 'tenant',
          receiveEmailNotifications: tenantReceiveNotifications ?? true,
          hasCat: req.body.tenantHasCat ?? false,
          hasDog: req.body.tenantHasDog ?? false,
        });
      }
      
      if (personsPayload.length === 0) {
        return res.status(400).json({ message: "At least one owner or tenant must be provided for the unit." });
      }

      const result = await dbStorage.createUnitWithPersons({
        unit: unitPayload,
        facilities: facilitiesPayload, // Pass facilities payload
        persons: personsPayload
      });

      res.status(201).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Failed to create unit (legacy endpoint):", error);
      res.status(500).json({ message: "Failed to create unit", details: error.message });
    }
  });

  app.patch("/api/units/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // TODO: This PATCH route currently calls createUnitWithPersons which is not ideal for an update.
      // It should ideally call a dedicated updateUnitWithPersons function in dbStorage.
      // For now, we will adapt its payload to match createUnitWithPersons, but this needs review.

      const unitSchema = z.object({ 
        unitNumber: z.string(), 
        strataLot: z.string().optional(),
        floor: z.string().nullable().optional(),
        townhouse: z.boolean().optional(),
        mailingStreet1: z.string().optional(),
        mailingStreet2: z.string().optional(),
        mailingCity: z.string().optional(),
        mailingStateProvince: z.string().optional(),
        mailingPostalCode: z.string().optional(),
        mailingCountry: z.string().optional(),
        phone: z.string().nullable().optional(),
        notes: z.string().optional()
      });
      
      // Update facilities schema to accept arrays of strings (new structure)
      const facilitiesSchema = z.object({
        parkingSpots: z.array(z.string()).optional(),
        storageLockers: z.array(z.string()).optional(),
        bikeLockers: z.array(z.string()).optional()
      });
      
      const personSchema = z.object({
        fullName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        role: z.enum(["owner", "tenant"]),
        receiveEmailNotifications: z.boolean(),
        hasCat: z.boolean().optional(),
        hasDog: z.boolean().optional(),
      });
      const bodySchema = z.object({
        unit: unitSchema,
        facilities: facilitiesSchema, 
        persons: z.array(personSchema).min(1)
      });

      const parsedBody = bodySchema.parse(req.body);

      const result = await dbStorage.createUnitWithPersons({
        unit: parsedBody.unit, 
        facilities: parsedBody.facilities,
        persons: parsedBody.persons
      });

      res.json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Failed to update unit (via createUnitWithPersons logic):", error);
      res.status(500).json({ message: "Failed to update unit", details: error.message });
    }
  });

  app.delete("/api/units/:id", ensureAuthenticated, async (req, res) => {
    const userId = getUserId(req, res);
    if (userId === undefined) return;
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid unit ID" });
      }
      
      // Check if unit exists before deletion
      const unit = await dbStorage.getPropertyUnit(id);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }
      
      const deleted = await dbStorage.deleteUnit(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Unit not found" });
      }
      
      logger.info(`[UNIT_DELETE] User ID ${userId} deleted unit ${id} (${unit.unitNumber})`);
      res.json({ message: "Unit and all associated data deleted successfully" });
    } catch (error) {
      logger.error("Error deleting unit:", error);
      res.status(500).json({ message: "Failed to delete unit" });
    }
  });

  // --- PUBLIC ENDPOINT: Add comment/evidence via access link ---
  app.post("/public/violation/:token/comment", 
    upload.array("attachments", 5),
    contentValidationMiddleware,
    virusScanMiddleware,
    async (req, res) => {
      const { token } = req.params;
      const { comment, commenterName } = req.body;
      const files = req.files as Express.Multer.File[];
      
      try {
        // 1. Validate token
        const link = await dbStorage.getViolationAccessLinkByToken(token);
        if (!link) return res.status(404).json({ message: "Invalid or expired link" });
        if (link.usedAt) return res.status(410).json({ message: "This link has already been used" });
        if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
          return res.status(410).json({ message: "This link has expired" });
        }

        // 2. Handle file uploads with enhanced security
        const attachments = files ? files.map(file => file.filename) : [];
        logger.info(`[Public Comment] Received ${files?.length || 0} files for violation ${link.violationId}`);

        // 3. Store comment and evidence in violation history (as anonymous/public)
        await dbStorage.addViolationHistory({
          violationId: link.violationId,
          userId: 1, // Use a special system/anonymous user ID
          action: "public_comment",
          comment: comment || undefined,
          commenterName: commenterName || "Anonymous",
        });

        // 4. Optionally, store attachments in violation record
        if (attachments.length > 0) {
          const violation = await dbStorage.getViolation(link.violationId);
          if (violation) {
            const updatedAttachments = Array.isArray(violation.attachments) ? [...violation.attachments, ...attachments] : attachments;
            await dbStorage.updateViolation(link.violationId, { attachments: updatedAttachments });
          }
        }

        // 5. NEW: Change violation status to "disputed" and notify admins
        const violation = await dbStorage.getViolation(link.violationId);
        if (violation && violation.status === "pending_approval") {
          // Update status to disputed
          const updatedViolation = await dbStorage.updateViolationStatus(link.violationId, "disputed");
          
          if (updatedViolation) {
            // Add history entry for status change
            await dbStorage.addViolationHistory({
              violationId: link.violationId,
              userId: 1, // System user for automated status change
              action: "status_changed_to_disputed",
              comment: `Status automatically changed to disputed due to occupant response. Disputed by: ${commenterName || "Anonymous"}`,
            });

            // Get unit details for notification
            const unit = await dbStorage.getPropertyUnit(violation.unitId);
            
            // Send notifications to all admins/council members
            try {
              const adminCouncilUsers = await dbStorage.getAdminAndCouncilUsers();
              const appUrl = process.env.APP_URL || 'http://localhost:5173';

              for (const adminUser of adminCouncilUsers) {
                await sendViolationDisputedToAdminsNotification({
                  violation: {
                    id: violation.id,
                    uuid: violation.uuid,
                    referenceNumber: violation.referenceNumber,
                    violationType: violation.violationType,
                    unitNumber: unit?.unitNumber,
                  },
                  adminUser: {
                    id: adminUser.id,
                    fullName: adminUser.fullName,
                    email: adminUser.email,
                  },
                  disputedBy: commenterName || "Anonymous",
                  appUrl: appUrl,
                });
              }
              logger.info(`[Public Comment] Sent dispute notifications to admins for violation ${violation.id}`);
            } catch (notificationError) {
              logger.error(`[Public Comment] Failed to send dispute notifications for violation ${violation.id}:`, notificationError);
              // Don't fail the main operation if notifications fail
            }
          }
        }

        // 6. Mark link as used (single-use)
        await dbStorage.markViolationAccessLinkUsed(link.id);

        res.json({ 
          message: "Comment and evidence submitted successfully. The violation status has been updated to 'Disputed' and council members have been notified.",
          attachmentsCount: attachments.length,
          statusChanged: violation?.status === "pending_approval" ? "disputed" : null
        });
      } catch (error: any) {
        // Clean up uploaded files on error
        if (files && files.length > 0) {
          await cleanupUploadedFiles(files);
        }
        
        logger.error(`[Public Comment] Error for token ${token}:`, error);
        res.status(500).json({ message: "Failed to submit comment" });
      }
    }
  );

  // --- PUBLIC ENDPOINT: Get link status and violation details ---
  app.get("/public/violation/:token/status", async (req, res) => {
    const { token } = req.params;
    try {
      const link = await dbStorage.getViolationAccessLinkByToken(token);
      if (!link) return res.status(404).json({ message: "Invalid or expired link" });
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(410).json({ message: "This link has expired" });
      }
      if (link.usedAt) {
        // Still return violation details, but mark as used
        const violation = await dbStorage.getViolation(link.violationId);
        return res.json({ status: "used", violation: violation ? {
          unitNumber: violation.unitId, // will be replaced below
          violationType: violation.violationType,
          description: violation.description,
          persons: []
        } : null });
      }
      // Valid link, fetch violation details
      const violation = await dbStorage.getViolation(link.violationId);
      if (!violation) return res.status(404).json({ message: "Violation not found" });
      // Fetch unit number
      const unit = await dbStorage.getPropertyUnit(violation.unitId);
      // Fetch eligible persons (owners/tenants with notifications enabled)
      const persons = await dbStorage.getPersonsWithRolesForUnit(violation.unitId);
      const eligiblePersons = persons.filter(p => p.receiveEmailNotifications);
      res.json({
        status: "valid",
        violation: {
          unitNumber: unit?.unitNumber || "",
          violationType: violation.violationType,
          description: violation.description,
          persons: eligiblePersons.map(p => ({
            personId: p.personId,
            fullName: p.fullName,
            email: p.email,
            role: p.role,
            receiveEmailNotifications: p.receiveEmailNotifications
          }))
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch link status" });
    }
  });

  // --- API: Export Report as CSV ---
  app.get("/api/reports/export/csv", ensureAuthenticated, async (req, res) => {
    try {
      const { from, to, categoryId: categoryIdStr } = req.query;
      const filters: { from?: Date, to?: Date, categoryId?: number } = {};

      if (from && typeof from === 'string') {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) filters.from = fromDate;
      }
      if (to && typeof to === 'string') {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          filters.to = toDate;
        }
      }
      if (categoryIdStr && typeof categoryIdStr === 'string' && categoryIdStr !== 'all') {
        const catId = parseInt(categoryIdStr, 10);
        if (!isNaN(catId)) filters.categoryId = catId;
      }

      const violationsData = await dbStorage.getFilteredViolationsForReport(filters);

      // Define CSV headers
      const headers = [
        "ID", "ReferenceNumber", "UnitNumber", "Floor", "ViolationType", "CategoryName",
        "ViolationDate", "ViolationTime", "Description", "BylawReference", "Status",
        "FineAmount", "ReportedBy(ID)", "CreatedAt", "UpdatedAt", "AttachmentsCount"
      ];

      // Helper to escape CSV data
      const escapeCsv = (data: any) => {
        if (data === null || data === undefined) return '';
        const str = String(data);
        if (str.includes(',') || str.includes('\"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Convert data to CSV rows
      const csvRows = violationsData.map(v => [
        escapeCsv(v.id),
        escapeCsv(v.referenceNumber),
        escapeCsv(v.unit.unitNumber),
        escapeCsv(v.unit.floor),
        escapeCsv(v.violationType),
        escapeCsv(v.category?.name),
        escapeCsv(v.violationDate ? format(new Date(v.violationDate), 'yyyy-MM-dd') : ''),
        escapeCsv(v.violationTime),
        escapeCsv(v.description),
        escapeCsv(v.bylawReference),
        escapeCsv(v.status),
        escapeCsv(v.fineAmount),
        escapeCsv(v.reportedById),
        escapeCsv(v.createdAt ? format(new Date(v.createdAt), 'yyyy-MM-dd HH:mm:ss') : ''),
        escapeCsv(v.updatedAt ? format(new Date(v.updatedAt), 'yyyy-MM-dd HH:mm:ss') : ''),
        escapeCsv(Array.isArray(v.attachments) ? v.attachments.length : 0)
      ].join(','));

      const csvString = [headers.join(','), ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="violations_report.csv"');
      res.status(200).send(csvString);

    } catch (error) {
      console.error("Failed to export CSV report:", error);
      res.status(500).json({ message: "Failed to export CSV report", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // --- API: Export Report as PDF ---
  app.get("/api/reports/export/pdf", ensureAuthenticated, async (req, res) => {
    try {
      const { from, to, categoryId: categoryIdStr } = req.query;
      const filters: { from?: Date, to?: Date, categoryId?: number } = {};
      const reportFilters: { fromDate?: Date, toDate?: Date, categoryName?: string } = {};

      if (from && typeof from === 'string') {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          filters.from = fromDate;
          reportFilters.fromDate = fromDate;
        }
      }
      if (to && typeof to === 'string') {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          filters.to = toDate;
          reportFilters.toDate = toDate;
        }
      }
      if (categoryIdStr && typeof categoryIdStr === 'string' && categoryIdStr !== 'all') {
        const catId = parseInt(categoryIdStr, 10);
        if (!isNaN(catId)) {
          filters.categoryId = catId;
          // Fetch category name for the PDF report
          const category = await dbStorage.getViolationCategory(catId);
          if (category) {
            reportFilters.categoryName = category.name;
          }
        }
      } else {
        reportFilters.categoryName = "All Categories";
      }

      const violationsData = await dbStorage.getFilteredViolationsForReport(filters);
      const statsData = await dbStorage.getViolationStats(filters); // Fetching full stats object

      // Extract only the stats needed by generateViolationsPdf
      const reportStats = {
        totalViolations: statsData.totalViolations,
        resolvedViolations: statsData.resolvedViolations,
        averageResolutionTimeDays: statsData.averageResolutionTimeDays
      };
      
      generateViolationsPdf(reportStats, violationsData, reportFilters, res);

    } catch (error) {
      console.error("Failed to export PDF report:", error);
      res.status(500).json({ message: "Failed to export PDF report", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Database health check endpoint
  app.get("/api/health/db", ensureAuthenticated, async (req, res) => {
    try {
      console.log('[DB HEALTH] Starting database health check...');
      
      // Test 1: Basic connection
      const { pool } = await import('./db');
      const connectionTest = await pool.query('SELECT NOW() as current_time, version() as pg_version');
      console.log('[DB HEALTH] Connection test passed:', connectionTest.rows[0]);
      
      // Test 2: Check if tables exist
      const tablesQuery = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      console.log('[DB HEALTH] Tables found:', tablesQuery.rows.map(r => r.table_name));
      
      res.json({
        status: 'healthy',
        timestamp: connectionTest.rows[0].current_time,
        postgresql_version: connectionTest.rows[0].pg_version,
        tables: tablesQuery.rows.map(r => r.table_name)
      });
    } catch (error) {
      console.error('[DB HEALTH] Health check failed:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // --- DEBUG/ADMIN Endpoint: Delete all violation data ---
  app.delete("/api/debug/clear-violations-data", ensureAuthenticated, async (req, res) => {
    const user = req.user as User;
    // Ensure user is an admin
    if (!user || !user.isAdmin) {
      console.warn(`[WARN] Non-admin user (ID: ${user?.id || 'unknown'}) attempted to access /api/debug/clear-violations-data`);
      return res.status(403).json({ message: "Forbidden: Admin access required." });
    }

    console.log(`[ADMIN_ACTION] User ID ${user.id} (${user.email}) is attempting to delete all violation data.`);

    try {
      const result = await dbStorage.deleteAllViolationsData();
      const message = `Successfully deleted all violation data. Counts: Violations (${result.deletedViolationsCount}), Histories (${result.deletedHistoriesCount}), Access Links (${result.deletedAccessLinksCount}).`;
      console.log(`[ADMIN_ACTION] ${message}`);
      res.status(200).json({ 
        message: message,
        details: result
      });
    } catch (error: any) {
      console.error("[ERROR] /api/debug/clear-violations-data: Failed to delete violation data.", error);
      res.status(500).json({ 
        message: "Failed to delete all violation data.", 
        details: error.message || "An unexpected error occurred. Check server logs."
      });
    }
  });

  // POST /public/violation/:token/send-code
  app.post('/public/violation/:token/send-code', async (req, res) => {
    const { token } = req.params;
    const { personId } = req.body;
    try {
      const link = await dbStorage.getViolationAccessLinkByToken(token);
      if (!link) return res.status(404).json({ message: 'Invalid or expired link' });
      const violation = await dbStorage.getViolation(link.violationId);
      if (!violation) return res.status(404).json({ message: 'Violation not found' });
      const person = (await dbStorage.getPersonsWithRolesForUnit(violation.unitId)).find(p => p.personId === personId);
      if (!person || !person.receiveEmailNotifications) return res.status(400).json({ message: 'Person not eligible' });
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      // Store code (invalidate previous unused codes for this person/violation)
      await dbStorage.addEmailVerificationCode({
        personId: person.personId,
        violationId: violation.id,
        codeHash: codeHash,
        expiresAt: expiresAt
      });
      // Send email
      await sendEmailWithDeduplication({
        to: person.email,
        subject: 'Your Verification Code',
        text: `Your verification code for disputing violation #${violation.id} is: ${code}\nThis code will expire in 10 minutes.`
      });
      res.json({ message: 'Verification code sent' });
    } catch (error) {
      console.error('Error sending verification code:', error);
      res.status(500).json({ message: 'Failed to send verification code' });
    }
  });

  // POST /public/violation/:token/verify-code
  app.post('/public/violation/:token/verify-code', async (req, res) => {
    const { token } = req.params;
    const { personId, code } = req.body;
    try {
      const link = await dbStorage.getViolationAccessLinkByToken(token);
      if (!link) return res.status(404).json({ message: 'Invalid or expired link' });
      const violation = await dbStorage.getViolation(link.violationId);
      if (!violation) return res.status(404).json({ message: 'Violation not found' });
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      const result = await dbStorage.getEmailVerificationCode(personId, violation.id, codeHash);
      if (result.length === 0) {
        // Log failed attempt
        console.warn(`Failed verification attempt for person ${personId}, violation ${violation.id}`);
        return res.status(400).json({ message: 'Invalid or expired code' });
      }
      // Mark as used
      await dbStorage.markEmailVerificationCodeUsed(result[0].id);
      // Log success
      console.info(`Verification code accepted for person ${personId}, violation ${violation.id}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error verifying code:', error);
      res.status(500).json({ message: 'Failed to verify code' });
    }
  });

  const httpServer = createServer(app);

  // Start email cleanup scheduler
  try {
    const { startEmailCleanupScheduler } = await import('./email-cleanup-scheduler');
    startEmailCleanupScheduler();
    console.log("[EMAIL_SCHEDULER] Email cleanup scheduler started successfully");
  } catch (error) {
    console.error("[EMAIL_SCHEDULER] Failed to start email cleanup scheduler:", error);
  }

  return httpServer;
}
