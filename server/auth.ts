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

// Update the User type to match database schema
type SafeUser = Omit<SelectUser, 'password' | 'failedLoginAttempts' | 'passwordResetToken' | 'passwordResetExpires'>;

declare global {
  namespace Express {
    interface User extends SafeUser {
      accountLocked: boolean | undefined;
    }
  }
}

// Helper function to convert database user to Express.User
function toExpressUser(dbUser: SelectUser | undefined): Express.User | false {
  if (!dbUser) return false;
  
  const { 
    password,
    failedLoginAttempts,
    passwordResetToken,
    passwordResetExpires,
    ...safeUser 
  } = dbUser;
  
  return {
    ...safeUser,
    accountLocked: dbUser.accountLocked === null ? undefined : dbUser.accountLocked
  };
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

  // Configure session middleware
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new session.MemoryStore(), // Using MemoryStore for development
    cookie: {
      maxAge: 1000 * 60 * 30, // 30 minutes by default
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };

  // Add a comment explaining the session store choice
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      'Warning: Using MemoryStore for sessions. This is not suitable for production. ' +
      'Consider using connect-pg-simple or another production-ready session store.'
    );
  }

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
          let user = await dbStorage.getUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Check if account is locked
          if (user.accountLocked) {
            return done(null, false, { message: "Account locked due to too many failed attempts" });
          }
          
          // Verify password
          const isMatch = await dbStorage.comparePasswords(password, user.password);
          
          if (!isMatch) {
            if (typeof dbStorage.incrementFailedLoginAttempts === 'function') {
              await dbStorage.incrementFailedLoginAttempts(user.id);
            }
            return done(null, false, { message: "Invalid email or password" });
          }

          // Update last login time
          await dbStorage.updateLastLogin(user.id);
          
          // Get the updated user with new last login time
          user = await dbStorage.getUser(user.id);
          
          return done(null, toExpressUser(user));
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await dbStorage.getUser(id);
      done(null, toExpressUser(user));
    } catch (error) {
      done(error);
    }
  });

  // Apply rate limiting to login route
  app.post("/api/login", loginLimiter, (req, res, next) => {
    const rememberMe = req.body.rememberMe === true;
    
    passport.authenticate("local", async (err: Error, user: Express.User | false, info: { message: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid email or password" });
      
      try {
        // Update last login timestamp directly in database
        await dbStorage.updateLastLogin(user.id);

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
          // Update the user object with new last login time
          const updatedUser = {
            ...user,
            lastLogin: new Date()
          };
          res.status(200).json(updatedUser);
        });
      } catch (error) {
        console.error("Error updating last login:", error);
        // Continue with login despite error updating timestamp
        req.login(user, (err) => {
          if (err) return next(err);
          res.status(200).json(user);
        });
      }
    })(req, res, next);
  });

  // Admin-only user registration
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if the request is from an admin
      if (!req.isAuthenticated() || !(req.user.isAdmin || (req.user as any).is_admin)) {
        return res.status(403).json({ message: "Only administrators can register new users" });
      }

      // Validate request body
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await dbStorage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await dbStorage.createUser(validatedData);
      const expressUser = toExpressUser(user);
      
      if (!expressUser) {
        return res.status(500).json({ message: "Failed to create user" });
      }
      
      res.status(201).json(expressUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
}
