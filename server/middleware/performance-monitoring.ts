import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  userAgent?: string;
  ip: string;
  timestamp: Date;
}

// Track slow queries (>1 second)
const SLOW_QUERY_THRESHOLD = 1000;

export function performanceMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Override res.send to capture response details
  res.send = function(body: any) {
    const duration = Date.now() - startTime;
    
    const metrics: PerformanceMetrics = {
      endpoint: req.path,
      method: req.method,
      duration,
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      timestamp: new Date()
    };
    
    // Log performance metrics
    if (duration > SLOW_QUERY_THRESHOLD) {
      logger.warn('[PERFORMANCE] Slow request detected', metrics);
    } else {
      logger.debug('[PERFORMANCE] Request completed', metrics);
    }
    
    // Track error rates
    if (res.statusCode >= 400) {
      logger.error('[PERFORMANCE] Error response', metrics);
    }
    
    // Call original send
    return originalSend.call(this, body);
  };
  
  next();
}

export function memoryMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check memory usage periodically
  const memUsage = process.memoryUsage();
  const memoryThreshold = 500 * 1024 * 1024; // 500MB
  
  if (memUsage.heapUsed > memoryThreshold) {
    logger.warn('[MEMORY] High memory usage detected', {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
    });
  }
  
  next();
} 