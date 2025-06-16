import express from 'express';
import { z } from 'zod';
import { storage as dbStorage } from '../storage';
import { 
  isUUID,
  getViolationByIdOrUuid
} from '../middleware/auth-helpers';
import { createSecureUpload, cleanupUploadedFiles } from '../middleware/fileUploadSecurity';
import { 
  sendNewViolationToOccupantsNotification,
  sendViolationPendingApprovalToAdminsNotification,
  formatViolationReferenceNumber 
} from '../email';
import { insertViolationSchema, type User } from '@shared/schema';
import logger from '../utils/logger';
import { AuditLogger, AuditAction, TargetType } from '../audit-logger';

const router = express.Router();

// All routes in this file will be automatically prefixed with /api/violations

// Note: I will move all the violation route handlers from server/routes.ts here.

// Setup secure file uploads
const { upload, virusScanMiddleware, contentValidationMiddleware } = createSecureUpload({
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  enableVirusScanning: process.env.VIRUS_SCANNING_ENABLED === 'true',
  enableDeepValidation: true
});



// --- VIOLATIONS API ---

// GET /api/violations
router.get("/", async (req, res) => {
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

// GET /api/violations/recent
router.get("/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const violations = await dbStorage.getRecentViolations(limit);
      res.json(violations);
    } catch (error) {
      console.error("Recent violations fetch error:", error);
      res.json([]);
    }
});

// GET /api/violations/pending-approval
router.get("/pending-approval", async (req, res) => {
    try {
      const userId = req.user?.id as string || "";
      if (userId === undefined) return;
      const pendingViolations = await dbStorage.getPendingApprovalViolations(userId);
      res.json(pendingViolations);
    } catch (error) {
      logger.error('[API] Error fetching pending violations:', error);
      res.status(500).json({ message: "Failed to fetch pending violations" });
    }
});

// POST /api/violations
router.post("/", 
    
    upload.array("attachments", 5),
    contentValidationMiddleware,
    virusScanMiddleware,
    async (req, res) => {
      const userId = req.user?.id as string || "";
      if (userId === undefined) return;

      const files = req.files as Express.Multer.File[];

      try {
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
        
        // Log audit event
        await AuditLogger.logFromRequest(req, AuditAction.VIOLATION_CREATED, {
          targetType: TargetType.VIOLATION,
          targetId: violation.uuid,
          details: {
            violationType: violation.violationType,
            unitId: violation.unitId,
            status: violation.status,
            attachmentCount: attachments.length,
          },
        });
        
        res.status(201).json(violation);
        
        setImmediate(async () => {
          try {
            const unit = await dbStorage.getPropertyUnit(violation.unitId);
            const reporterUser = req.user as User;

            if (unit && reporterUser) {
              try {
                const personsForUnit = await dbStorage.getPersonsWithRolesForUnit(violation.unitId);
                const personsToNotifyForEmail = [];

                for (const person of personsForUnit) {
                  let accessLinkForPerson: string | undefined = undefined;
                  if (person.receiveEmailNotifications && person.email) {
                    const token = await dbStorage.createViolationAccessLink({
                      violationId: violation.id,
                      violationUuid: violation.uuid,
                      recipientEmail: person.email,
                    });
                    if (token) {
                      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'; 
                      accessLinkForPerson = `${frontendUrl}/public/violation-dispute/${token}`;
                    }
                  }
                  personsToNotifyForEmail.push({ ...person, accessLink: accessLinkForPerson });
                }

                if (personsToNotifyForEmail.length > 0) {
                  const referenceNumberDisplay = formatViolationReferenceNumber(violation.id, violation.createdAt);
                  await sendNewViolationToOccupantsNotification({
                    violationId: violation.id,
                    referenceNumber: referenceNumberDisplay,
                    unitId: unit.id,
                    unitNumber: unit.unitNumber,
                    violationType: violation.violationType,
                    reporterName: reporterUser.fullName ?? 'System',
                    personsToNotify: personsToNotifyForEmail,
                  });
                  logger.info(`[Violation Upload] Sent new violation notifications for violation ${violation.uuid}`);
                }
              } catch (emailError) {
                logger.error(`[Violation Upload] Failed to send occupant notifications for violation ${violation.uuid}:`, emailError);
              }
            }

            if (reporterUser) {
              try {
                const adminCouncilUsers = await dbStorage.getAdminAndCouncilUsers();
                const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                const referenceNumberDisplay = formatViolationReferenceNumber(violation.id, violation.createdAt);
                const adminEmailPromises = adminCouncilUsers.map(adminUser => 
                  sendViolationPendingApprovalToAdminsNotification({
                    violation: {
                      id: violation.id,
                      uuid: violation.uuid,
                      referenceNumber: referenceNumberDisplay,
                      violationType: violation.violationType,
                      unitNumber: unit?.unitNumber,
                    },
                    adminUser: { id: adminUser.id, fullName: adminUser.fullName, email: adminUser.email },
                    reporterName: reporterUser.fullName ?? 'System',
                    appUrl: appUrl,
                  })
                );
                await Promise.allSettled(adminEmailPromises);
                logger.info(`[Violation Upload] Sent pending approval notifications to admins/council for violation ${violation.uuid}`);
              } catch (adminEmailError) {
                logger.error(`[Violation Upload] Failed to send admin notifications for violation ${violation.uuid}:`, adminEmailError);
              }
            }
          } catch (backgroundError) {
            logger.error(`[Violation Upload] Background email processing failed for violation ${violation.uuid}:`, backgroundError);
          }
        });
      } catch (error: any) {
        if (files && files.length > 0) { await cleanupUploadedFiles(files); }
        if (error instanceof z.ZodError) {
          logger.error("[Validation Error] POST /api/violations:", error.errors);
          return res.status(400).json({ errors: error.errors });
        }
        logger.error("Error creating violation:", error);
        if (error.code === 'LIMIT_FILE_SIZE') { return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' }); }
        if (error.message?.includes("Only images and PDF files are allowed")) { return res.status(400).json({ message: error.message }); }
        if (error.message?.includes("Malware detected")) { return res.status(403).json({ message: 'File rejected due to security concerns.' }); }
        res.status(500).json({ message: "Failed to create violation" });
      }
    }
);

// GET /api/violations/:id
router.get("/:id", async (req, res) => {
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

// PATCH /api/violations/:id/status
router.patch("/:id/status", async (req, res) => {
    const userId = req.user?.id as string || "";
    if (userId === undefined) return;

    try {
      const violationId = parseInt(req.params.id);
      if (isNaN(violationId)) {
        return res.status(400).json({ message: "Invalid violation ID" });
      }

      const { status, comment, rejectionReason } = req.body;
      if (!["new", "pending_approval", "approved", "disputed", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      // The storage layer method only updates the status field.
      const violation = await dbStorage.updateViolationStatus(violationId, status);

      if (!violation) {
        return res.status(404).json({ message: "Violation not found" });
      }

      // Add a history entry for the status change, including any comments or rejection reasons.
      await dbStorage.addViolationHistory({
        violationId: violationId,
        userId: userId,
        action: `Status changed to ${status}`,
        rejectionReason,
      });

      // Log audit event for status change
      const auditAction = status === 'approved' ? AuditAction.VIOLATION_APPROVED :
                         status === 'rejected' ? AuditAction.VIOLATION_REJECTED :
                         status === 'disputed' ? AuditAction.VIOLATION_DISPUTED :
                         AuditAction.VIOLATION_STATUS_CHANGED;
      
      await AuditLogger.logFromRequest(req, auditAction, {
        targetType: TargetType.VIOLATION,
        targetId: violationId.toString(),
        details: {
          oldStatus: violation.status, // Note: this might be the new status, consider fetching old status if needed
          newStatus: status,
          comment: comment,
          rejectionReason: rejectionReason,
        },
      });

      res.json(violation);
    } catch (error) {
      logger.error(`Failed to update violation status for ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update violation status" });
    }
});

// GET /api/violations/:id/history
router.get("/:id/history", async (req, res) => {
    try {
        const history = await dbStorage.getViolationHistory(parseInt(req.params.id));
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch violation history" });
    }
});

// DELETE /api/violations/:id
router.delete("/:id", async (req, res) => {
    try {
        const idOrUuid = req.params.id;
        
        // Get violation details before deletion for audit log
        const violation = await getViolationByIdOrUuid(idOrUuid);
        
        if (!violation) {
            return res.status(404).json({ message: "Violation not found" });
        }
        
        // Delete using the appropriate method based on identifier type
        let deleteSuccess: boolean;
        if (isUUID(idOrUuid)) {
            deleteSuccess = await dbStorage.deleteViolationByUuid(idOrUuid);
        } else {
            const violationId = parseInt(idOrUuid);
            if (isNaN(violationId)) {
                return res.status(400).json({ message: "Invalid violation ID" });
            }
            deleteSuccess = await dbStorage.deleteViolation(violationId);
        }
        
        if (!deleteSuccess) {
            return res.status(404).json({ message: "Violation not found" });
        }
        
        // Log audit event
        await AuditLogger.logFromRequest(req, AuditAction.VIOLATION_DELETED, {
          targetType: TargetType.VIOLATION,
          targetId: violation.uuid,
          details: {
            violationType: violation.violationType,
            unitId: violation.unitId,
            status: violation.status,
          },
        });
        
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: "Failed to delete violation" });
    }
});

// --- VIOLATION CATEGORIES API ---
// Note: These routes will be mounted at both /api/violations/categories and /api/violation-categories
// The latter is handled by a separate route registration in routes.ts

// GET /api/violations/categories (also available as /api/violation-categories via separate mount)
router.get("/categories", async (req, res) => {
    try {
      const categories = await dbStorage.getAllViolationCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
});

// GET /api/violations/categories 
router.get("/categories", async (req, res) => {
    try {
      const categories = await dbStorage.getAllViolationCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
});

// POST /api/violations/categories
router.post("/categories", async (req, res) => {
    try {
      const category = await dbStorage.createViolationCategory({ name: req.body.name });
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to create category" });
    }
});

// PUT /api/violations/categories/:id
router.put("/categories/:id", async (req, res) => {
    try {
      const category = await dbStorage.updateViolationCategory(parseInt(req.params.id), { name: req.body.name });
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to update category" });
    }
});

// DELETE /api/violations/categories/:id
router.delete("/categories/:id", async (req, res) => {
    try {
      await dbStorage.deleteViolationCategory(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
});

export default router; 