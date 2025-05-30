# UUID Implementation Guide

## Overview
This guide provides step-by-step instructions and code examples for implementing UUID-based violation IDs in StrataTracker.

## Prerequisites
- PostgreSQL database with existing violation data
- Full database backup completed
- Development environment for testing

## Implementation Steps

### Step 1: Database Migration

#### Run the UUID Migration
```bash
# Apply the UUID migration
npm run db:push

# Or manually execute the migration
psql -d spectrum4 -f migrations/0003_add_violation_uuids.sql
```

#### Verify Migration Success
```sql
-- Check that UUID columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'violations' AND column_name IN ('id', 'uuid');

-- Check that all violations have UUIDs
SELECT COUNT(*) as total_violations, 
       COUNT(uuid) as violations_with_uuid 
FROM violations;

-- Check foreign key relationships
SELECT COUNT(*) as histories_with_uuid FROM violation_histories WHERE violation_uuid IS NOT NULL;
SELECT COUNT(*) as access_links_with_uuid FROM violation_access_links WHERE violation_uuid IS NOT NULL;
```

### Step 2: Update Drizzle Schema

Update `shared/schema.ts` to include UUID columns:

```typescript
// Add to violations table schema
export const violations = pgTable("violations", {
  id: serial("id").primaryKey(), // Keep during transition
  uuid: uuid("uuid").notNull().unique().defaultRandom(), // New primary key
  referenceNumber: uuid("reference_number").defaultRandom().notNull().unique(),
  // ... rest of existing columns
});

// Update violation_histories schema
export const violationHistories = pgTable("violation_histories", {
  id: serial("id").primaryKey(),
  violationId: integer("violation_id").notNull().references(() => violations.id), // Keep during transition
  violationUuid: uuid("violation_uuid").notNull().references(() => violations.uuid), // New foreign key
  // ... rest of existing columns
});

// Update violation_access_links schema
export const violationAccessLinks = pgTable("violation_access_links", {
  id: serial("id").primaryKey(),
  violationId: integer("violation_id").notNull().references(() => violations.id), // Keep during transition
  violationUuid: uuid("violation_uuid").notNull().references(() => violations.uuid), // New foreign key
  // ... rest of existing columns
});
```

### Step 3: Update Storage Layer

Create UUID-compatible storage methods in `server/storage.ts`:

```typescript
// Add UUID validation helper
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Update getViolationWithUnit to accept UUID
async getViolationWithUnit(identifier: string | number): Promise<ViolationWithUnit | undefined> {
  try {
    let whereClause;
    
    if (typeof identifier === 'number') {
      // Backward compatibility with integer IDs
      whereClause = eq(violations.id, identifier);
    } else if (typeof identifier === 'string' && isValidUUID(identifier)) {
      // Use UUID
      whereClause = eq(violations.uuid, identifier);
    } else {
      throw new Error('Invalid violation identifier');
    }

    const result = await this.db
      .select({
        id: violations.id,
        uuid: violations.uuid,
        referenceNumber: violations.referenceNumber,
        unitId: violations.unitId,
        reportedById: violations.reportedById,
        categoryId: violations.categoryId,
        violationType: violations.violationType,
        violationDate: violations.violationDate,
        violationTime: violations.violationTime,
        description: violations.description,
        bylawReference: violations.bylawReference,
        status: violations.status,
        fineAmount: violations.fineAmount,
        createdAt: violations.createdAt,
        updatedAt: violations.updatedAt,
        attachments: violations.attachments,
        pdfGenerated: violations.pdfGenerated,
        pdfPath: violations.pdfPath,
        unit: {
          id: propertyUnits.id,
          unitNumber: propertyUnits.unitNumber,
          floor: propertyUnits.floor,
          ownerName: customers.fullName,
          ownerEmail: customers.email,
          tenantName: propertyUnits.tenantName,
          tenantEmail: propertyUnits.tenantEmail,
        }
      })
      .from(violations)
      .leftJoin(propertyUnits, eq(violations.unitId, propertyUnits.id))
      .leftJoin(customers, eq(propertyUnits.customerId, customers.id))
      .where(whereClause);

    return result[0] || undefined;
  } catch (error) {
    console.error('[getViolationWithUnit] Error:', error);
    return undefined;
  }
}

// Update other violation methods similarly
async updateViolationStatus(identifier: string | number, status: string): Promise<Violation | undefined> {
  let whereClause;
  
  if (typeof identifier === 'number') {
    whereClause = eq(violations.id, identifier);
  } else if (typeof identifier === 'string' && isValidUUID(identifier)) {
    whereClause = eq(violations.uuid, identifier);
  } else {
    throw new Error('Invalid violation identifier');
  }

  const result = await this.db
    .update(violations)
    .set({ status, updatedAt: new Date() })
    .where(whereClause)
    .returning();

  return result[0] || undefined;
}

// Update violation history methods to use UUID
async addViolationHistory(data: { violationUuid: string; userId: number; action: string; comment?: string }): Promise<ViolationHistory> {
  const result = await this.db
    .insert(violationHistories)
    .values({
      violationUuid: data.violationUuid,
      userId: data.userId,
      action: data.action,
      comment: data.comment,
    })
    .returning();

  return result[0];
}

async getViolationHistory(violationUuid: string): Promise<ViolationHistory[]> {
  return await this.db
    .select({
      id: violationHistories.id,
      violationUuid: violationHistories.violationUuid,
      userId: violationHistories.userId,
      action: violationHistories.action,
      comment: violationHistories.comment,
      commenterName: violationHistories.commenterName,
      createdAt: violationHistories.createdAt,
    })
    .from(violationHistories)
    .where(eq(violationHistories.violationUuid, violationUuid))
    .orderBy(desc(violationHistories.createdAt));
}
```

### Step 4: Update API Routes

Modify `server/routes.ts` to support both integer IDs and UUIDs during transition:

```typescript
// Helper function to determine if parameter is UUID or integer
function parseViolationIdentifier(param: string): { type: 'uuid' | 'id'; value: string | number } {
  // Check if it's a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(param)) {
    return { type: 'uuid', value: param };
  }
  
  // Try to parse as integer
  const id = parseInt(param, 10);
  if (!isNaN(id)) {
    return { type: 'id', value: id };
  }
  
  throw new Error('Invalid violation identifier format');
}

// Update violation detail route
app.get("/api/violations/:identifier", ensureAuthenticated, async (req, res) => {
  try {
    const { type, value } = parseViolationIdentifier(req.params.identifier);
    const violation = await dbStorage.getViolationWithUnit(value);
    
    if (!violation) {
      return res.status(404).json({ message: "Violation not found" });
    }
    
    res.json(violation);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid violation identifier format') {
      return res.status(400).json({ message: "Invalid violation identifier" });
    }
    res.status(500).json({ message: "Failed to fetch violation" });
  }
});

// Update status update route
app.patch("/api/violations/:identifier/status", ensureAuthenticated, async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === undefined) return;
  
  try {
    const { type, value } = parseViolationIdentifier(req.params.identifier);
    const { status, comment } = req.body;
    
    // Validate status
    if (!["new", "pending_approval", "approved", "disputed", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    
    // Update the violation status
    const violation = await dbStorage.updateViolationStatus(value, status);
    
    if (!violation) {
      return res.status(404).json({ message: "Violation not found" });
    }
    
    // Add to history using UUID
    await dbStorage.addViolationHistory({
      violationUuid: violation.uuid,
      userId,
      action: `status_changed_to_${status}`,
      comment
    });
    
    res.json(violation);
  } catch (error) {
    res.status(500).json({ message: "Failed to update violation status" });
  }
});

// Update history routes
app.post("/api/violations/:identifier/history", ensureAuthenticated, async (req, res) => {
  const userId = getUserId(req, res);
  if (userId === undefined) return;
  
  try {
    const { type, value } = parseViolationIdentifier(req.params.identifier);
    const { action, comment } = req.body;
    
    // Get violation to ensure it exists and get UUID
    const violation = await dbStorage.getViolationWithUnit(value);
    if (!violation) {
      return res.status(404).json({ message: "Violation not found" });
    }
    
    const history = await dbStorage.addViolationHistory({
      violationUuid: violation.uuid,
      userId,
      action,
      comment
    });
    
    res.status(201).json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to add comment" });
  }
});

app.get("/api/violations/:identifier/history", ensureAuthenticated, async (req, res) => {
  try {
    const { type, value } = parseViolationIdentifier(req.params.identifier);
    
    // Get violation to ensure it exists and get UUID
    const violation = await dbStorage.getViolationWithUnit(value);
    if (!violation) {
      return res.status(404).json({ message: "Violation not found" });
    }
    
    const history = await dbStorage.getViolationHistory(violation.uuid);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch violation history" });
  }
});
```

### Step 5: Update Frontend Components

#### Update React Router Configuration

Modify `client/src/App.tsx`:

```typescript
// Update route to accept UUIDs
<ProtectedRoute path="/violations/:identifier" component={ViolationDetailPage} />
```

#### Update Violation Detail Page

Modify `client/src/pages/violation-detail-page.tsx`:

```typescript
export default function ViolationDetailPage() {
  const location = window.location.pathname;
  
  // Extract the violation identifier from the URL
  const violationIdentifier = location.split("/").pop();

  if (!violationIdentifier) {
    return (
      <Layout title="Violation Not Found">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Violation ID</h1>
            <p className="text-neutral-600">The violation identifier in the URL is invalid.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Violation Details">
      {violationIdentifier && <ViolationDetail identifier={violationIdentifier} />}
    </Layout>
  );
}
```

#### Update Violation Detail Component

Modify `client/src/components/violation-detail.tsx`:

```typescript
interface ViolationDetailProps {
  identifier: string; // Can be UUID or integer ID
}

export function ViolationDetail({ identifier }: ViolationDetailProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries using the identifier (backend will handle UUID vs ID)
  const { data: violation, isLoading, error } = useQuery({
    queryKey: [`/api/violations/${identifier}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/violations/${identifier}`);
      return res.json();
    },
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: [`/api/violations/${identifier}/history`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/violations/${identifier}/history`);
      return res.json();
    },
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({ status, comment }: { status: string; comment?: string }) => {
      const res = await apiRequest("PATCH", `/api/violations/${identifier}/status`, { status, comment });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/violations/${identifier}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/violations/${identifier}/history`] });
      toast({ title: "Status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  // Rest of component logic remains the same...
  // Update display to show UUID instead of integer ID:

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">
              Violation #{violation.uuid ? violation.uuid.slice(0, 8) : violation.id}
            </h2>
            <p className="text-blue-100">Reported on {format(new Date(violation.createdAt), "MMMM dd, yyyy")}</p>
          </div>
          <div className="text-right">
            {getStatusBadge(violation.status)}
          </div>
        </div>
      </div>
      {/* Rest of component... */}
    </div>
  );
}
```

#### Update Navigation Links

Update all violation navigation links to use UUIDs:

```typescript
// In violation list components
<Link href={`/violations/${violation.uuid || violation.id}`}>
  View Details
</Link>

// In search components
onClick={() => navigate(`/violations/${violation.uuid || violation.id}`)}

// In layout component
<DropdownMenuItem key={v.id} onClick={() => navigate(`/violations/${v.uuid || v.id}`)} className="flex flex-col items-start cursor-pointer">
```

### Step 6: Testing and Validation

#### Unit Tests

Create tests for UUID functionality:

```typescript
// tests/uuid-migration.test.ts
describe('UUID Migration', () => {
  test('should accept both UUID and integer identifiers', async () => {
    // Test with integer ID (backward compatibility)
    const response1 = await request(app)
      .get('/api/violations/1')
      .expect(200);
    
    // Test with UUID
    const uuid = response1.body.uuid;
    const response2 = await request(app)
      .get(`/api/violations/${uuid}`)
      .expect(200);
    
    expect(response1.body.id).toBe(response2.body.id);
  });

  test('should reject invalid identifiers', async () => {
    await request(app)
      .get('/api/violations/invalid-id')
      .expect(400);
  });

  test('should create violation history with UUID', async () => {
    const violation = await createTestViolation();
    
    const response = await request(app)
      .post(`/api/violations/${violation.uuid}/history`)
      .send({ action: 'test', comment: 'Test comment' })
      .expect(201);
    
    expect(response.body.violationUuid).toBe(violation.uuid);
  });
});
```

#### Integration Tests

```bash
# Run full test suite
npm test

# Test specific UUID functionality
npm test -- --grep "UUID"
```

### Step 7: Performance Monitoring

#### Database Performance Queries

```sql
-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('violations', 'violation_histories', 'violation_access_links')
ORDER BY idx_scan DESC;

-- Check index bloat
SELECT schemaname, tablename, indexname, 
       pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
       idx_scan, idx_tup_read
FROM pg_stat_user_indexes 
WHERE tablename = 'violations'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Monitor query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM violations WHERE uuid = 'your-test-uuid-here';
```

#### Application Monitoring

```typescript
// Add performance logging to violation queries
async getViolationWithUnit(identifier: string | number): Promise<ViolationWithUnit | undefined> {
  const startTime = Date.now();
  try {
    const result = await this.performQuery(identifier);
    const duration = Date.now() - startTime;
    
    console.log(`[Performance] getViolationWithUnit(${typeof identifier === 'string' ? 'UUID' : 'ID'}): ${duration}ms`);
    
    return result;
  } catch (error) {
    console.error('[Performance] Query failed:', error);
    throw error;
  }
}
```

## Rollback Plan

If issues arise, rollback steps:

1. **Revert frontend changes**: Use integer IDs in URLs
2. **Revert API routes**: Remove UUID support
3. **Keep database schema**: UUID columns can remain for future use
4. **Monitor performance**: Ensure system returns to baseline

## Success Criteria Checklist

- [ ] All existing violations have UUIDs generated
- [ ] Foreign key relationships maintained
- [ ] API endpoints accept both UUIDs and integer IDs
- [ ] Frontend routes use UUIDs for new violations
- [ ] No enumeration possible via violation URLs
- [ ] Performance within acceptable limits (< 10% degradation)
- [ ] All tests pass
- [ ] Database migrations completed successfully
- [ ] Monitoring shows stable system metrics

## Troubleshooting

### Common Issues

1. **UUID Generation Fails**
   ```sql
   -- Check if UUIDv7 function exists
   SELECT proname FROM pg_proc WHERE proname = 'generate_uuidv7';
   ```

2. **Foreign Key Violations**
   ```sql
   -- Check for orphaned records
   SELECT COUNT(*) FROM violation_histories vh 
   WHERE NOT EXISTS (SELECT 1 FROM violations v WHERE v.uuid = vh.violation_uuid);
   ```

3. **Performance Issues**
   ```sql
   -- Rebuild indexes if needed
   REINDEX INDEX CONCURRENTLY idx_violations_uuid;
   ```

4. **Frontend Routing Issues**
   - Clear browser cache
   - Check console for JavaScript errors
   - Verify API endpoint responses 