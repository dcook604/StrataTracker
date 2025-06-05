import { Request, Response, NextFunction } from 'express';
import { storage as dbStorage } from '../storage';

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

// Ensure user is authenticated middleware
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Ensure user is council member or admin middleware
export const ensureCouncilMember = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && req.user && (req.user.isCouncilMember || req.user.isAdmin)) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin or Council access required" });
};

// Helper to ensure userId is present and return it
export function getUserId(req: Request, res: Response): number | undefined {
  if (typeof req.user?.id !== "number") {
    res.status(401).json({ message: "User ID is required" });
    return undefined;
  }
  return req.user.id;
} 