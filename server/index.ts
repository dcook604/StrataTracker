import express from "express";
import { sql } from "drizzle-orm";
import { registerRoutes } from "./routes";
import logger from './utils/logger';

(async () => {
  try {
    // Load environment variables first
    const dotenv = await import('dotenv');
    dotenv.config();
    console.log('DEBUG (IIFE): DATABASE_URL from .env =', process.env.DATABASE_URL);

    // Dynamically import the rest of your application
    // to ensure dotenv is configured before any other code runs.
    const { db } = await import('./db');
    
    // Test database connection
    await db.execute(sql`SELECT 1`);
    console.log("Database connected successfully");

    // Import and start the main application
    await import('./app-bootstrap');

    // Start email cleanup scheduler
    const { startEmailCleanupScheduler } = await import('./email-cleanup-scheduler');
    startEmailCleanupScheduler();
    console.log("Email cleanup scheduler started");

  } catch (error) {
    console.error('Failed to initialize environment or app:', error);
    process.exit(1);
  }
})();

// ALL OTHER IMPORTS AND CODE WILL BE MOVED TO a new file app-bootstrap.ts