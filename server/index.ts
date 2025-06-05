import { sql } from "drizzle-orm";
import { db } from "./db";
import { startEmailCleanupScheduler } from "./email-cleanup-scheduler";
import { ensureLogDirectoryExists, createAppBootstrap } from "./app-bootstrap";

// Ensure log directory exists
ensureLogDirectoryExists();

// Create the app bootstrap
console.log('DEBUG (IIFE): DATABASE_URL from .env =', process.env.DATABASE_URL);

(async () => {
  try {
    // Load environment variables first
    const dotenv = await import('dotenv');
    dotenv.config();

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