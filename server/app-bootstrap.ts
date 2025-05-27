import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { requestLogger, errorLogger } from "./middleware/logging-middleware";
import logger from "./utils/logger";
import { setupGlobalErrorHandlers, errorHandlerMiddleware } from "./utils/error-handler";
import { startPerformanceMonitoring, logSystemResources } from "./utils/performance-monitor";
import { pool } from "./db";
import { createServer } from "http";

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
} catch (error) {
  console.error("Failed to create logs directory:", error);
}

const app = express();

// Apply middleware
app.use(requestLogger);
app.use(errorLogger);
app.use(express.json());

// Use port 3000 consistently for both production and development
const port = Number(process.env.PORT) || 3000;

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

let server: ReturnType<typeof createServer>;

async function startServer() {
  try {
    // Create HTTP server
    server = createServer(app);

    // Register API routes BEFORE Vite/static serving setup
    await registerRoutes(app);

    // Setup routes and vite
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      await setupVite(app, server);
    }

    // Error handling middleware - should be last after all routes and regular middleware
    app.use(errorHandlerMiddleware);

    // Start listening
    server.listen(port, "0.0.0.0", () => {
      logger.info(`Server started successfully and listening on port ${port}`);
      log(`serving on port ${port}`);
    });
    
    // Add error listener to the server
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is still in use, could not start server`);
        process.exit(1);
      }
      logger.error('Server error:', error);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop the performance monitoring
  if (resourceMonitor) {
    clearInterval(resourceMonitor);
  }

  // Close the server first
  if (server) {
    logger.info('Closing HTTP server...');
    await new Promise<void>((resolve) => {
      server.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    });
  }

  // Close database connections
  try {
    logger.info('Closing database connections...');
    await pool.end();
    logger.info('Database connections closed');
  } catch (err) {
    logger.error('Error closing database connections:', err);
  }

  // Exit the process
  logger.info('Shutdown complete');
  process.exit(0);
}

// Handle various signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  shutdown('uncaught exception');
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection, reason:', reason);
  shutdown('unhandled rejection');
});

// Start the server
startServer(); 