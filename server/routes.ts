import type { Express, Request, Response } from "express";
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { setupAuth } from "./auth";
import { sendViolationNotification, sendViolationApprovedNotification } from "./email";
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
  insertUnitFacilitySchema
} from "@shared/schema";
import userManagementRoutes from "./routes/user-management";
import emailConfigRoutes from "./routes/email-config";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Security headers temporarily disabled to resolve startup issues
  // Will re-enable once server is stable

  // Add CORS with improved configuration
  const allowedOrigins = [
    'https://strata-tracker-dcook5.replit.app',
    // Add localhost for development if needed
    // 'http://localhost:3000',
  ];
  
  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if the origin is in our allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Log the rejected origin for debugging
      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }));

  // Add rate limiting (100 requests per 15 minutes per IP)
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.'
  }));

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), "uploads");
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create uploads directory:", error);
  }
  
  // Set up authentication routes first
  setupAuth(app);
  
  // Register user management routes
  app.use("/api/users", userManagementRoutes);
  
  // Register email configuration routes
  app.use("/api/email-config", emailConfigRoutes);

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

  // Authentication routes are already set up

  // Property Units API
  app.get("/api/property-units", ensureAuthenticated, async (req, res) => {
    try {
      const units = await dbStorage.getAllPropertyUnits();
      res.json(units);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch property units" });
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
      res.status(500).json({ message: "Failed to fetch recent violations" });
    }
  });

  app.get("/api/violations/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const violation = await dbStorage.getViolationWithUnit(id);
      
      if (!violation) {
        return res.status(404).json({ message: "Violation not found" });
      }
      
      res.json(violation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch violation" });
    }
  });

  app.post("/api/violations", ensureAuthenticated, upload.array("attachments", 5), async (req, res) => {
    const userId = getUserId(req, res);
    if (userId === undefined) return;
    try {
      // Handle file uploads
      const files = req.files as Express.Multer.File[];
      const attachments = files ? files.map(file => file.filename) : [];
      console.log("[Violation Upload] Received files:", files?.map(f => f.originalname), "Saved as:", attachments);
      
      // Combine form data with file paths
      const violationData = {
        ...req.body,
        reportedById: userId,
        attachments,
        categoryId: req.body.categoryId ? parseInt(req.body.categoryId, 10) : undefined,
        unitId: req.body.unitId ? parseInt(req.body.unitId, 10) : undefined,
      };
      
      // Validate and process the data
      const validatedData = insertViolationSchema.parse({
        ...violationData,
        violationDate: new Date(violationData.violationDate)
      });
      
      // Create the violation
      const violation = await dbStorage.createViolation(validatedData);
      console.log("[Violation Upload] Created violation with attachments:", violation.attachments);
      
      // Add to history
      await dbStorage.addViolationHistory({
        violationId: violation.id,
        userId,
        action: "created",
        comment: "Violation reported"
      });
      
      // Fetch the unit details for email
      const unit = await dbStorage.getPropertyUnit(violation.unitId);
      const baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
      const accessLinks: { owner?: string; tenant?: string } = {};
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      if (unit) {
        // Generate and store access link for owner
        if (unit.ownerEmail) {
          const ownerLink = await dbStorage.createViolationAccessLink({
            violationId: violation.id,
            recipientEmail: unit.ownerEmail,
            expiresAt,
            token: undefined, // let DB default
            usedAt: null,
          });
          accessLinks.owner = `${baseUrl}/violation/comment/${ownerLink.token}`;
        }
        // Generate and store access link for tenant
        if (unit.tenantEmail) {
          const tenantLink = await dbStorage.createViolationAccessLink({
            violationId: violation.id,
            recipientEmail: unit.tenantEmail,
            expiresAt,
            token: undefined, // let DB default
            usedAt: null,
          });
          accessLinks.tenant = `${baseUrl}/violation/comment/${tenantLink.token}`;
        }
        // Send email notification, passing accessLinks
        await sendViolationNotification({
          violationId: violation.id,
          unitNumber: unit.unitNumber,
          violationType: violation.violationType,
          ownerEmail: unit.ownerEmail ?? "",
          ownerName: unit.ownerName ?? "",
          tenantEmail: unit.tenantEmail ?? undefined,
          tenantName: unit.tenantName ?? undefined,
          reporterName: (req.user as any)?.fullName ?? "System",
          unitId: unit.id,
          accessLinks,
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
    const userId = getUserId(req, res);
    if (userId === undefined) return;
    try {
      const id = parseInt(req.params.id);
      const { status, comment } = req.body;
      
      // Validate status
      if (!["new", "pending_approval", "approved", "disputed", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Update the violation status
      const violation = await dbStorage.updateViolationStatus(id, status);
      
      if (!violation) {
        return res.status(404).json({ message: "Violation not found" });
      }
      
      // Add to history
      await dbStorage.addViolationHistory({
        violationId: violation.id,
        userId,
        action: `status_changed_to_${status}`,
        comment
      });
      
      // If approved and has fine amount, send approval notification
      if (status === "approved" && violation.fineAmount) {
        const unit = await dbStorage.getPropertyUnit(violation.unitId);
        if (unit) {
          await sendViolationApprovedNotification({
            violationId: String(violation.id),
            unitNumber: unit.unitNumber,
            violationType: violation.violationType,
            ownerEmail: unit.ownerEmail ?? "",
            ownerName: unit.ownerName ?? "",
            fineAmount: violation.fineAmount ?? 0,
            unitId: unit.id,
            tenantEmail: unit.tenantEmail ?? undefined,
            tenantName: unit.tenantName ?? undefined
          });
        }
      }
      
      res.json(violation);
    } catch (error) {
      res.status(500).json({ message: "Failed to update violation status" });
    }
  });

  app.patch("/api/violations/:id/fine", ensureCouncilMember, async (req, res) => {
    const userId = getUserId(req, res);
    if (userId === undefined) return;
    try {
      const id = parseInt(req.params.id);
      const { amount } = req.body;
      
      if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({ message: "Invalid fine amount" });
      }
      
      const violation = await dbStorage.setViolationFine(id, amount);
      
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
      
      // If violation is already approved, send approval notification with fine
      if (violation.status === "approved") {
        const unit = await dbStorage.getPropertyUnit(violation.unitId);
        if (unit) {
          await sendViolationApprovedNotification({
            violationId: String(violation.id),
            unitNumber: unit.unitNumber,
            violationType: violation.violationType,
            ownerEmail: unit.ownerEmail ?? "",
            ownerName: unit.ownerName ?? "",
            fineAmount: amount ?? 0,
            unitId: unit.id,
            tenantEmail: unit.tenantEmail ?? undefined,
            tenantName: unit.tenantName ?? undefined
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
      const violationId = parseInt(req.params.id);
      const { action, comment } = req.body;
      
      const historyData = {
        violationId,
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
      const violationId = parseInt(req.params.id);
      const history = await dbStorage.getViolationHistory(violationId);
      
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch violation history" });
    }
  });

  // Reports API
  app.get("/api/reports/stats", ensureAuthenticated, async (req, res) => {
    try {
      const { from, to, categoryId } = req.query;
      const filters: { from?: Date, to?: Date, categoryId?: number } = {};
      if (from && typeof from === 'string') {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          filters.from = fromDate;
        }
      }
      if (to && typeof to === 'string') {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          filters.to = toDate;
        }
      }
      if (categoryId && typeof categoryId === 'string') {
        const catId = parseInt(categoryId, 10);
        if (!isNaN(catId)) {
          filters.categoryId = catId;
        }
      }
      console.log('[REPORTS/STATS] Filters:', filters);
      let stats, violationsByMonth, violationsByType;
      try {
        stats = await dbStorage.getViolationStats(filters);
        console.log('[REPORTS/STATS] Stats:', stats);
      } catch (err) {
        console.error('[REPORTS/STATS] getViolationStats error:', err);
        throw err;
      }
      try {
        violationsByMonth = await dbStorage.getViolationsByMonth(filters);
        console.log('[REPORTS/STATS] ViolationsByMonth:', violationsByMonth);
      } catch (err) {
        console.error('[REPORTS/STATS] getViolationsByMonth error:', err);
        throw err;
      }
      try {
        violationsByType = await dbStorage.getViolationsByType(filters);
        console.log('[REPORTS/STATS] ViolationsByType:', violationsByType);
      } catch (err) {
        console.error('[REPORTS/STATS] getViolationsByType error:', err);
        throw err;
      }
      res.json({ stats, violationsByMonth, violationsByType });
    } catch (error) {
      console.error("Failed to fetch report statistics (outer catch):", error);
      const errorMessage = (error instanceof Error) ? error.stack || error.message : String(error);
      res.status(500).json({ message: "Failed to fetch report statistics", error: errorMessage });
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
  app.get("/api/violation-categories", async (req, res) => {
    try {
      console.log("GET /api/violation-categories - Request received");
      const activeOnly = req.query.activeOnly === 'true';
      console.log("Calling dbStorage.getAllViolationCategories with activeOnly:", activeOnly);
      const categories = await dbStorage.getAllViolationCategories(activeOnly);
      console.log("Categories retrieved:", JSON.stringify(categories).substring(0, 100) + "...");
      res.json(categories);
    } catch (error) {
      console.error("Failed to fetch violation categories:", error);
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

  // Logo upload endpoint
  app.post("/api/settings/logo", ensureCouncilMember, upload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      // Only allow image types
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: "Only image files are allowed" });
      }
      const userId = getUserId(req, res);
      if (userId === undefined) return;
      // Save filename in system_settings
      await dbStorage.updateSystemSetting('strata_logo', req.file.filename, userId);
      res.json({ filename: req.file.filename, url: `/api/uploads/${req.file.filename}` });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

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
      // Validate input
      const unitSchema = insertPropertyUnitSchema.pick({ unitNumber: true, floor: true }); // Only unitNumber and floor from unit
      
      const facilitiesSchema = insertUnitFacilitySchema.pick({
        parkingSpots: true,
        storageLockers: true,
        bikeLockers: true
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
      
      const parsed = bodySchema.parse(req.body);
      // The dbStorage.createUnitWithPersons function expects facilities without id, unitId, createdAt, updatedAt
      // Our facilitiesSchema already aligns with this for the pick.
      const result = await dbStorage.createUnitWithPersons(parsed);
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

      const unitSchema = insertPropertyUnitSchema.pick({ unitNumber: true, floor: true });
      const facilitiesSchema = insertUnitFacilitySchema.pick({
        parkingSpots: true,
        storageLockers: true,
        bikeLockers: true
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

  // --- PUBLIC ENDPOINT: Add comment/evidence via access link ---
  app.post("/public/violation/:token/comment", upload.array("attachments", 5), async (req, res) => {
    const { token } = req.params;
    const { comment, commenterName } = req.body;
    try {
      // 1. Validate token
      const link = await dbStorage.getViolationAccessLinkByToken(token);
      if (!link) return res.status(404).json({ message: "Invalid or expired link" });
      if (link.usedAt) return res.status(410).json({ message: "This link has already been used" });
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(410).json({ message: "This link has expired" });
      }

      // 2. Handle file uploads
      const files = req.files as Express.Multer.File[];
      const attachments = files ? files.map(file => file.filename) : [];

      // 3. Store comment and evidence in violation history (as anonymous/public)
      await dbStorage.addViolationHistory({
        violationId: link.violationId,
        userId: 1, // Use a special system/anonymous user ID, or null if allowed
        action: "public_comment",
        comment: comment || undefined,
        commenterName: commenterName || "Anonymous",
        // Optionally, store attachments in a separate field or as part of comment text
      });

      // Optionally, store attachments in violation record or a new table
      if (attachments.length > 0) {
        // Fetch current violation
        const violation = await dbStorage.getViolation(link.violationId);
        if (violation) {
          const updatedAttachments = Array.isArray(violation.attachments) ? [...violation.attachments, ...attachments] : attachments;
          await dbStorage.updateViolation(link.violationId, { attachments: updatedAttachments });
        }
      }

      // 4. Mark link as used (single-use)
      await dbStorage.markViolationAccessLinkUsed(link.id);

      res.json({ message: "Your comment and evidence have been submitted successfully." });
    } catch (error: any) {
      console.error("Error in public comment endpoint:", error);
      res.status(500).json({ message: "Failed to submit comment/evidence", details: error.message });
    }
  });

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
        } : null });
      }
      // Valid link, fetch violation details
      const violation = await dbStorage.getViolation(link.violationId);
      if (!violation) return res.status(404).json({ message: "Violation not found" });
      // Fetch unit number
      const unit = await dbStorage.getPropertyUnit(violation.unitId);
      res.json({
        status: "valid",
        violation: {
          unitNumber: unit?.unitNumber || "",
          violationType: violation.violationType,
          description: violation.description,
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch link status" });
    }
  });

  // --- API: Get all violations pending approval (council/admin only) ---
  app.get("/api/violations/pending-approval", ensureAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req, res);
      if (userId === undefined) return; // Should not happen due to ensureAuthenticated, but good practice

      const pendingViolations = await dbStorage.getViolationsByStatus("pending_approval");
      
      // Further filter to only show violations not yet acted upon by this user,
      // or where this user is the reporter (though reporter shouldn't approve their own)
      // This logic might need refinement based on exact requirements for "pending approval for *me*"
      
      // For now, just returning all pending_approval.
      // The UI can decide what to show based on user role (e.g. council member vs admin)
      res.json(pendingViolations);
    } catch (error: any) {
      console.error("------------------------------------------------------------");
      console.error("ERROR in /api/violations/pending-approval route:");
      if (error instanceof Error) {
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
        console.error("Full Error Object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } else {
        console.error("Non-Error Object Thrown:", error);
      }
      console.error("------------------------------------------------------------");
      // Provide a more specific message if possible
      const detailMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ 
        message: "Failed to fetch pending violations. Potential database issue.", 
        details: detailMessage,
        errorContext: error // Sending more context, be cautious with sensitive info in production
      });
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

  const httpServer = createServer(app);

  return httpServer;
}
