import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import express from 'express';
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage as dbStorage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { randomBytes } from "crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import logger from "./utils/logger";
import MemoryStore from 'memorystore';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

declare global {
  namespace Express {
    interface User extends SelectUser {
      is_admin?: boolean;  // Add support for snake_case format
      is_council_member?: boolean;
      is_user?: boolean;
    }
  }
}

// Extend express-session to include user
declare module "express-session" {
  interface SessionData {
    user?: SelectUser;
  }
}

// Create MemoryStore with TTL
const MemoryStoreSession = MemoryStore(session);

export const authMiddleware = express.Router();

// Security headers with Helmet
authMiddleware.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
    reportOnly: false,
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// Configure sessions
authMiddleware.use(session({
  secret: process.env.SESSION_SECRET || 'spectrum4-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: new MemoryStoreSession({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'lax'
  }
}));

// Authentication helper functions
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.user) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
}

export function requireAdminOrCouncil(req: Request, res: Response, next: NextFunction) {
  if (req.session?.user && (req.session.user.isAdmin || req.session.user.isCouncilMember)) {
    return next();
  }
  res.status(403).json({ message: 'Admin or council access required' });
}

export function setupAuth(app: Express) {
  // Apply security middlewares
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: "same-origin" }
  }));

  // Rate limiting to prevent brute force attacks
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 5 : 10, // Stricter in production
    message: "Too many login attempts, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    skip: (req) => {
      // Skip rate limiting for health checks and other internal calls
      return req.path === '/api/health';
    }
  });

  // Generate a secure session secret if one is not provided
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  
  // Warn if using generated secret in production
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    logger.warn('Using generated session secret. Set SESSION_SECRET environment variable for production!');
  }
  
  const sessionSettings: session.SessionOptions = {
    store: dbStorage.sessionStore,
    secret: sessionSecret,
    name: 'sessionId', // Don't use the default 'connect.sid'
    resave: false,
    saveUninitialized: false,
    rolling: true, // Refresh session with each request
    cookie: {
      maxAge: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30') * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES === 'true',
      sameSite: process.env.NODE_ENV === 'production' ? "strict" : "lax",
      path: "/",
      domain: undefined // Allow flexible domain configuration
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // GET all system settings
  app.get("/api/settings", ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const settings = await dbStorage.getAllSystemSettings();
      const logoSetting = settings.find(s => s.settingKey === 'strata_logo_url');
      let logoUrl = null;

      if (logoSetting && logoSetting.settingValue) {
        // Assuming the value is just the filename, construct a URL
        // In a real S3 setup, you'd generate a pre-signed URL here
        logoUrl = `/api/uploads/${logoSetting.settingValue}`;
      }

      res.json({ settings, logoUrl });
    } catch (error) {
      logger.error('Failed to get system settings:', error);
      res.status(500).json({ message: 'Failed to retrieve system settings' });
    }
  });
  
  // POST to update a specific system setting
  app.post("/api/settings/:key", ensureAuthenticated, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const userId = req.user?.id;

      if (typeof value === 'undefined' || !userId) {
        return res.status(400).json({ message: 'Value and user authentication are required.' });
      }

      await dbStorage.updateSystemSetting(key, value, userId);
      res.status(200).json({ message: `Setting ${key} updated successfully.` });
    } catch (error) {
      logger.error(`Failed to update system setting ${req.params.key}:`, error);
      res.status(500).json({ message: 'Failed to update system setting.' });
    }
  });

  // Multer setup for file uploads
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ storage: storage });

  app.post('/api/settings/upload-logo', ensureAuthenticated, requireAdmin, upload.single('logo'), async (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      await dbStorage.updateSystemSetting('strata_logo_url', req.file.filename, userId);
      res.status(200).json({ filename: req.file.filename });
    } catch (error) {
      logger.error('Failed to upload logo and update setting:', error);
      res.status(500).json({ message: 'Failed to upload logo' });
    }
  });

  // Configure Passport to use email as the username field
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        const authStartTime = Date.now();
        logger.info(`[AUTH] Login attempt started for email: ${email}`);
        
        try {
          // Get user by email
          logger.debug(`[AUTH] Looking up user by email`);
          let user = await dbStorage.getUserByEmail(email);
          
          if (!user) {
            logger.warn(`[AUTH] Login failed - User not found`, { email });
            logger.perf(`authentication_failed_no_user`, authStartTime, { email });
            return done(null, false, { message: "Invalid email or password" });
          }
          
          logger.debug(`[AUTH] User found, checking account status`, { 
            userId: user.id, 
            accountLocked: user.accountLocked,
            failedAttempts: user.failedLoginAttempts 
          });
          
          // Check if account is locked
          if (user.accountLocked) {
            logger.warn(`[AUTH] Login failed - Account locked`, { 
              userId: user.id, 
              email, 
              failedAttempts: user.failedLoginAttempts 
            });
            logger.perf(`authentication_failed_locked`, authStartTime, { userId: user.id });
            return done(null, false, { message: "Account locked due to too many failed attempts" });
          }
          
          try {
            // Check password
            logger.debug(`[AUTH] Verifying password for user`, { userId: user.id });
            const isMatch = await dbStorage.comparePasswords(password, user.password);
            
            if (!isMatch) {
              logger.warn(`[AUTH] Login failed - Invalid password`, { userId: user.id, email });
              // Increment failed attempts if available
              if (typeof dbStorage.incrementFailedLoginAttempts === 'function') {
                await dbStorage.incrementFailedLoginAttempts(user.id);
              }
              return done(null, false, { message: "Invalid email or password" });
            }
            
            // Reset failed attempts and update last login
          if (typeof dbStorage.resetFailedLoginAttempts === 'function') {
            await dbStorage.resetFailedLoginAttempts(user.id);
          }
          if (typeof dbStorage.updateLastLogin === 'function') {
            await dbStorage.updateLastLogin(user.id);
          }
          
          return done(null, user);
          } catch (error) {
            console.error("Error comparing passwords:", error);
            return done(error);
          }
        } catch (error) {
          console.error("Error in authentication:", error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      logger.debug(`[AUTH] DeserializeUser: Fetching user with id: ${id}`);
      const user = await dbStorage.getUser(id);
      if (!user) {
        logger.warn(`[AUTH] DeserializeUser: No user found with id: ${id}`);
        return done(null, false); // User not found, treat as unauthenticated
      }
      logger.debug(`[AUTH] DeserializeUser: User found, proceeding.`, { userId: user.id, email: user.email });
      return done(null, user); // User found
    } catch (error) {
      logger.error(`[AUTH] DeserializeUser: Error fetching user with id: ${id}`, { error });
      return done(error); // Pass error to Passport
    }
  });

  // Schema for registration with additional validation
  const registerSchema = z.object({
    email: z.string().email("Invalid email format"),
    username: z.string().min(1, "Username is required"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    fullName: z.string().min(2, "Full name is required"),
    isCouncilMember: z.boolean().optional(),
    isAdmin: z.boolean().optional(),
    isUser: z.boolean().optional(),
    forcePasswordChange: z.boolean().optional()
  });

  // Apply rate limiting to login route
  app.post("/api/login", loginLimiter, (req, res, next) => {
    const rememberMe = req.body.rememberMe === true;
    
    passport.authenticate("local", (err: Error, user: SelectUser | false, info: { message: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid email or password" });
      
      // Set session expiration based on remember me option
      try {
        if (req.session && req.session.cookie) {
          if (rememberMe) {
            // If remember me is checked, use longer session (1 day)
            req.session.cookie.maxAge = 1000 * 60 * 60 * 24;
          } else {
            // Otherwise use standard 30 minute timeout
            req.session.cookie.maxAge = 1000 * 60 * 30;
          }
        }
      } catch (error) {
        console.error("Error setting session cookie:", error);
        // Continue despite error
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remove sensitive fields before sending the user object
        const { password, failedLoginAttempts, passwordResetToken, passwordResetExpires, ...safeUser } = user;
        res.status(200).json(safeUser);
      });
    })(req, res, next);
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    // Remove sensitive fields before sending the user object
    const { password, failedLoginAttempts, passwordResetToken, passwordResetExpires, ...safeUser } = req.user;
    res.json(safeUser);
  });

  // Change password for the currently authenticated user
  app.post("/api/users/change-password", async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const changePasswordSchema = z.object({
        currentPassword: z.string(),
        newPassword: z.string()
          .min(8, "Password must be at least 8 characters")
          .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
          .regex(/[a-z]/, "Password must contain at least one lowercase letter")
          .regex(/[0-9]/, "Password must contain at least one number")
          .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
      });

      const validatedData = changePasswordSchema.parse(req.body);
      const userId = req.user.id;

      // Get user from DB to verify current password
      const user = await dbStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isMatch = await dbStorage.comparePasswords(validatedData.currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Incorrect current password" });
      }

      // Hash and update new password
      const hashedNewPassword = await dbStorage.hashPassword(validatedData.newPassword);
      await dbStorage.updateUserPassword(userId, hashedNewPassword);

      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error changing password:", error);
      next(error);
    }
  });

  // Forgot password
  // ... existing code ...

  // Admin-only user registration
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if the request is from an admin (supporting both camelCase and snake_case)
      if (!req.isAuthenticated() || !(req.user.isAdmin || req.user.is_admin)) {
        return res.status(403).json({ message: "Only administrators can register new users" });
      }

      // Validate request body
      const validatedData = registerSchema.parse(req.body);
      
      const existingUser = await dbStorage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await dbStorage.createUser(validatedData as any);

      // Remove sensitive fields before sending the user object
      const { password, failedLoginAttempts, passwordResetToken, passwordResetExpires, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  // Note: User management APIs have been moved to /routes/user-management.ts
  // This avoids route conflicts and provides better organization

  app.post("/api/logout", (req, res, next) => {
    // Store session ID for logging before destroying it
    const sessionId = req.sessionID;
    
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      
      // Destroy the session completely
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          // Continue even if session destroy fails
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid');
        
        res.status(200).json({ 
          success: true, 
          message: 'Logged out successfully' 
        });
      });
    });
  });
}

function getSafeUserData(user: any) {
  if (!user) return null;
  const { password, failedLoginAttempts, passwordResetToken, passwordResetExpires, ...safeUser } = user;
  return safeUser;
}
