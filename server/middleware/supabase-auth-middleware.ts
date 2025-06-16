import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase-client';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { profiles } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Initialize database connection
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'admin' | 'council' | 'user';
    isAdmin: boolean;
    isCouncilMember: boolean;
  };
}

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
    const userProfile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (userProfile.length === 0) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    const profile = userProfile[0];

    // Attach user info to request
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email || '',
      fullName: profile.fullName || '',
      role: profile.role as 'admin' | 'council' | 'user',
      isAdmin: profile.role === 'admin',
      isCouncilMember: profile.role === 'council',
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
  const user = (req as AuthenticatedRequest).user;
  
  if (!user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

/**
 * Middleware to require admin or council role
 */
export function requireAdminOrCouncil(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user?.isAdmin && !user?.isCouncilMember) {
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
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email || '',
        fullName: profile.fullName || '',
        role: profile.role as 'admin' | 'council' | 'user',
        isAdmin: profile.role === 'admin',
        isCouncilMember: profile.role === 'council',
      };
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue without user
  }
} 