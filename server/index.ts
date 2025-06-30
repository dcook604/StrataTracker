import express from "express";
import { createServer } from "http";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

// Ensure log directory exists
function ensureLogDirectoryExists() {
  try {
    if (!fs.existsSync("./logs")) {
      fs.mkdirSync("./logs", { recursive: true });
    }
  } catch (error) {
    console.error("Failed to create logs directory:", error);
  }
}

// Ensure log directory exists
ensureLogDirectoryExists();

console.log('Starting StrataTracker server...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 3000);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set (hidden)' : 'Not set');
console.log('Timestamp:', new Date().toISOString());

(async () => {
  try {
    // Load environment variables first
    const dotenv = await import('dotenv');
    dotenv.config();

    // Test database connection with timeout
    console.log("Testing database connection...");
    const { db } = await import('./db.js');
    
    const dbTest = await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ]);
    
    console.log("Database connected successfully");

    // Create Express app
    const app = express();
    const port = Number(process.env.PORT) || 3000;

    // Configure trust proxy for Cloudflare and reverse proxies
    if (process.env.TRUST_PROXY) {
      console.log('Configuring trust proxy for reverse proxy/Cloudflare');
      app.set('trust proxy', true);
    }

    // Basic middleware
    app.use(express.json());

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV 
      });
    });

    // Register routes
    try {
      const { registerRoutes } = await import('./routes.js');
      await registerRoutes(app);
      console.log("Routes registered successfully");
    } catch (error) {
      console.error("Failed to register routes:", error instanceof Error ? error.message : String(error));
    }

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      const publicPath = path.join(process.cwd(), 'dist', 'public');
      if (fs.existsSync(publicPath)) {
        // Middleware to set no-cache headers for auth routes
        app.use((req, res, next) => {
          const authPaths = ['/auth', '/login', '/logout', '/forgot-password', '/reset-password', '/set-password'];
          const isAuthRoute = authPaths.some(path => req.path === path || req.path.startsWith(path));
          
          if (isAuthRoute) {
            // Set comprehensive no-cache headers for auth routes
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
            res.setHeader('X-Accel-Expires', '0');
            res.setHeader('Vary', '*');
            console.log(`[CACHE] No-cache headers set for auth route: ${req.path}`);
          }
          next();
        });
        
        app.use(express.static(publicPath));
        
        // Serve index.html for SPA routes with special handling for auth routes
        app.get('*', (req, res) => {
          const authPaths = ['/auth', '/login', '/logout', '/forgot-password', '/reset-password', '/set-password'];
          const isAuthRoute = authPaths.some(path => req.path === path || req.path.startsWith(path));
          
          if (isAuthRoute) {
            // Ensure no-cache headers are set for auth routes serving index.html
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
            res.setHeader('X-Accel-Expires', '0');
            res.setHeader('Vary', '*');
            console.log(`[CACHE] No-cache headers set for auth SPA route: ${req.path}`);
          }
          
          res.sendFile(path.join(publicPath, 'index.html'));
        });
        console.log("Static files configured with auth route cache control");
      } else {
        console.warn("Public directory not found:", publicPath);
      }
    } else {
      // Development mode - setup Vite
      try {
        const { setupVite } = await import('./vite.js');
        const server = createServer(app);
        await setupVite(app, server);
        console.log("Vite development server configured");
      } catch (error) {
        console.error("Failed to setup Vite:", error);
      }
    }

    // Start server
    const server = createServer(app);
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
      console.log(`Health check: http://localhost:${port}/api/health`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // Start background services (if they exist)
    try {
      const { startEmailCleanupScheduler } = await import('./email-cleanup-scheduler.js');
      startEmailCleanupScheduler();
      console.log("Email cleanup scheduler started");
    } catch (error) {
      console.log("Email cleanup scheduler not available:", error instanceof Error ? error.message : String(error));
    }

    try {
      const { supabaseKeepAlive } = await import('./services/supabase-keepalive.js');
      supabaseKeepAlive.start();
      console.log("Supabase keep-alive service started");
    } catch (error) {
      console.log("Supabase keep-alive service not available:", error instanceof Error ? error.message : String(error));
    }

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();