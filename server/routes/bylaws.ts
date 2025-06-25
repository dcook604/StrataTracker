import { db } from "../db.js";
import { 
  bylaws, 
  bylawCategories,
  bylawCategoryLinks,
  bylawRevisions,
  profiles,
  insertBylawSchema,
  insertBylawCategorySchema
} from "#shared/schema.js";
import { requireAdminOrCouncil } from "../middleware/supabase-auth-middleware.js";
import { AuditLogger, AuditAction, TargetType } from '../audit-logger.js';
import { parseXMLBylaws, importSpectrumBylaws } from '../utils/bylawsImporter.js';
import fs from "fs/promises";
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { and, eq, like, or, desc, asc, inArray } from 'drizzle-orm';
import { AuthenticatedRequest } from '../middleware/supabase-auth-middleware.js';

const router = express.Router();

// Configure multer for XML file uploads
const upload = multer({
  dest: "uploads/temp/",
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/xml" || file.mimetype === "application/xml" || file.originalname.endsWith(".xml")) {
      cb(null, true);
    } else {
      cb(new Error("Only XML files are allowed"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Use the middleware from supabase-auth-middleware instead
const ensureCouncilOrAdmin = requireAdminOrCouncil;

// BYLAW CATEGORIES ROUTES

// Get all bylaw categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await db
      .select()
      .from(bylawCategories)
      .where(eq(bylawCategories.isActive, true))
      .orderBy(asc(bylawCategories.displayOrder));

    res.json(categories);
  } catch (error: unknown) {
    console.error('Error fetching bylaw categories:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to fetch bylaw categories' });
  }
});

// Create bylaw category (admin/council only)
router.post('/categories', ensureCouncilOrAdmin, async (req, res) => {
  try {
    const data = insertBylawCategorySchema.parse(req.body);

    const [category] = await db
      .insert(bylawCategories)
      .values(data)
      .returning();

    res.status(201).json(category);
  } catch (error: unknown) {
    console.error('Error creating bylaw category:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to create bylaw category' });
  }
});

// BYLAWS ROUTES

// Get all bylaws with optional filtering
router.get('/', async (req, res) => {
  try {
    const { category, search, part } = req.query;
    
    // Build where conditions
    const whereConditions = [eq(bylaws.isActive, true)];

    // Add search filter
    if (search && typeof search === 'string') {
      whereConditions.push(
        or(
          like(bylaws.title, `%${search}%`),
          like(bylaws.content, `%${search}%`),
          like(bylaws.sectionNumber, `%${search}%`)
        )!
      );
    }

    // Add part filter
    if (part && typeof part === 'string') {
      whereConditions.push(eq(bylaws.partNumber, part));
    }

    let query = db
      .select({
        id: bylaws.id,
        uuid: bylaws.uuid,
        sectionNumber: bylaws.sectionNumber,
        title: bylaws.title,
        content: bylaws.content,
        parentSectionId: bylaws.parentSectionId,
        sectionOrder: bylaws.sectionOrder,
        partNumber: bylaws.partNumber,
        partTitle: bylaws.partTitle,
        isActive: bylaws.isActive,
        effectiveDate: bylaws.effectiveDate,
        createdAt: bylaws.createdAt,
        updatedAt: bylaws.updatedAt,
        createdBy: {
          id: profiles.id,
          fullName: profiles.fullName
        }
      })
      .from(bylaws)
      .leftJoin(profiles, eq(bylaws.createdById, profiles.id))
      .where(and(...whereConditions));

    // Add category filter if specified
    if (category && typeof category === 'string') {
      const categoryId = parseInt(category);
      if (!isNaN(categoryId)) {
        const bylawIds = await db
          .select({ bylawId: bylawCategoryLinks.bylawId })
          .from(bylawCategoryLinks)
          .where(eq(bylawCategoryLinks.categoryId, categoryId));
        
        if (bylawIds.length > 0) {
          whereConditions.push(inArray(bylaws.id, bylawIds.map(l => l.bylawId)));
          // Re-run query with category filter
          query = db
            .select({
              id: bylaws.id,
              uuid: bylaws.uuid,
              sectionNumber: bylaws.sectionNumber,
              title: bylaws.title,
              content: bylaws.content,
              parentSectionId: bylaws.parentSectionId,
              sectionOrder: bylaws.sectionOrder,
              partNumber: bylaws.partNumber,
              partTitle: bylaws.partTitle,
              isActive: bylaws.isActive,
              effectiveDate: bylaws.effectiveDate,
              createdAt: bylaws.createdAt,
              updatedAt: bylaws.updatedAt,
              createdBy: {
                id: profiles.id,
                fullName: profiles.fullName
              }
            })
            .from(bylaws)
            .leftJoin(profiles, eq(bylaws.createdById, profiles.id))
            .where(and(...whereConditions));
        }
      }
    }

    const results = await query.orderBy(asc(bylaws.sectionOrder));

    res.json(results);
  } catch (error: unknown) {
    console.error('Error fetching bylaws:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to fetch bylaws' });
  }
});

// Get bylaw structure (parts and sections hierarchy)
router.get('/structure', async (req, res) => {
  try {
    const structure = await db
      .select({
        partNumber: bylaws.partNumber,
        partTitle: bylaws.partTitle,
        sectionNumber: bylaws.sectionNumber,
        title: bylaws.title,
        id: bylaws.id,
        sectionOrder: bylaws.sectionOrder
      })
      .from(bylaws)
      .where(eq(bylaws.isActive, true))
      .orderBy(asc(bylaws.sectionOrder));

    // Group by parts
    const groupedStructure = structure.reduce((acc, bylaw) => {
      const partKey = bylaw.partNumber || 'Other';
      if (!acc[partKey]) {
        acc[partKey] = {
          partNumber: bylaw.partNumber,
          partTitle: bylaw.partTitle,
          sections: []
        };
      }
      acc[partKey].sections.push({
        id: bylaw.id,
        sectionNumber: bylaw.sectionNumber,
        title: bylaw.title,
        sectionOrder: bylaw.sectionOrder
      });
      return acc;
    }, {} as Record<string, { partNumber: string | null; partTitle: string | null; sections: Array<{ id: number; sectionNumber: string | null; title: string; sectionOrder: number | null; }> }>);

    res.json(groupedStructure);
  } catch (error: unknown) {
    console.error('Error fetching bylaw structure:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to fetch bylaw structure' });
  }
});

// Get single bylaw by ID
router.get('/:id', async (req, res) => {
  try {
    const bylawId = parseInt(req.params.id);
    
    const [bylaw] = await db
      .select({
        id: bylaws.id,
        uuid: bylaws.uuid,
        sectionNumber: bylaws.sectionNumber,
        title: bylaws.title,
        content: bylaws.content,
        parentSectionId: bylaws.parentSectionId,
        sectionOrder: bylaws.sectionOrder,
        partNumber: bylaws.partNumber,
        partTitle: bylaws.partTitle,
        isActive: bylaws.isActive,
        effectiveDate: bylaws.effectiveDate,
        createdAt: bylaws.createdAt,
        updatedAt: bylaws.updatedAt,
        createdBy: {
          id: profiles.id,
          fullName: profiles.fullName
        }
      })
      .from(bylaws)
      .leftJoin(profiles, eq(bylaws.createdById, profiles.id))
      .where(eq(bylaws.id, bylawId));

    if (!bylaw) {
      return res.status(404).json({ message: 'Bylaw not found' });
    }

    res.json(bylaw);
  } catch (error: unknown) {
    console.error('Error fetching bylaw:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to fetch bylaw' });
  }
});

// Search bylaws for suggestions (for violation forms)
router.get('/search/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json([]);
    }

    const suggestions = await db
      .select({
        id: bylaws.id,
        sectionNumber: bylaws.sectionNumber,
        title: bylaws.title,
        partTitle: bylaws.partTitle
      })
      .from(bylaws)
      .where(
        and(
          eq(bylaws.isActive, true),
          or(
            like(bylaws.sectionNumber, `%${q}%`),
            like(bylaws.title, `%${q}%`)
          )
        )
      )
      .orderBy(asc(bylaws.sectionOrder))
      .limit(10);

    res.json(suggestions);
  } catch (error: unknown) {
    console.error('Error searching bylaws:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to search bylaws' });
  }
});

// Create new bylaw (admin/council only)
router.post('/', ensureCouncilOrAdmin, async (req, res) => {
  try {
    const data = insertBylawSchema.parse(req.body);

    const [bylaw] = await db
      .insert(bylaws)
      .values({
        ...data,
        createdById: (req as AuthenticatedRequest).appUser.profile.id
      })
      .returning();

    res.status(201).json(bylaw);
  } catch (error: unknown) {
    console.error('Error creating bylaw:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to create bylaw' });
  }
});

// Update bylaw (admin/council only)
router.put('/:id', ensureCouncilOrAdmin, async (req, res) => {
  try {
    const bylawId = parseInt(req.params.id);
    const data = insertBylawSchema.partial().parse(req.body);

    // Get current bylaw for revision tracking
    const [currentBylaw] = await db
      .select()
      .from(bylaws)
      .where(eq(bylaws.id, bylawId));

    if (!currentBylaw) {
      return res.status(404).json({ message: 'Bylaw not found' });
    }

    // Create revision entry
    await db
      .insert(bylawRevisions)
      .values({
        bylawId: bylawId,
        title: currentBylaw.title,
        content: currentBylaw.content,
        revisionNotes: req.body.revisionNotes || 'Updated via admin interface',
        effectiveDate: currentBylaw.effectiveDate,
        createdById: (req as AuthenticatedRequest).appUser.profile.id
      });

    // Update the bylaw
    const [updatedBylaw] = await db
      .update(bylaws)
      .set({
        ...data,
        updatedAt: new Date(),
        updatedById: (req as AuthenticatedRequest).appUser.profile.id
      })
      .where(eq(bylaws.id, bylawId))
      .returning();

    res.json(updatedBylaw);
  } catch (error: unknown) {
    console.error('Error updating bylaw:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to update bylaw' });
  }
});

// Deactivate bylaw (admin only)
router.delete('/:id', ensureCouncilOrAdmin, async (req, res) => {
  try {
    const bylawId = parseInt(req.params.id);

    const [updatedBylaw] = await db
      .update(bylaws)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedById: (req as AuthenticatedRequest).appUser.profile.id
      })
      .where(eq(bylaws.id, bylawId))
      .returning();

    if (!updatedBylaw) {
      return res.status(404).json({ message: 'Bylaw not found' });
    }

    res.json({ message: 'Bylaw deactivated successfully' });
  } catch (error: unknown) {
    console.error('Error deactivating bylaw:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to deactivate bylaw' });
  }
});

// Import bylaws from structured data (admin only)
router.post('/import', ensureCouncilOrAdmin, upload.single('bylawsFile'), async (req, res) => {
  try {
    if (req.file) {
      // Parse and import from uploaded XML file
      const filePath = req.file.path;
      await parseXMLBylaws(filePath, (req as AuthenticatedRequest).appUser.profile.id);
      
      // Clean up temporary file
      try {
        await fs.unlink(filePath);
      } catch (cleanupError: unknown) {
        console.warn('Failed to cleanup temporary file:', cleanupError instanceof Error ? cleanupError.message : 'Unknown error');
      }
      
      res.status(201).json({
        message: 'Successfully imported bylaws from XML file',
        success: true
      });
    } else {
      // Import default Spectrum IV bylaws
      await importSpectrumBylaws((req as AuthenticatedRequest).appUser.profile.id);
      
      res.status(201).json({
        message: 'Successfully imported Spectrum IV bylaws',
        success: true
      });
    }
  } catch (error: unknown) {
    console.error('Error importing bylaws:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ 
      message: 'Failed to import bylaws',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get bylaw revision history
router.get('/:id/revisions', ensureCouncilOrAdmin, async (req, res) => {
  try {
    const bylawId = parseInt(req.params.id);
    
    const revisions = await db
      .select({
        id: bylawRevisions.id,
        title: bylawRevisions.title,
        content: bylawRevisions.content,
        revisionNotes: bylawRevisions.revisionNotes,
        effectiveDate: bylawRevisions.effectiveDate,
        createdAt: bylawRevisions.createdAt,
        createdBy: {
          id: profiles.id,
          fullName: profiles.fullName
        }
      })
      .from(bylawRevisions)
      .leftJoin(profiles, eq(bylawRevisions.createdById, profiles.id))
      .where(eq(bylawRevisions.bylawId, bylawId))
      .orderBy(desc(bylawRevisions.createdAt));

    res.json(revisions);
  } catch (error: unknown) {
    console.error('Error fetching bylaw revisions:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Failed to fetch bylaw revisions' });
  }
});

export default router; 