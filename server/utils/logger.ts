import fs from 'fs';
import path from 'path';

// Define log levels and colors
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

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

/**
 * Format a log message for output
 */
function formatLogMessage(level: LogLevel, message: string, data?: any): string {
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
    } catch (err) {
      logMessage += `: [Object cannot be stringified]`;
    }
  }
  
  return logMessage;
}

/**
 * Custom JSON replacer to handle circular references and non-serializable values
 */
function replacer(key: string, value: any): any {
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
 * Write log entry to file
 */
function writeToFile(filePath: string, message: string): void {
  try {
    fs.appendFileSync(filePath, message + '\n');
  } catch (err) {
    console.error(`Failed to write to log file (${filePath}):`, err);
  }
}

/**
 * Logger class with methods for different log levels
 */
class Logger {
  private minLevel: LogLevel = 'INFO';
  
  constructor() {
    // Set minimum log level based on environment
    if (process.env.NODE_ENV === 'development') {
      this.minLevel = 'DEBUG';
    }
    
    // Override with LOG_LEVEL environment variable if set
    if (process.env.LOG_LEVEL) {
      this.minLevel = process.env.LOG_LEVEL as LogLevel;
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
   * Log a message
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;
    
    const formattedMessage = formatLogMessage(level, message, data);
    
    // Console output with colors
    console.log(`${levelColors[level]}${formattedMessage}${colors.reset}`);
    
    // Write to app log
    writeToFile(logFilePaths.app, formattedMessage);
    
    // Also write to error log if level is ERROR
    if (level === 'ERROR') {
      writeToFile(logFilePaths.error, formattedMessage);
    }
    
    // Write to server log for INFO and higher
    if (level !== 'DEBUG') {
      writeToFile(logFilePaths.server, formattedMessage);
    }
  }
  
  /**
   * Debug level log (lowest priority)
   */
  debug(message: string, data?: any): void {
    this.log('DEBUG', message, data);
  }
  
  /**
   * Info level log (normal operation)
   */
  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }
  
  /**
   * Warning level log (potential issues)
   */
  warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }
  
  /**
   * Error level log (runtime errors)
   */
  error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }
  
  /**
   * Log HTTP request details
   */
  logRequest(req: any): void {
    if (!this.shouldLog('DEBUG')) return;
    
    const requestInfo = {
      method: req.method,
      url: req.originalUrl || req.url,
      query: req.query,
      params: req.params,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent']
    };
    
    this.debug(`Request: ${req.method} ${req.originalUrl || req.url}`, requestInfo);
  }
  
  /**
   * Log HTTP response details
   */
  logResponse(req: any, res: any, responseTime: number): void {
    const method = req.method;
    const url = req.originalUrl || req.url;
    const status = res.statusCode;
    
    // Log failed requests with higher priority
    if (status >= 400) {
      this.error(`Request failed: ${method} ${url}`, {
        statusCode: status,
        duration: responseTime,
        response: res.body || res.locals.responseBody
      });
    } else {
      this.info(`${method} ${url} ${status} ${responseTime}ms`);
    }
  }
  
  /**
   * Log database query for debugging
   */
  logQuery(query: string, params?: any[], duration?: number): void {
    if (!this.shouldLog('DEBUG')) return;
    
    let message = `DB Query: ${query.substr(0, 100)}${query.length > 100 ? '...' : ''}`;
    if (duration) {
      message += ` (${duration}ms)`;
    }
    
    this.debug(message, params);
  }
}

// Export a singleton logger instance
const logger = new Logger();
export default logger;