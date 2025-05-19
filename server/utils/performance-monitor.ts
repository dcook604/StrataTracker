import logger from './logger';
import os from 'os';

/**
 * Formats memory values from bytes to MB with 2 decimal places
 */
function formatMemory(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

/**
 * Monitors system resource usage and logs it periodically
 * @param intervalMs How often to log system resources (in milliseconds)
 */
export function startPerformanceMonitoring(intervalMs: number = 30000): NodeJS.Timeout {
  // Log initial state
  logSystemResources();
  
  // Set up periodic monitoring
  return setInterval(() => {
    logSystemResources();
  }, intervalMs);
}

/**
 * Logs current system resource usage
 */
export function logSystemResources(): void {
  try {
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      free: os.freemem(),
      total: os.totalmem()
    };
    
    // Calculate system memory percentage free
    const percentFree = ((systemMemory.free / systemMemory.total) * 100).toFixed(2) + '%';
    
    // Get CPU load averages
    const loadAvg = os.loadavg();
    
    logger.info('System resources status:', {
      memory: {
        rss: formatMemory(memoryUsage.rss),
        heapTotal: formatMemory(memoryUsage.heapTotal),
        heapUsed: formatMemory(memoryUsage.heapUsed),
        external: formatMemory(memoryUsage.external),
        arrayBuffers: formatMemory(memoryUsage.arrayBuffers || 0),
        systemFree: formatMemory(systemMemory.free),
        systemTotal: formatMemory(systemMemory.total),
        percentFree: percentFree
      },
      cpu: {
        loadAvg1: loadAvg[0].toFixed(2),
        loadAvg5: loadAvg[1].toFixed(2),
        loadAvg15: loadAvg[2].toFixed(2),
        cores: os.cpus().length
      },
      uptime: formatUptime(os.uptime()),
      processUptime: formatUptime(process.uptime())
    });
  } catch (err) {
    logger.error('Error monitoring system resources:', err);
  }
}

/**
 * Formats uptime in a human-readable format
 * @param seconds Uptime in seconds
 * @returns Formatted uptime string
 */
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
  
  return parts.join(' ');
}