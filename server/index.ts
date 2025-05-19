import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { requestLogger, errorLogger } from "./middleware/logging-middleware";
import logger from "./utils/logger";
import { setupGlobalErrorHandlers } from "./utils/error-handler";
import { startPerformanceMonitoring, logSystemResources } from "./utils/performance-monitor";
import { killProcessOnPort, findAvailablePort } from "./utils/port-manager";
import { exec } from 'child_process';

// Initialize global error handlers
setupGlobalErrorHandlers();

// Log system resources at startup
logSystemResources();

// Start resource monitoring (check every 30 seconds)
const resourceMonitor = startPerformanceMonitoring(30000);

// Simplify port handling - don't try to automatically kill processes
// just log an informational message
logger.info("Starting application - will use port defined by Replit or fallback to 3000");

// Create logs directory if it doesn't exist
import fs from "fs";
import path from "path";
try {
  if (!fs.existsSync("./logs")) {
    fs.mkdirSync("./logs", { recursive: true });
  }
} catch (err) {
  console.error("Failed to create logs directory:", err);
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add comprehensive request logging
app.use(requestLogger);

// Log application startup
logger.info("Application starting up...");

(async () => {
  const server = await registerRoutes(app);

  // Use our enhanced error logger middleware
  app.use(errorLogger);
  
  // Fallback error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error("Server error:", {
      error: err,
      stack: err.stack
    });
    
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use environment port or fallback to 3000
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  
  // Log important server information
  logger.info(`Attempting to start server on port ${port}`);
  
  // Log environment details for debugging
  logger.info("Application environment details:", {
    nodeEnv: process.env.NODE_ENV,
    port: port,
    databaseUrl: process.env.DATABASE_URL ? "Set (value hidden)" : "Not set",
    platform: process.platform,
    nodeVersion: process.version,
    pid: process.pid
  });
  
  try {
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      logger.info(`Server started successfully and listening on port ${port}`);
      log(`serving on port ${port}`);
    });
    
    // Add error listener to the server
    server.on('error', async (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is in use, attempting to find an available port...`);
        try {
          const availablePort = await findAvailablePort(port + 1);
          logger.info(`Found available port ${availablePort}`);
          
          server.listen({
            port: availablePort,
            host: "0.0.0.0",
          }, () => {
            logger.info(`Server started successfully on port ${availablePort}`);
            log(`serving on port ${availablePort}`);
          });
        } catch (err) {
          logger.error('Failed to find available port:', err);
          process.exit(1);
        }
      } else {
        logger.error('Server error occurred:', error);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
})();
