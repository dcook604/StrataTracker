import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase-client.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { profiles, Profile } from '#shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import { User } from '@supabase/supabase-js';

// Define the shape of our application user, combining Supabase user and our profile
export type AppUser = User & { profile: Profile };

// Extend Express Request to include our custom user object
export interface AuthenticatedRequest extends Request {
  appUser: AppUser;
}

// Initialize database connection
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

/**
 * Middleware to authenticate requests using Supabase JWT
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    console.log(`[AuthMiddleware] Path: ${req.path}. Auth header present: ${!!authHeader}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[AuthMiddleware] Failed: Missing or invalid authorization header.');
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
        console.error(`[AuthMiddleware] Supabase getUser returned an error: ${error.message}`, { status: error.status });
        // It's useful to know what kind of error it is
        return res.status(error.status || 401).json({ error: 'Invalid token', details: error.message });
    }

    if (!user) {
      console.error('[AuthMiddleware] Failed: Supabase returned no user and no error.');
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log(`[AuthMiddleware] Supabase user found for token: ${user.email}`);

    // Production health check: Verify database connection
    if (process.env.NODE_ENV === 'production') {
      try {
        await db.execute(sql`SELECT 1`);
      } catch (dbError) {
        console.error(`[AuthMiddleware] Database connectivity issue in production:`, dbError);
        return res.status(503).json({ error: 'Database temporarily unavailable' });
      }
    }

    // Get user profile from our database
    let profileResult = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    let profile: Profile;

    if (profileResult.length === 0) {
      console.log(`[AuthMiddleware] Profile not found for user ${user.email} (${user.id}). Auto-creating...`);
      
      try {
        // Auto-create profile for new Supabase user
        const newProfile = {
          id: user.id,
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          role: 'user' as const, // Default role
          updatedAt: new Date(),
        };

        const [createdProfile] = await db
          .insert(profiles)
          .values(newProfile)
          .returning();

        profile = createdProfile;
        console.log(`[AuthMiddleware] ✅ Profile auto-created for ${user.email} with role: ${profile.role}`);
        
        // Production notification for profile creation
        if (process.env.NODE_ENV === 'production') {
          console.warn(`[PRODUCTION] Auto-created profile for new user: ${user.email} (${user.id})`);
        }
      } catch (createError) {
        console.error(`[AuthMiddleware] Failed to auto-create profile for ${user.email}:`, createError);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }
    } else {
      profile = profileResult[0];
      console.log(`[AuthMiddleware] Profile found for ${user.email}, role: ${profile.role}`);
    }

    // Attach combined user info to request
    (req as AuthenticatedRequest).appUser = {
      ...user,
      profile: profile,
    };

    next();
  } catch (error) {
    console.error('[AuthMiddleware] A critical error occurred in the authentication middleware:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const request = req as AuthenticatedRequest;
  if (request.appUser?.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

/**
 * Middleware to require admin or council role
 */
export function requireAdminOrCouncil(req: Request, res: Response, next: NextFunction) {
  const request = req as AuthenticatedRequest;
  const role = request.appUser?.profile?.role;
  if (role !== 'admin' && role !== 'council') {
    return res.status(403).json({ error: 'Admin or council access required' });
  }
  
  next();
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return next(); // Continue without user
    }

    // Get user profile
    let userProfile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (userProfile.length > 0) {
      const profile = userProfile[0];
      (req as AuthenticatedRequest).appUser = {
        ...user,
        profile: profile,
      };
    } else {
      // Auto-create profile for optional auth as well
      try {
        const newProfile = {
          id: user.id,
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          role: 'user' as const,
          updatedAt: new Date(),
        };

        const [createdProfile] = await db
          .insert(profiles)
          .values(newProfile)
          .returning();

        console.log(`[OptionalAuth] Profile auto-created for ${user.email} with role: ${createdProfile.role}`);
        
        (req as AuthenticatedRequest).appUser = {
          ...user,
          profile: createdProfile,
        };
      } catch (createError) {
        console.error(`[OptionalAuth] Failed to auto-create profile for ${user.email}:`, createError);
        // For optional auth, we don't fail - just continue without the profile
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue without user
  }
} 