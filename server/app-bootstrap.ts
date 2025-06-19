import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { requestLogger, errorLogger } from "./middleware/logging-middleware";
import logger from "./utils/logger";
import { setupGlobalErrorHandlers, errorHandlerMiddleware } from "./utils/error-handler";
import { startPerformanceMonitoring } from "./utils/performance-monitor";
import { pool } from "./db";
import { createServer } from "http";
import fs from "fs";

// Initialize global error handlers
setupGlobalErrorHandlers();

// Start resource monitoring (check every 30 seconds)
const resourceMonitor = startPerformanceMonitoring(30000);

// Export function to ensure log directory exists
export function ensureLogDirectoryExists() {
  try {
    if (!fs.existsSync("./logs")) {
      fs.mkdirSync("./logs", { recursive: true });
    }
  } catch (error) {
    console.error("Failed to create logs directory:", error);
  }
}

// Create logs directory if it doesn't exist
ensureLogDirectoryExists();

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
    server.on('error', (error: Error & { code?: string }) => {
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

// Export function to create app bootstrap
export function createAppBootstrap() {
  return {
    startServer,
    app,
    server
  };
}

// Flag to prevent multiple shutdown attempts
let shutdownInProgress = false;

// Graceful shutdown handler
async function shutdown(signal: string) {
  // Prevent multiple shutdown attempts
  if (shutdownInProgress) {
    console.log(`[SHUTDOWN] Shutdown already in progress, ignoring ${signal}`);
    return;
  }
  
  shutdownInProgress = true;
  console.log(`[SHUTDOWN] Received ${signal}, starting graceful shutdown...`);

  // Try to log shutdown, but fallback to console if logger fails
  try {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
  } catch (err) {
    console.error('[SHUTDOWN] Logger unavailable during shutdown:', err);
  }

  // Stop the performance monitoring
  if (resourceMonitor) {
    clearInterval(resourceMonitor);
  }

  // Close the server first
  if (server) {
    console.log('[SHUTDOWN] Closing HTTP server...');
    try {
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log('[SHUTDOWN] HTTP server closed');
          resolve();
        });
      });
    } catch (err) {
      console.error('[SHUTDOWN] Error closing HTTP server:', err);
    }
  }

  // Close database connections
  try {
    console.log('[SHUTDOWN] Closing database connections...');
    if (!pool.ended) {
      await pool.end();
      console.log('[SHUTDOWN] Database connections closed');
    } else {
      console.log('[SHUTDOWN] Database connections already closed');
    }
  } catch (err) {
    console.error('[SHUTDOWN] Error closing database connections:', err);
  }

  // Give logger time to flush pending writes
  console.log('[SHUTDOWN] Waiting for logger to flush...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Exit the process
  console.log('[SHUTDOWN] Shutdown complete');
  process.exit(0);
}

// Handle various signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  // Use console.error as fallback in case logger is the source of the issue
  console.error('[CRITICAL] Uncaught exception:', error.message);
  console.error('[CRITICAL] Stack:', error.stack);
  
  // Try to log with logger, but don't crash if it fails
  try {
    logger.error('Uncaught exception:', error);
  } catch (logError) {
    console.error('[CRITICAL] Logger failed during uncaught exception:', logError);
  }
  
  // Start graceful shutdown
  shutdown('uncaught exception').catch(() => {
    console.error('[CRITICAL] Graceful shutdown failed, forcing exit');
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason: unknown) => {
  // Use console.error as fallback
  console.error('[CRITICAL] Unhandled Rejection:', reason);
  
  // Try to log with logger, but don't crash if it fails
  try {
    logger.error('Unhandled Rejection, reason:', reason);
  } catch (logError) {
    console.error('[CRITICAL] Logger failed during unhandled rejection:', logError);
  }
  
  // Start graceful shutdown
  shutdown('unhandled rejection').catch(() => {
    console.error('[CRITICAL] Graceful shutdown failed, forcing exit');
    process.exit(1);
  });
});

// Start the server
startServer(); 