import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { HelmetOptions } from 'helmet';

// Security configuration for production
export const securityConfig = {
  // Rate limiting configuration
  rateLimiting: {
    // General API rate limiting
    api: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 100 : 200,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/api/health'
    }),
    
    // Strict rate limiting for authentication endpoints
    auth: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 5 : 10,
      message: 'Too many login attempts, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true
    }),
    
    // File upload rate limiting
    upload: rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 uploads per minute
      message: 'Too many file uploads, please wait before uploading again.',
      standardHeaders: true,
      legacyHeaders: false
    })
  },

  // Helmet security headers configuration
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for React dev tools
          "'unsafe-eval'"   // Required for React dev mode
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:"
        ],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false, // Disable for compatibility
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    referrerPolicy: { policy: ["origin", "unsafe-url"] }
  } as HelmetOptions,

  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CORS_ORIGIN?.split(',') || false
      : true,
    credentials: true,
    optionsSuccessStatus: 200
  },

  // Session security configuration
  session: {
    cookie: {
      secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES === 'true',
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30') * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' as const : 'lax' as const
    },
    name: 'stratatracker_session',
    secret: process.env.SESSION_SECRET || '',
    resave: false,
    saveUninitialized: false,
    rolling: true
  },

  // File upload security
  upload: {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 5, // Maximum 5 files per request
      fieldSize: 1024 * 1024 // 1MB field size limit
    },
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf'
    ],
    allowedExtensions: [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.pdf'
    ]
  }
};

// Validate security configuration
export function validateSecurityConfig() {
  const errors: string[] = [];

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      errors.push('SESSION_SECRET must be at least 32 characters in production');
    }

    if (!process.env.CORS_ORIGIN) {
      errors.push('CORS_ORIGIN must be set in production');
    }

    if (process.env.SECURE_COOKIES !== 'true') {
      errors.push('SECURE_COOKIES should be true in production');
    }

    if (!process.env.TRUST_PROXY) {
      errors.push('TRUST_PROXY should be set when using reverse proxy');
    }
  }

  return errors;
} 