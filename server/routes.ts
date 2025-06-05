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
import unitsRoutes from './routes/units'; // Import the new units router
import reportsRoutes from './routes/reports'; // Import the new reports router
import path from "path";
import fs from "fs/promises";
import logger from "./utils/logger";
import { getVirusScanner } from "./services/virusScanner";

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
  app.use('/api/violation-categories', violationsRoutes);
  app.use('/api/units', unitsRoutes);
  app.use('/api/property-units', unitsRoutes);
  app.use('/api/reports', reportsRoutes); // Register the reports router

  // Serve uploaded files statically
  app.use('/api/uploads', express.static(uploadsDir));

  // Any remaining, un-refactored routes can be cleaned up or moved next.
  
  const httpServer = createServer(app);
  return httpServer;
}
