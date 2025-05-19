import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { requestLogger, errorLogger } from "./middleware/logging-middleware";
import logger from "./utils/logger";
import { setupGlobalErrorHandlers } from "./utils/error-handler";
import { startPerformanceMonitoring, logSystemResources } from "./utils/performance-monitor";

// Initialize global error handlers
setupGlobalErrorHandlers();

// Start resource monitoring (check every 30 seconds)
const resourceMonitor = startPerformanceMonitoring(30000);

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

  // Use port 5000 consistently for both production and development
  const port = Number(process.env.PORT) || 5000;
  
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
    server.listen(port, "0.0.0.0", () => {
      logger.info(`Server started successfully and listening on port ${port}`);
      log(`serving on port ${port}`);
    });
    
    // Add error listener to the server
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is still in use, could not start server.`);
        process.exit(1);
      } else {
        logger.error('Server error occurred:', error);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
})();