import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import ResponsePayload = Express.Response;

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const path = req.path;
  const method = req.method;
  
  // Capture request body for debugging (exclude sensitive data)
  const requestBody = req.body ? { ...req.body } : {};
  if (requestBody.password) requestBody.password = '[REDACTED]';
  if (requestBody.token) requestBody.token = '[REDACTED]';
  
  // Log the incoming request
  logger.debug(`Request: ${method} ${path}`, {
    query: req.query,
    body: Object.keys(requestBody).length ? requestBody : undefined,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // Capture the original response methods
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;
  
  let responseBody: any;
  
  // Override json method
  res.json = function(body: any) {
    responseBody = body;
    return originalJson.apply(res, [body]);
  };
  
  // Override send method
  res.send = function(body: any) {
    responseBody = body;
    return originalSend.apply(res, [body]);
  };
  
  // Log response on completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // For all routes, log basic info
    logger.info(`${method} ${path} ${statusCode} ${duration}ms`);
    
    // Additional detailed logging for API routes
    if (path.startsWith('/api')) {
      // Log additional info for errors
      if (statusCode >= 400) {
        logger.error(`Request failed: ${method} ${path}`, {
          statusCode,
          duration,
          response: responseBody
        });
      }
    }
  });
  
  next();
}

export function errorLogger(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error(`Error handling ${req.method} ${req.path}`, {
    error: {
      message: message,
      stack: err.stack,
      status: status
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });
  
  // Only send response if headers haven't been sent
  if (!res.headersSent) {
    res.status(status).json({ message });
  }
  
  next(err);
}