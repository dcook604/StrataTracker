import express from 'express';
import { storage as dbStorage } from '../storage';
import { ensureAuthenticated } from '../middleware/auth-helpers';
import { generateViolationsPdf } from '../pdfGenerator';
import { format } from 'date-fns';
import logger from '../utils/logger';

const router = express.Router();

// --- REPORTING API ---

// GET /api/reports/violations-pdf
router.get("/violations-pdf", ensureAuthenticated, async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

    let categoryName: string | undefined = undefined;
    if (categoryId) {
        const category = await dbStorage.getViolationCategory(categoryId);
        categoryName = category?.name;
    }

    const dbFilters = { from, to, categoryId };
    const pdfFilters = { fromDate: from, toDate: to, categoryName };

    const violations = await dbStorage.getFilteredViolationsForReport(dbFilters);
    const stats = await dbStorage.getViolationStats(dbFilters);
    
    generateViolationsPdf(stats, violations, pdfFilters, res);
    
  } catch (error: any) {
    logger.error("[API] Failed to generate PDF report:", error);
    res.status(500).json({ message: "Failed to generate PDF report", details: error.message });
  }
});

// GET /api/reports/violations-csv
router.get("/violations-csv", ensureAuthenticated, async (req, res) => {
  try {
    const filters = {
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
    };

    const violations = await dbStorage.getFilteredViolationsForReport(filters);

    const escapeCsv = (data: any) => {
      if (data === null || data === undefined) return "";
      const str = String(data);
      if (str.includes(',')) return `"${str}"`;
      return str;
    };
    
    // FIX: Removed 'Reported By' as the data is not available in this query.
    const header = "ID,UUID,Unit,Status,Type,Date,Fine\n";
    const csvRows = violations.map(v => {
      return [
        v.id,
        v.uuid,
        v.unit.unitNumber,
        v.status,
        escapeCsv(v.violationType),
        format(new Date(v.violationDate), "yyyy-MM-dd"),
        v.fineAmount || 0,
      ].join(",");
    });
    
    const csv = header + csvRows.join("\n");
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="violations.csv"');
    res.status(200).end(csv);

  } catch (error: any) {
    logger.error("[API] Failed to generate CSV report:", error);
    res.status(500).json({ message: "Failed to generate CSV report", details: error.message });
  }
});

// GET /api/reports/stats
router.get("/stats", ensureAuthenticated, async (req, res) => {
  try {
    const stats = await dbStorage.getViolationStats();
    res.json(stats);
  } catch (error) {
    logger.error("Failed to fetch violation stats:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});


export default router; 