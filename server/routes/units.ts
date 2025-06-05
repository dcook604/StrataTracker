import express from 'express';
import { z } from 'zod';
import { storage as dbStorage } from '../storage';
import { ensureAuthenticated } from '../middleware/auth-helpers';
import { insertPropertyUnitSchema } from '@shared/schema';
import logger from '../utils/logger';

const router = express.Router();

// --- UNIT MANAGEMENT API ---

// GET /api/units (paginated)
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const { page, limit, sortBy, sortOrder } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const result = await dbStorage.getAllUnitsPaginated(
      pageNum,
      limitNum,
      sortBy as string | undefined,
      sortOrder as 'asc' | 'desc' | undefined
    );
    res.json(result);
  } catch (error: any) {
    logger.error("Failed to fetch units:", error);
    res.status(500).json({ message: "Failed to fetch units", details: error.message });
  }
});

// GET /api/units/:id/details
router.get("/:id/details", ensureAuthenticated, async (req, res) => {
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
  } catch (error: any) {
    logger.error("Failed to fetch unit details:", error);
    res.status(500).json({ message: "Failed to fetch unit details", details: error.message });
  }
});

// GET /api/units/check-duplicate
router.get("/check-duplicate", ensureAuthenticated, async (req, res) => {
  try {
    const { unitNumber } = req.query;
    if (!unitNumber || typeof unitNumber !== 'string') {
      return res.status(400).json({ message: "Unit number is required" });
    }
    const existingUnit = await dbStorage.getPropertyUnitByUnitNumber(unitNumber);
    res.json({ isDuplicate: !!existingUnit });
  } catch (error: any) {
    logger.error("Failed to check duplicate unit number:", error);
    res.status(500).json({ message: "Failed to check duplicate unit number", details: error.message });
  }
});


// --- PROPERTY UNITS (Legacy/Generic, might be merged with /units later) ---

// GET /api/property-units (gets all, not paginated)
router.get("/property-units", ensureAuthenticated, async (req, res) => {
    try {
      const units = await dbStorage.getAllPropertyUnits();
      res.json(units);
    } catch (error) {
      logger.error("Property units fetch error:", error);
      res.json([]);
    }
});

// POST /api/property-units
router.post("/property-units", ensureAuthenticated, async (req, res) => {
    try {
      const unitData = insertPropertyUnitSchema.parse(req.body);
      const unit = await dbStorage.createPropertyUnit(unitData);
      res.status(201).json(unit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create property unit" });
    }
});

// NOTE: We need to find the PUT and DELETE endpoints for units and move them here.

// PATCH /api/units/:id
router.patch("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid unit ID" });
    }
    
    // The payload for updating unit, persons, and facilities comes from the client
    const { unitData, persons, facilities } = req.body;
    
    const updatedUnit = await dbStorage.updateUnitWithPersonsAndFacilities(id, unitData, persons, facilities);
    
    res.json(updatedUnit);
  } catch (error: any) {
    logger.error(`[API] Failed to update unit ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to update unit", details: error.message });
  }
});

// DELETE /api/units/:id
router.delete("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid unit ID" });
    }
    
    await dbStorage.deleteUnit(id);
    
    res.status(204).send();
  } catch (error: any) {
    logger.error(`[API] Failed to delete unit ${req.params.id}:`, error);
    res.status(500).json({ message: "Failed to delete unit", details: error.message });
  }
});

// GET /api/units/count (publicly accessible)
router.get("/count", async (req, res) => {
  try {
    const units = await dbStorage.getAllPropertyUnits();
    res.json({ total: units.length });
  } catch (error: any) {
    logger.error("Failed to fetch unit count:", error);
    res.status(500).json({ message: "Failed to fetch unit count", details: error.message });
  }
});

export default router; 