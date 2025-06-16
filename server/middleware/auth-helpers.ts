import { Request, Response, NextFunction } from 'express';
import { storage as dbStorage } from '../storage';
import { AuthenticatedRequest } from './supabase-auth-middleware';

// Utility function to determine if a parameter is a UUID or integer ID
export function isUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// Helper function to get violation by ID or UUID
export async function getViolationByIdOrUuid(idOrUuid: string) {
  if (isUUID(idOrUuid)) {
    return await dbStorage.getViolationWithUnitByUuid(idOrUuid);
  } else {
    const id = parseInt(idOrUuid);
    if (isNaN(id)) {
      throw new Error("Invalid violation identifier");
    }
    return await dbStorage.getViolationWithUnit(id);
  }
}

// Ensure user is authenticated middleware (DEPRECATED - use authenticateUser from supabase-auth-middleware)
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthenticatedRequest).user;
  if (user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Ensure user is council member or admin middleware (DEPRECATED - use requireAdminOrCouncil from supabase-auth-middleware)
export const ensureCouncilMember = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthenticatedRequest).user;
  if (user && (user.isCouncilMember || user.isAdmin)) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin or Council access required" });
};

// Helper to ensure userId is present and return it (updated for Supabase UUIDs)
export function getUserId(req: Request, res: Response): string | undefined {
  const user = (req as AuthenticatedRequest).user;
  if (!user?.id) {
    res.status(401).json({ message: "User ID is required" });
    return undefined;
  }
  return user.id;
}

// Helper to get user information from authenticated request
export function getUser(req: Request): AuthenticatedRequest['user'] | undefined {
  return (req as AuthenticatedRequest).user;
}