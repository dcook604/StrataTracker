import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

// Define log levels and colors
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

// Define interfaces for HTTP request/response objects
interface RequestLike {
  method?: string;
  originalUrl?: string;
  url?: string;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  ip?: string;
  connection?: {
    remoteAddress?: string;
  };
  headers?: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  statusCode?: number;
  body?: unknown;
  locals?: {
    responseBody?: unknown;
  };
}

// Define color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Map log levels to colors
const levelColors: Record<LogLevel, string> = {
  DEBUG: colors.cyan,
  INFO: colors.green,
  WARN: colors.yellow,
  ERROR: colors.red,
};

// Ensure log directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log file paths
const logFilePaths = {
  app: path.join(logDir, 'app.log'),
  error: path.join(logDir, 'error.log'),
  server: path.join(logDir, 'server.log'),
};

// Log rotation settings
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

// Async file operations
const appendFile = promisify(fs.appendFile);
const stat = promisify(fs.stat);
const rename = promisify(fs.rename);
const unlink = promisify(fs.unlink);

/**
 * Format a log message for output
 */
function formatLogMessage(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level}] ${message}`;
  
  if (data) {
    try {
      // Try to format objects nicely
      if (typeof data === 'object' && data !== null) {
        if (data instanceof Error) {
          logMessage += `: ${data.message}`;
          if (data.stack) {
            logMessage += `\n${data.stack}`;
          }
        } else {
          const stringified = JSON.stringify(data, replacer);
          if (stringified !== '{}' && stringified !== '[]') {
            logMessage += `: ${stringified}`;
          }
        }
      } else {
        logMessage += `: ${data}`;
      }
    } catch {
      logMessage += `: [Object cannot be stringified]`;
    }
  }
  
  return logMessage;
}

/**
 * Custom JSON replacer to handle circular references and non-serializable values
 */
function replacer(key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return {
      message: value.message,
      stack: value.stack,
      // Add any other relevant Error properties here
    };
  }
  
  if (typeof value === 'bigint') {
    return value.toString();
  }
  
  // Avoid circular references
  const seen = new WeakSet();
  if (typeof value === 'object' && value !== null) {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
  }
  
  return value;
}

/**
 * Rotate log file if it exceeds maximum size
 */
async function rotateLogFile(filePath: string): Promise<void> {
  try {
    const stats = await stat(filePath);
    if (stats.size > MAX_LOG_SIZE) {
      // Rotate existing files
      for (let i = MAX_LOG_FILES - 1; i > 0; i--) {
        const oldFile = `${filePath}.${i}`;
        const newFile = `${filePath}.${i + 1}`;
        
        if (fs.existsSync(oldFile)) {
          if (i === MAX_LOG_FILES - 1) {
            await unlink(oldFile); // Delete oldest file
          } else {
            await rename(oldFile, newFile);
          }
        }
      }
      
      // Move current log to .1
      await rename(filePath, `${filePath}.1`);
    }
  } catch (err) {
    // Don't log this error to prevent recursion - just output to console
    console.error(`[LOGGER] Failed to rotate log file ${filePath}:`, err instanceof Error ? err.message : String(err));
  }
}

/**
 * Write log entry to file asynchronously with error handling
 */
async function writeToFile(filePath: string, message: string): Promise<void> {
  try {
    // Check if rotation is needed
    if (fs.existsSync(filePath)) {
      await rotateLogFile(filePath);
    }
    
    // Write to file asynchronously
    await appendFile(filePath, message + '\n');
  } catch (err) {
    // Don't use logger.error here to prevent infinite recursion
    // Just output to console as a fallback
    console.error(`[LOGGER] Failed to write to log file (${filePath}):`, err instanceof Error ? err.message : String(err));
  }
}

/**
 * Logger class with methods for different log levels
 */
class Logger {
  private minLevel: LogLevel = 'INFO';
  private writeQueue: Promise<void> = Promise.resolve();
  private isProduction: boolean = process.env.NODE_ENV === 'production';
  
  constructor() {
    // Set production-optimized log levels - more conservative to prevent EIO
    if (this.isProduction) {
      // Production: Only log ERROR to reduce volume and improve performance
      this.minLevel = 'ERROR';
    } else if (process.env.NODE_ENV === 'test') {
      // Test: Only errors to keep test output clean
      this.minLevel = 'ERROR';
    } else {
      // Development: Allow more verbose logging but still be conservative
      this.minLevel = 'WARN';
    }
    
    // Override with LOG_LEVEL environment variable if set
    if (process.env.LOG_LEVEL) {
      this.minLevel = process.env.LOG_LEVEL as LogLevel;
    }
    
    // Only log configuration in development and not too frequently
    if (!this.isProduction) {
      console.log(`${colors.cyan}[LOGGER] Environment: ${process.env.NODE_ENV || 'development'}${colors.reset}`);
      console.log(`${colors.cyan}[LOGGER] Log level: ${this.minLevel}${colors.reset}`);
      console.log(`${colors.cyan}[LOGGER] Log files will be written to: ${logDir}${colors.reset}`);
    }
  }
  
  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const minLevelIndex = levels.indexOf(this.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    
    return currentLevelIndex >= minLevelIndex;
  }
  
  /**
   * Log a message with production optimizations and EIO error prevention
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;
    
    const formattedMessage = formatLogMessage(level, message, data);
    
    // Console output with colors (always synchronous for immediate feedback)
    // Use stderr for errors to separate from stdout
    if (level === 'ERROR') {
      console.error(`${levelColors[level]}${formattedMessage}${colors.reset}`);
    } else {
      console.log(`${levelColors[level]}${formattedMessage}${colors.reset}`);
    }
    
    // Be extremely conservative with file writes to prevent EIO errors
    // Only write ERROR level logs to files, and only if absolutely necessary
    const shouldWriteToFile = level === 'ERROR';
    
    if (shouldWriteToFile) {
      // Queue async file writes to prevent blocking
      this.writeQueue = this.writeQueue.then(async () => {
        try {
          // Only write to error log for ERROR level
          await writeToFile(logFilePaths.error, formattedMessage);
        } catch (err) {
          // Last resort - output to stderr only, don't try to log the logging error
          console.error(`[LOGGER] Critical: Failed to write log (${err instanceof Error ? err.message : String(err)})`);
        }
      }).catch(err => {
        // Prevent unhandled promise rejections, output to stderr only
        console.error(`[LOGGER] Critical: Log write queue error (${err instanceof Error ? err.message : String(err)})`);
      });
    }
  }
  
  /**
   * Debug level log (lowest priority) - disabled in production
   */
  debug(message: string, data?: unknown): void {
    // Skip debug logs in production entirely for performance
    if (this.isProduction) return;
    this.log('DEBUG', message, data);
  }
  
  /**
   * Trace level logging for very detailed debugging - disabled in production
   */
  trace(message: string, data?: unknown): void {
    // Skip trace logs in production entirely for performance
    if (this.isProduction) return;
    
    if (!this.shouldLog('DEBUG')) return;
    
    // Include stack trace for trace-level logging
    const stack = new Error().stack?.split('\n').slice(2, 5).join('\n') || 'No stack available';
    const traceData = data ? { ...(data as Record<string, unknown>), stack } : { stack };
    this.log('DEBUG', `[TRACE] ${message}`, traceData);
  }
  
  /**
   * Performance logging - disabled in production to reduce noise
   */
  perf(operation: string, startTime: number, data?: unknown): void {
    // Skip performance logs in production
    if (this.isProduction) return;
    
    const duration = Date.now() - startTime;
    this.debug(`[PERF] ${operation} completed in ${duration}ms`, data);
  }
  
  /**
   * Info level log (normal operation) - limited in production
   */
  info(message: string, data?: unknown): void {
    this.log('INFO', message, data);
  }
  
  /**
   * Warning level log (potential issues)
   */
  warn(message: string, data?: unknown): void {
    this.log('WARN', message, data);
  }
  
  /**
   * Error level log (runtime errors) - always logged
   */
  error(message: string, data?: unknown): void {
    this.log('ERROR', message, data);
  }
  
  /**
   * Log HTTP request details - simplified for production
   */
  logRequest(req: RequestLike): void {
    // In production, only log failed requests or skip entirely
    if (this.isProduction) return;
    
    if (!this.shouldLog('DEBUG')) return;
    
    const requestInfo = {
      method: req.method,
      url: req.originalUrl || req.url,
      query: Object.keys(req.query || {}).length > 0 ? '[REDACTED]' : undefined,
      params: Object.keys(req.params || {}).length > 0 ? '[REDACTED]' : undefined,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent']?.slice(0, 100) // Truncate long user agents
    };
    
    this.debug(`Request: ${req.method} ${req.originalUrl || req.url}`, requestInfo);
  }
  
  /**
   * Log HTTP response details - production optimized
   */
  logResponse(req: RequestLike, res: ResponseLike, responseTime: number): void {
    const method = req.method;
    const url = req.originalUrl || req.url;
    const status = res.statusCode;
    
    // In production, only log failed requests (4xx, 5xx)
    if (this.isProduction && status < 400) return;
    
    // Log failed requests with higher priority
    if (status >= 400) {
      this.error(`Request failed: ${method} ${url}`, {
        statusCode: status,
        duration: responseTime,
        // Don't log response body in production to avoid sensitive data leaks
        response: this.isProduction ? undefined : (res.body || res.locals.responseBody)
      });
    } else {
      // Only log successful requests in development
      if (!this.isProduction) {
        this.info(`${method} ${url} ${status} ${responseTime}ms`);
      }
    }
  }
  
  /**
   * Log database query for debugging - disabled in production
   */
  logQuery(query: string, params?: unknown[], duration?: number): void {
    // Skip database query logging in production for security and performance
    if (this.isProduction) return;
    
    if (!this.shouldLog('DEBUG')) return;
    
    let message = `DB Query: ${query.substr(0, 100)}${query.length > 100 ? '...' : ''}`;
    if (duration) {
      message += ` (${duration}ms)`;
    }
    
    // Don't log actual parameters to avoid sensitive data exposure
    this.debug(message, { paramCount: params?.length || 0 });
  }
  
  /**
   * Security-focused logging for audit trails
   */
  security(event: string, data?: unknown): void {
    // Security events should always be logged regardless of level
    const securityMessage = `[SECURITY] ${event}`;
    const formattedMessage = formatLogMessage('ERROR', securityMessage, data);
    
    // Always output security events to console
    console.log(`${colors.red}${formattedMessage}${colors.reset}`);
    
    // Always write security events to files
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        await writeToFile(logFilePaths.app, formattedMessage);
        await writeToFile(logFilePaths.error, formattedMessage);
        await writeToFile(logFilePaths.server, formattedMessage);
      } catch (err) {
        console.error(`[LOGGER] Critical: Failed to write security log:`, err instanceof Error ? err.message : String(err));
      }
    });
  }
}

// Export a singleton logger instance
const logger = new Logger();
export default logger;