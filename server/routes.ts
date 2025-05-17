import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { sendViolationNotification, sendViolationApprovedNotification } from "./email";
import { z } from "zod";
import { insertViolationSchema, insertPropertyUnitSchema, insertViolationHistorySchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

// Ensure user is authenticated middleware
const ensureAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Ensure user is council member middleware
const ensureCouncilMember = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user.isCouncil) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Council access required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), "uploads");
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create uploads directory:", error);
  }

  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, `${randomUUID()}${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: function (req, file, cb) {
      // Accept images and pdfs only
      if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error("Only images and PDF files are allowed") as any);
      }
    }
  });

  // Set up authentication routes
  setupAuth(app);

  // Property Units API
  app.get("/api/property-units", ensureAuthenticated, async (req, res) => {
    try {
      const units = await global.storage.getAllPropertyUnits();
      res.json(units);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch property units" });
    }
  });

  app.post("/api/property-units", ensureAuthenticated, async (req, res) => {
    try {
      const unitData = insertPropertyUnitSchema.parse(req.body);
      const unit = await global.storage.createPropertyUnit(unitData);
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
      const { status } = req.query;
      
      let violations;
      if (status && typeof status === 'string') {
        violations = await global.storage.getViolationsByStatus(status as any);
      } else {
        violations = await global.storage.getAllViolations();
      }
      
      res.json(violations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch violations" });
    }
  });

  app.get("/api/violations/recent", ensureAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const violations = await global.storage.getRecentViolations(limit);
      res.json(violations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent violations" });
    }
  });

  app.get("/api/violations/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const violation = await global.storage.getViolationWithUnit(id);
      
      if (!violation) {
        return res.status(404).json({ message: "Violation not found" });
      }
      
      res.json(violation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch violation" });
    }
  });

  app.post("/api/violations", ensureAuthenticated, upload.array("attachments", 5), async (req, res) => {
    try {
      // Handle file uploads
      const files = req.files as Express.Multer.File[];
      const attachments = files ? files.map(file => file.filename) : [];
      
      // Combine form data with file paths
      const violationData = {
        ...req.body,
        reportedById: req.user.id,
        attachments,
      };
      
      // Validate and process the data
      const validatedData = insertViolationSchema.parse({
        ...violationData,
        unitId: parseInt(violationData.unitId),
        violationDate: new Date(violationData.violationDate)
      });
      
      // Create the violation
      const violation = await global.storage.createViolation(validatedData);
      
      // Add to history
      await global.storage.addViolationHistory({
        violationId: violation.id,
        userId: req.user.id,
        action: "created",
        comment: "Violation reported"
      });
      
      // Fetch the unit details for email
      const unit = await global.storage.getPropertyUnit(violation.unitId);
      
      if (unit) {
        // Send email notification
        await sendViolationNotification({
          violationId: violation.id,
          unitNumber: unit.unitNumber,
          violationType: violation.violationType,
          ownerEmail: unit.ownerEmail,
          ownerName: unit.ownerName,
          tenantEmail: unit.tenantEmail,
          tenantName: unit.tenantName,
          reporterName: req.user.fullName
        });
      }
      
      res.status(201).json(violation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating violation:", error);
      res.status(500).json({ message: "Failed to create violation" });
    }
  });

  app.patch("/api/violations/:id/status", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, comment } = req.body;
      
      // Validate status
      if (!["new", "pending_approval", "approved", "disputed", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Update the violation status
      const violation = await global.storage.updateViolationStatus(id, status);
      
      if (!violation) {
        return res.status(404).json({ message: "Violation not found" });
      }
      
      // Add to history
      await global.storage.addViolationHistory({
        violationId: violation.id,
        userId: req.user.id,
        action: `status_changed_to_${status}`,
        comment
      });
      
      // If approved and has fine amount, send approval notification
      if (status === "approved" && violation.fineAmount) {
        const unit = await global.storage.getPropertyUnit(violation.unitId);
        if (unit) {
          await sendViolationApprovedNotification({
            violationId: violation.id,
            unitNumber: unit.unitNumber,
            violationType: violation.violationType,
            ownerEmail: unit.ownerEmail,
            ownerName: unit.ownerName,
            fineAmount: violation.fineAmount
          });
        }
      }
      
      res.json(violation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update violation status" });
    }
  });

  app.patch("/api/violations/:id/fine", ensureCouncilMember, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { amount } = req.body;
      
      if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({ message: "Invalid fine amount" });
      }
      
      const violation = await global.storage.setViolationFine(id, amount);
      
      if (!violation) {
        return res.status(404).json({ message: "Violation not found" });
      }
      
      // Add to history
      await global.storage.addViolationHistory({
        violationId: violation.id,
        userId: req.user.id,
        action: "fine_set",
        comment: `Fine amount set to $${amount}`
      });
      
      // If violation is already approved, send approval notification with fine
      if (violation.status === "approved") {
        const unit = await global.storage.getPropertyUnit(violation.unitId);
        if (unit) {
          await sendViolationApprovedNotification({
            violationId: violation.id,
            unitNumber: unit.unitNumber,
            violationType: violation.violationType,
            ownerEmail: unit.ownerEmail,
            ownerName: unit.ownerName,
            fineAmount: amount
          });
        }
      }
      
      res.json(violation);
    } catch (error) {
      res.status(500).json({ message: "Failed to set fine amount" });
    }
  });

  app.post("/api/violations/:id/history", ensureAuthenticated, async (req, res) => {
    try {
      const violationId = parseInt(req.params.id);
      const { action, comment } = req.body;
      
      const historyData = {
        violationId,
        userId: req.user.id,
        action,
        comment
      };
      
      const validatedData = insertViolationHistorySchema.parse(historyData);
      const history = await global.storage.addViolationHistory(validatedData);
      
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
      const violationId = parseInt(req.params.id);
      const history = await global.storage.getViolationHistory(violationId);
      
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch violation history" });
    }
  });

  // Reports API
  app.get("/api/reports/stats", ensureAuthenticated, async (req, res) => {
    try {
      const stats = await global.storage.getViolationStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch violation statistics" });
    }
  });

  app.get("/api/reports/repeat-violations", ensureAuthenticated, async (req, res) => {
    try {
      const minCount = parseInt(req.query.minCount as string) || 3;
      const repeatViolations = await global.storage.getRepeatViolations(minCount);
      res.json(repeatViolations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch repeat violations" });
    }
  });

  app.get("/api/reports/violations-by-month", ensureAuthenticated, async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const violationsByMonth = await global.storage.getViolationsByMonth(year);
      res.json(violationsByMonth);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch violations by month" });
    }
  });

  app.get("/api/reports/violations-by-type", ensureAuthenticated, async (req, res) => {
    try {
      const violationsByType = await global.storage.getViolationsByType();
      res.json(violationsByType);
    } catch (error) {
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

  const httpServer = createServer(app);

  return httpServer;
}
