#!/usr/bin/env node

// Simple startup script for the Replit workflow
// This avoids the heavier initialization that might be causing the workflow to fail

console.log('Starting application with optimized settings...');

// Set environment variables
process.env.NODE_ENV = 'development';

// Use dynamic import to start the server
// This avoids blocking the main thread during startup
(async () => {
  try {
    console.log('Initializing server...');
    
    // Import the custom startup file
    const { exec } = require('child_process');
    
    // Run with tsx (TypeScript executor)
    const child = exec('npx tsx server/optimized-startup.ts', (error) => {
      if (error) {
        console.error('Error starting server:', error);
        process.exit(1);
      }
    });
    
    // Forward stdout and stderr
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    
    console.log('Server process started');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();