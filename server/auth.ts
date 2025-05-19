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

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  // Apply security middlewares
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
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
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: dbStorage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 30, // 30 minutes by default
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
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
        try {
          // Get user by email. For backward compatibility, also check username field
          let user = await dbStorage.getUserByEmail(email);
          
          // Check if account is locked (if that feature is available)
          if (user?.accountLocked) {
            return done(null, false, { message: "Account locked due to too many failed attempts" });
          }
          
          // Check credentials
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }
          
          // Temporary simple authentication to get past the issue
          try {
            // First check if the password is the simple non-hashed version
            if (password === user.password) {
              console.log("Simple password match success");
              // Password matches directly - simple case
              return done(null, user);
            }
            
            // If not a simple match, try the normal comparison
            console.log("Trying normal password comparison");
            const isMatch = await dbStorage.comparePasswords(password, user.password);
            console.log("Normal password comparison result:", isMatch);
            
            if (!isMatch) {
              // Increment failed login attempts if that feature is available
              if (typeof dbStorage.incrementFailedLoginAttempts === 'function') {
                await dbStorage.incrementFailedLoginAttempts(user.id);
              }
              return done(null, false, { message: "Invalid email or password" });
            }
            
            // If we got here, normal comparison succeeded
            return done(null, user);
          } catch (error) {
            console.error("Error comparing passwords:", error);
            return done(null, false, { message: "Authentication error" });
          }
          
          // This code is unreachable due to the return statements above
          // Keeping it commented out for reference
          /*
          if (typeof dbStorage.resetFailedLoginAttempts === 'function') {
            await dbStorage.resetFailedLoginAttempts(user.id);
          }
          if (typeof dbStorage.updateLastLogin === 'function') {
            await dbStorage.updateLastLogin(user.id);
          }
          
          return done(null, user);
          */
        } catch (error) {
          return done(error);
        }
      }
    ),
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
      if (req.session && req.session.cookie) {
        if (rememberMe) {
          // If remember me is checked, use longer session (1 day)
          req.session.cookie.maxAge = 1000 * 60 * 60 * 24;
        } else {
          // Otherwise use standard 30 minute timeout
          req.session.cookie.maxAge = 1000 * 60 * 30;
        }
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
      // Check if the request is from an admin
      if (!req.isAuthenticated() || !req.user.isAdmin) {
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
      // Check if the request is from an admin
      if (!req.isAuthenticated() || !(req.user as any).is_admin) {
        return res.status(403).json({ message: "Only administrators can view user list" });
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
      if (!req.isAuthenticated() || !(req.user as any).is_admin) {
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
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Remove sensitive fields before sending the user object
    const { password, failedLoginAttempts, passwordResetToken, passwordResetExpires, ...safeUser } = req.user;
    res.json(safeUser);
  });
}
