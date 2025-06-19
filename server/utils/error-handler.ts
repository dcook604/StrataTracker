import express from 'express';
import logger from './logger';

/**
 * Configure global error handlers to catch and log unhandled errors
 */
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason instanceof Error 
        ? { message: reason.message, stack: reason.stack } 
        : reason,
      promise
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      message: error.message,
      stack: error.stack
    });
    
    // Only exit in production; in development we might want to continue
    if (process.env.NODE_ENV === 'production') {
      logger.error('Process will now exit due to uncaught exception');
      process.exit(1);
    }
  });

  // Handle warnings
  process.on('warning', (warning) => {
    logger.warn('Process Warning:', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack
    });
  });

  logger.info('Global error handlers configured successfully');
}

/**
 * Centralized error handler middleware for Express
 */
export function errorHandlerMiddleware(err: Error & { statusCode?: number; status?: number }, req: express.Request, res: express.Response, _next: express.NextFunction) {
  // Log the error with contextual information
  logger.error('Express error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode: err.statusCode || 500,
    userId: req.user?.id || 'unauthenticated'
  });

  // Determine if this is an operational error that should be exposed to the client
  const isOperationalError = (err as any).isOperational || false;
  
  // Don't leak error details in production unless it's an operational error
  const responseMessage = (process.env.NODE_ENV === 'production' && !isOperationalError)
    ? 'An unexpected error occurred' 
    : err.message || 'Internal Server Error';

  // Send the response
  res.status(err.statusCode || 500).json({
    error: responseMessage,
    status: 'error',
    requestId: req.id // Assuming request ID middleware is used
  });
}

/**
 * Create a custom application error that can be safely exposed to clients
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // These errors can be safely exposed to clients
    
    Error.captureStackTrace(this, this.constructor);
  }
}