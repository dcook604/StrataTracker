import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Security headers for production
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // CSP is now handled by nginx/reverse proxy in production
  // Remove conflicting CSP headers to avoid conflicts
  
  // Remove server signature
  res.removeHeader('X-Powered-By');
  
  // Cache control for sensitive pages
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}

export function apiSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  // Request ID for tracking
  req.id = randomUUID();
  res.setHeader('X-Request-ID', req.id);
  
  // Content type validation for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return res.status(415).json({ message: 'Unsupported Media Type' });
    }
  }
  
  next();
} 