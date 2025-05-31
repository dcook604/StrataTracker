import express from "express";
import { db } from "./db";
import { registerRoutes } from "./routes";
import logger from './utils/logger';

(async () => {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
    console.log('DEBUG (IIFE): DATABASE_URL from .env =', process.env.DATABASE_URL);

    // Dynamically import the rest of your application
    // to ensure dotenv is configured before any other code runs.
    await import('./app-bootstrap.js'); // We'll move existing imports here

    // Test database connection
    await db.execute(sql`SELECT 1`);
    console.log("Database connected successfully");

    // Register routes
    const server = await registerRoutes(app);

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