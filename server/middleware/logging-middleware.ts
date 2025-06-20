import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
// import ResponsePayload = Express.Response; // Unused

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const path = req.path;
  const method = req.method;
  
  // Capture request body for debugging (exclude sensitive data)
  const requestBody = req.body ? { ...req.body } : {};
  if (requestBody.password) requestBody.password = '[REDACTED]';
  if (requestBody.token) requestBody.token = '[REDACTED]';
  
  // Log the incoming request with comprehensive details
  // Temporarily disabled to prevent excessive logging that caused 8GB log files
  // logger.debug(`[API] Incoming ${method} ${path}`, {
  //   headers: {
  //     contentType: req.get('content-type'),
  //     authorization: req.get('authorization') ? '[PRESENT]' : '[MISSING]',
  //     userAgent: req.get('user-agent')
  //   },
  //   query: req.query,
  //   body: Object.keys(requestBody).length ? requestBody : undefined,
  //   params: req.params,
  //   ip: req.ip,
  //   sessionId: req.sessionID,
  //   authenticated: !!req.user,
  //   userId: req.user?.id
  // });
  
  // Capture the original response methods
  const originalJson = res.json;
  const originalSend = res.send;
  
  let responseBody: unknown;
  
  // Override json method
  res.json = function(body: unknown) {
    responseBody = body;
    return originalJson.apply(res, [body]);
  };
  
  // Override send method
  res.send = function(body: unknown) {
    responseBody = body;
    return originalSend.apply(res, [body]);
  };
  
  // Log response on completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Only log errors and warnings to prevent EIO issues
    // Skip successful requests in both development and production
    if (statusCode >= 400) {
      logger.warn(`[API] ${method} ${path} ${statusCode} ${duration}ms`);
      
      // Additional detailed logging for API routes with errors
      if (path.startsWith('/api')) {
        const logData = {
          statusCode,
          duration,
          responseSize: res.get('content-length') || 'unknown',
          contentType: res.get('content-type'),
          userId: req.user?.id,
          sessionId: (req as Request & { sessionID?: string }).sessionID
        };

        logger.error(`[API] Request failed: ${method} ${path}`, {
          ...logData,
          response: responseBody,
          requestBody: Object.keys(requestBody).length ? requestBody : undefined
        });
      }
    }
    // Remove all successful request logging to prevent EIO issues
  });
  
  next();
}

export function errorLogger(err: Error & { status?: number; statusCode?: number }, req: Request, res: Response, next: NextFunction) {
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