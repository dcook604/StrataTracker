import express from 'express';
import { z } from 'zod';
import { storage as dbStorage } from '../storage.js';
// Note: Authentication now handled at route level in routes.ts
import { insertPropertyUnitSchema, propertyUnits, persons } from '#shared/schema.js';
import logger from '../utils/logger.js';
import { AuditLogger, AuditAction, TargetType } from '../audit-logger.js';
import { Router } from 'express';
import { db } from '../db.js';
import { eq, and, asc, isNull, or } from 'drizzle-orm';
import { requireAdmin } from '../middleware/supabase-auth-middleware.js';

const router = express.Router();

// --- UNIT MANAGEMENT API ---

// GET /api/units (paginated with search)
router.get("/", async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder, search } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const result = await dbStorage.getAllUnitsPaginated(
      pageNum,
      limitNum,
      sortBy as string | undefined,
      sortOrder as 'asc' | 'desc' | undefined,
      search as string | undefined
    );
    res.json(result);
  } catch (error: unknown) {
    logger.error("Failed to fetch units:", error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: "Failed to fetch units", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/units/:id/details
router.get("/:id/details", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid unit ID" });
    }
    const unitDetails = await dbStorage.getUnitWithPersonsAndFacilities(id);
    if (!unitDetails) {
      return res.status(404).json({ message: "Unit not found" });
    }
    res.json(unitDetails);
  } catch (error: unknown) {
    logger.error("Failed to fetch unit details:", error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: "Failed to fetch unit details", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/units/check-duplicate
router.get("/check-duplicate", async (req, res) => {
  try {
    const { unitNumber } = req.query;
    if (!unitNumber || typeof unitNumber !== 'string') {
      return res.status(400).json({ message: "Unit number is required" });
    }
    const existingUnit = await dbStorage.getPropertyUnitByUnitNumber(unitNumber);
    res.json({ isDuplicate: !!existingUnit });
  } catch (error: unknown) {
    logger.error("Failed to check duplicate unit number:", error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: "Failed to check duplicate unit number", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});


// --- PROPERTY UNITS (Legacy/Generic, might be merged with /units later) ---

// GET /api/property-units (gets all, not paginated)
router.get("/property-units", async (req, res) => {
    try {
      const units = await dbStorage.getAllPropertyUnits();
      res.json(units);
    } catch (error: unknown) {
      logger.error("Property units fetch error:", error instanceof Error ? error.message : 'Unknown error');
      res.json([]);
    }
});

// POST /api/property-units
router.post("/property-units", async (req, res) => {
    try {
      const unitData = insertPropertyUnitSchema.parse(req.body);
      const unit = await dbStorage.createPropertyUnit(unitData);
      
      // Log audit event
      await AuditLogger.logFromRequest(req, AuditAction.UNIT_CREATED, {
        targetType: TargetType.UNIT,
        targetId: unit.id.toString(),
        details: {
          unitNumber: unit.unitNumber,
          floor: unit.floor,
          ownerName: unit.ownerName,
        },
      });
      
      res.status(201).json(unit);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create property unit" });
    }
});

// NOTE: We need to find the PUT and DELETE endpoints for units and move them here.

// PATCH /api/units/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid unit ID" });
    }
    
    // The payload for updating unit, persons, and facilities comes from the client
    const { unitData, persons, facilities } = req.body;
    
    const updatedUnit = await dbStorage.updateUnitWithPersonsAndFacilities(id, unitData, persons, facilities);
    
    // Log audit event
    await AuditLogger.logFromRequest(req, AuditAction.UNIT_UPDATED, {
      targetType: TargetType.UNIT,
      targetId: id.toString(),
      details: {
        unitData: unitData,
        personsCount: persons?.length || 0,
        facilitiesCount: facilities?.length || 0,
      },
    });
    
    res.json(updatedUnit);
  } catch (error: unknown) {
    logger.error(`[API] Failed to update unit ${req.params.id}:`, error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: "Failed to update unit", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// DELETE /api/units/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid unit ID" });
    }
    
    // Get unit details before deletion for audit log
    const unitToDelete = await dbStorage.getPropertyUnit(id);
    
    await dbStorage.deleteUnit(id);
    
    // Log audit event
    if (unitToDelete) {
      await AuditLogger.logFromRequest(req, AuditAction.UNIT_DELETED, {
        targetType: TargetType.UNIT,
        targetId: id.toString(),
        details: {
          unitNumber: unitToDelete.unitNumber,
          floor: unitToDelete.floor,
          ownerName: unitToDelete.ownerName,
        },
      });
    }
    
    res.status(204).send();
  } catch (error: unknown) {
    logger.error(`[API] Failed to delete unit ${req.params.id}:`, error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: "Failed to delete unit", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/units/count (publicly accessible)
router.get("/count", async (req, res) => {
  try {
    const units = await dbStorage.getAllPropertyUnits();
    res.json({ total: units.length });
  } catch (error: unknown) {
    logger.error("Failed to fetch unit count:", error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: "Failed to fetch unit count", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router; 