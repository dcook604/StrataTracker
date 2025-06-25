import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase-client.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { profiles, Profile } from '#shared/schema.js';
import { eq } from 'drizzle-orm';
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
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile from our database
    const profileResult = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (profileResult.length === 0) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    const profile = profileResult[0];

    // Attach combined user info to request
    (req as AuthenticatedRequest).appUser = {
      ...user,
      profile: profile,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
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
    const userProfile = await db
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
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue without user
  }
} 