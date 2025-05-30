import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage as dbStorage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { randomBytes } from "crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import logger from "./utils/logger";

declare global {
  namespace Express {
    interface User extends SelectUser {
      is_admin?: boolean;  // Add support for snake_case format
      is_council_member?: boolean;
      is_user?: boolean;
    }
  }
}

export function setupAuth(app: Express) {
  // Apply security middlewares
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://replit.com"],
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
    max: 10, // Limit each IP to 10 login requests per window
    message: "Too many login attempts, please try again after 15 minutes",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Generate a secure session secret if one is not provided
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  
  const sessionSettings: session.SessionOptions = {
    store: dbStorage.sessionStore,
    secret: sessionSecret,
    name: 'sessionId', // Don't use the default 'connect.sid'
    resave: false,
    saveUninitialized: false,
    rolling: true, // Refresh session with each request
    cookie: {
      maxAge: 1000 * 60 * 30, // 30 minutes by default
      httpOnly: true,
      secure: false, // Set to false for Replit compatibility
      sameSite: "lax",
      path: "/",
      domain: undefined // Remove domain restriction for Replit
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

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
      const user = await dbStorage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Schema for registration with additional validation
  const registerSchema = insertUserSchema.extend({
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    email: z.string().email("Invalid email format"),
    fullName: z.string().min(2, "Full name is required")
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

      const user = await dbStorage.createUser(validatedData);

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

  // User management APIs (admin only)
  app.get("/api/users", async (req, res, next) => {
    try {
      // Check if user is authenticated and is an admin
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Check both isAdmin and is_admin flags to support both formats
      const isAdmin = req.user.isAdmin === true || (req.user as any).is_admin === true;
      if (!isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await dbStorage.getAllUsers();
      
      // Remove sensitive information before sending
      const safeUsers = users.map(user => {
        const { password, failedLoginAttempts, passwordResetToken, passwordResetExpires, ...safeUser } = user;
        return safeUser;
      });
      
      res.json(safeUsers);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:id", async (req, res, next) => {
    try {
      // Check if the request is from an admin
      if (!req.isAuthenticated() || !(req.user as any).is_admin) {
        return res.status(403).json({ message: "Only administrators can update users" });
      }

      const userId = parseInt(req.params.id, 10);
      
      // Don't allow changing email to one that already exists
      if (req.body.email) {
        const existingUser = await dbStorage.getUserByEmail(req.body.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }
      
      const updatedUser = await dbStorage.updateUser(userId, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove sensitive fields before sending the user object
      const { password, failedLoginAttempts, passwordResetToken, passwordResetExpires, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/users/:id", async (req, res, next) => {
    try {
      // Check if the request is from an admin
      if (!req.isAuthenticated() || !(req.user.isAdmin || (req.user as any).is_admin)) {
        return res.status(403).json({ message: "Only administrators can delete users" });
      }

      const userId = parseInt(req.params.id, 10);
      
      // Don't allow admins to delete themselves
      if (req.user.id === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const deleted = await dbStorage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    // Log the logout attempt for security monitoring
    console.log(`[AUTH] Logout attempt for user: ${req.user?.email || 'unknown'} (ID: ${req.user?.id || 'none'})`);
    
    // Store session ID for logging before destroying it
    const sessionId = req.sessionID;
    
    req.logout((err) => {
      if (err) {
        console.error(`[AUTH] Logout error for session ${sessionId}:`, err);
        return next(err);
      }
      
      // Destroy the session completely
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error(`[AUTH] Session destroy error for ${sessionId}:`, destroyErr);
          // Continue even if session destroy fails
        }
        
        // Clear the session cookie explicitly
        res.clearCookie('sessionId', { 
          path: '/',
          httpOnly: true,
          secure: false, // Set to true in production with HTTPS
          sameSite: 'lax'
        });
        
        console.log(`[AUTH] Logout successful for session ${sessionId}`);
        res.status(200).json({ 
          message: "Logged out successfully",
          timestamp: new Date().toISOString()
        });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("Auth check - session:", !!req.session);
    console.log("Auth check - session ID:", req.session?.id || 'none');
    console.log("Auth check - isAuthenticated:", req.isAuthenticated());
    console.log("Auth check - user:", !!req.user);
    
    if (!req.isAuthenticated()) {
      console.log("User not authenticated, returning 401");
      return res.sendStatus(401);
    }
    
    // Remove sensitive fields before sending the user object
    const { password, failedLoginAttempts, passwordResetToken, passwordResetExpires, ...safeUser } = req.user;
    console.log("Auth check successful, returning user:", safeUser.email);
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
}
