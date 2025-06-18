import { sql } from "drizzle-orm";
import fs from "fs";

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
    const appBootstrap = await import('./app-bootstrap');
    const bootstrap = appBootstrap.createAppBootstrap();
    await bootstrap.startServer();

    // Start email cleanup scheduler
    const { startEmailCleanupScheduler } = await import('./email-cleanup-scheduler');
    startEmailCleanupScheduler();
    console.log("Email cleanup scheduler started");

    // Start Supabase keep-alive service
    const { supabaseKeepAlive } = await import('./services/supabase-keepalive');
    supabaseKeepAlive.start();
    console.log("Supabase keep-alive service started");

  } catch (error) {
    console.error('Failed to initialize environment or app:', error);
    process.exit(1);
  }
})();