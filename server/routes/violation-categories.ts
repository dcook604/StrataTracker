import express from 'express';
import { storage as dbStorage } from '../storage';
// Note: Authentication now handled at route level in routes.ts
import logger from '../utils/logger';

const router = express.Router();

// --- VIOLATION CATEGORIES API ---

// GET /api/violation-categories
router.get("/", async (req, res) => {
    try {
      const categories = await dbStorage.getAllViolationCategories();
      res.json(categories);
    } catch (error) {
      logger.error("Failed to fetch violation categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
});

// POST /api/violation-categories
router.post("/", async (req, res) => {
    try {
      const category = await dbStorage.createViolationCategory({ name: req.body.name });
      res.status(201).json(category);
    } catch (error) {
      logger.error("Failed to create violation category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
});

// PUT /api/violation-categories/:id
router.put("/:id", async (req, res) => {
    try {
      const category = await dbStorage.updateViolationCategory(parseInt(req.params.id), { name: req.body.name });
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      logger.error("Failed to update violation category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
});

// DELETE /api/violation-categories/:id
router.delete("/:id", async (req, res) => {
    try {
      const success = await dbStorage.deleteViolationCategory(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.status(204).send();
    } catch (error) {
      logger.error("Failed to delete violation category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
});

export default router; 