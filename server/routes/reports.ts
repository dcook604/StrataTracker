import express from 'express';
import { storage as dbStorage } from '../storage.js';
import { generateViolationsPdf } from '../pdfGenerator.js';
import { format } from 'date-fns';
import logger from '../utils/logger.js';

const router = express.Router();

// TEST ENDPOINT
router.get("/test", (req, res) => {
  res.json({ message: "Reports router working!" });
});

// --- REPORTING API ---

// GET /api/reports/violations-pdf - TEMPORARILY DISABLED
// router.get("/violations-pdf", async (req, res) => {
//   try {
//     const from = req.query.from ? new Date(req.query.from as string) : undefined;
//     const to = req.query.to ? new Date(req.query.to as string) : undefined;
//     const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

//     let categoryName: string | undefined = undefined;
//     if (categoryId) {
//         const category = await dbStorage.getViolationCategory(categoryId);
//         categoryName = category?.name;
//     }

//     const dbFilters = { from, to, categoryId };
//     const pdfFilters = { fromDate: from, toDate: to, categoryName };

//     const violations = await dbStorage.getFilteredViolationsForReport(dbFilters);
//     const stats = await dbStorage.getViolationStats(dbFilters);
    
//     generateViolationsPdf(stats, violations, pdfFilters, res);
    
//   } catch (error: unknown) {
//     logger.error("[API] Failed to generate PDF report:", error instanceof Error ? error.message : 'Unknown error');
//     res.status(500).json({ message: "Failed to generate PDF report", details: error instanceof Error ? error.message : 'Unknown error' });
//   }
// });

// GET /api/reports/violations-csv
router.get("/violations-csv", async (req, res) => {
  try {
    const filters = {
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
    };

    const violations = await dbStorage.getFilteredViolationsForReport(filters);

    const escapeCsv = (data: unknown) => {
      if (data === null || data === undefined) return "";
      const str = String(data);
      if (str.includes(',')) return `"${str}"`;
      return str;
    };
    
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

  } catch (error: unknown) {
    logger.error("[API] Failed to generate CSV report:", error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: "Failed to generate CSV report", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/reports/stats
router.get("/stats", async (req, res) => {
  try {
    const filters = {
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
    };
    
    // Fetch all the data the frontend expects in parallel
    const [stats, violationsByMonth, violationsByType] = await Promise.all([
      dbStorage.getViolationStats(filters),
      dbStorage.getViolationsByMonth(filters),
      dbStorage.getViolationsByType(filters)
    ]);
    
    // Return combined data matching the frontend's CombinedReportData interface
    res.json({
      stats,
      violationsByMonth,
      violationsByType
    });
  } catch (error: unknown) {
    logger.error("Failed to fetch violation stats:", error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// GET /api/reports/repeat-violations
router.get("/repeat-violations", async (req, res) => {
  try {
    const minCount = req.query.minCount ? parseInt(req.query.minCount as string) : 2;
    const repeatViolations = await dbStorage.getRepeatViolations(minCount);
    res.json(repeatViolations);
  } catch (error: unknown) {
    logger.error("Failed to fetch repeat violations:", error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: "Failed to fetch repeat violations", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/reports/violations-by-month
router.get("/violations-by-month", async (req, res) => {
  try {
    const filters = {
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
    };
    const violationsByMonth = await dbStorage.getViolationsByMonth(filters);
    res.json(violationsByMonth);
  } catch (error: unknown) {
    logger.error("Failed to fetch violations by month:", error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: "Failed to fetch violations by month", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/reports/violations-by-type
router.get("/violations-by-type", async (req, res) => {
  try {
    const filters = {
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
    };
    const violationsByType = await dbStorage.getViolationsByType(filters);
    res.json(violationsByType);
  } catch (error: unknown) {
    logger.error("Failed to fetch violations by type:", error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: "Failed to fetch violations by type", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/reports/monthly-fines
router.get("/monthly-fines", async (req, res) => {
  try {
    const filters = {
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
    };
    const monthlyFines = await dbStorage.getMonthlyFines(filters);
    res.json(monthlyFines);
  } catch (error: unknown) {
    logger.error("Failed to fetch monthly fines:", error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: "Failed to fetch monthly fines", details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router; 