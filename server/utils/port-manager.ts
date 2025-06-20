import { exec } from 'child_process';
import logger from './logger.js';
import net from 'net';

/**
 * Check if a port is in use
 * @param port Port number to check
 * @returns Promise resolving to true if port is in use, false otherwise
 */
export function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          logger.warn(`Port ${port} is already in use`);
          resolve(true);
        } else {
          logger.error(`Error checking port ${port}:`, err);
          resolve(false);
        }
      })
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

/**
 * Try to kill a process using a specific port
 * @param port Port number
 * @returns Promise resolving to true if process was killed, false otherwise
 */
export function killProcessOnPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    logger.info(`Attempting to kill process on port ${port}`);
    
    // Find process ID using the port
    const cmd = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port} | grep LISTEN`;
    
    exec(cmd, (error, stdout) => {
      if (error) {
        logger.error(`Error finding process on port ${port}:`, error);
        resolve(false);
        return;
      }
      
      // Parse output to find PID
      try {
        const lines = stdout.trim().split('\n');
        if (lines.length === 0) {
          logger.warn(`No process found using port ${port}`);
          resolve(false);
          return;
        }
        
        // Extract PID based on platform
        let pid: string | null = null;
        if (process.platform === 'win32') {
          const match = lines[0].match(/\s+(\d+)$/);
          if (match) pid = match[1];
        } else {
          const parts = lines[0].trim().split(/\s+/);
          pid = parts[1];
        }
        
        if (!pid) {
          logger.warn(`Could not find PID for process on port ${port}`);
          resolve(false);
          return;
        }
        
        // Kill process
        const killCmd = process.platform === 'win32'
          ? `taskkill /F /PID ${pid}`
          : `kill -9 ${pid}`;
        
        logger.info(`Killing process with PID ${pid}`);
        exec(killCmd, (killError) => {
          if (killError) {
            logger.error(`Error killing process with PID ${pid}:`, killError);
            resolve(false);
          } else {
            logger.info(`Successfully killed process with PID ${pid}`);
            resolve(true);
          }
        });
      } catch (err) {
        logger.error(`Error parsing process info for port ${port}:`, err);
        resolve(false);
      }
    });
  });
}

/**
 * Find an available port starting from the provided port
 * @param startPort Port to start checking from
 * @param maxAttempts Maximum number of ports to check
 * @returns Promise resolving to an available port, or null if none found
 */
export async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number | null> {
  let currentPort = startPort;
  let attempts = 0;
  
  logger.info(`Looking for available port starting from ${startPort}`);
  
  while (attempts < maxAttempts) {
    const inUse = await isPortInUse(currentPort);
    
    if (!inUse) {
      logger.info(`Found available port: ${currentPort}`);
      return currentPort;
    }
    
    // Try to kill the process
    const killed = await killProcessOnPort(currentPort);
    if (killed) {
      // Check if port is now available
      const stillInUse = await isPortInUse(currentPort);
      if (!stillInUse) {
        logger.info(`Successfully freed port ${currentPort}`);
        return currentPort;
      }
    }
    
    // Try next port
    currentPort++;
    attempts++;
    logger.info(`Trying next port: ${currentPort}`);
  }
  
  logger.warn(`Could not find available port after ${maxAttempts} attempts`);
  return null;
}

export default {
  isPortInUse,
  killProcessOnPort,
  findAvailablePort
};