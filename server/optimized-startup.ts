import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { requestLogger, errorLogger } from "./middleware/logging-middleware";
import logger from "./utils/logger";

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging
app.use(requestLogger);

// Log application startup
logger.info("Application starting up with optimized settings...");

async function startApp() {
  try {
    // Create logs directory if it doesn't exist
    const fs = await import("fs");
    const path = await import("path");
    
    try {
      if (!fs.existsSync("./logs")) {
        fs.mkdirSync("./logs", { recursive: true });
      }
    } catch (err) {
      console.error("Failed to create logs directory:", err);
    }
    
    // Set up routes
    const server = await registerRoutes(app);
    
    // Error handling
    app.use(errorLogger);
    
    // Fallback error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      logger.error("Server error:", {
        error: err.message,
        stack: err.stack
      });
      
      // Only send response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
    });
    
    // Set up Vite or static files based on environment
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    // Use environment port or fallback to 3000
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    
    // Start server
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      logger.info(`Server started successfully and listening on port ${port}`);
      log(`serving on port ${port}`);
    });
    
    // Add error handler
    server.on('error', (error: any) => {
      logger.error('Server error occurred:', error);
      process.exit(1);
    });
    
    // Schedule performance monitoring after startup
    setTimeout(() => {
      import('./utils/performance-monitor').then(({ startPerformanceMonitoring }) => {
        startPerformanceMonitoring(60000); // Check every minute instead of every 30 seconds
      });
    }, 10000); // Wait 10 seconds after server startup

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the app
startApp();