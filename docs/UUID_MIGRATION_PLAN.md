# UUID Migration Plan: Violations System

## Overview
This document outlines the migration strategy to replace sequential integer IDs with UUIDs for the violations system in StrataTracker.

## Current State
- **Primary Key**: `violations.id` (serial/integer)
- **Reference Number**: `violations.reference_number` (UUID) - already exists
- **Foreign Keys**: 
  - `violation_histories.violation_id` → `violations.id`
  - `violation_access_links.violation_id` → `violations.id`
- **API Endpoints**: `/api/violations/:id` (integer)
- **Frontend Routes**: `/violations/:id` (integer)

## Target State
- **Primary Key**: `violations.uuid` (UUIDv7 - time-ordered)
- **API Endpoints**: `/api/violations/:uuid` (UUID)
- **Frontend Routes**: `/violations/:uuid` (UUID)
- **Security**: Non-enumerable violation access
- **Performance**: Optimized with time-ordered UUIDs

## Migration Strategy: Zero-Downtime Approach

### Phase 1: Database Schema Preparation (Est. 2-4 hours)

#### Step 1.1: Add UUID Column to Violations Table
```sql
-- Add new UUID column (will become primary key)
ALTER TABLE violations ADD COLUMN uuid UUID;

-- Create UUIDv7 function (time-ordered for better performance)
CREATE OR REPLACE FUNCTION generate_uuidv7()
RETURNS UUID AS $$
DECLARE
    unix_ts_ms BIGINT;
    uuid_bytes BYTEA;
BEGIN
    -- Get current timestamp in milliseconds
    unix_ts_ms := EXTRACT(EPOCH FROM NOW()) * 1000;
    
    -- Generate UUID v7: timestamp (48 bits) + version (4 bits) + random (12 bits) + variant (2 bits) + random (62 bits)
    uuid_bytes := 
        -- Timestamp (48 bits)
        substring(int8send(unix_ts_ms), 3, 6) ||
        -- Version (4 bits) + random (12 bits) 
        substring(gen_random_bytes(8), 1, 2) ||
        -- Variant (2 bits) + random (62 bits)
        substring(gen_random_bytes(8), 1, 8);
    
    -- Set version bits (version 7)
    uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
    -- Set variant bits
    uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
    
    RETURN encode(uuid_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql;

-- Populate UUIDs for existing violations
UPDATE violations SET uuid = generate_uuidv7() WHERE uuid IS NULL;

-- Make UUID column NOT NULL and UNIQUE
ALTER TABLE violations ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE violations ADD CONSTRAINT violations_uuid_unique UNIQUE (uuid);
```

#### Step 1.2: Add UUID Foreign Key Columns
```sql
-- Add UUID foreign key to violation_histories
ALTER TABLE violation_histories ADD COLUMN violation_uuid UUID;

-- Populate from existing relationships
UPDATE violation_histories vh 
SET violation_uuid = v.uuid 
FROM violations v 
WHERE vh.violation_id = v.id;

-- Make NOT NULL after population
ALTER TABLE violation_histories ALTER COLUMN violation_uuid SET NOT NULL;

-- Add UUID foreign key to violation_access_links
ALTER TABLE violation_access_links ADD COLUMN violation_uuid UUID;

-- Populate from existing relationships
UPDATE violation_access_links val 
SET violation_uuid = v.uuid 
FROM violations v 
WHERE val.violation_id = v.id;

-- Make NOT NULL after population
ALTER TABLE violation_access_links ALTER COLUMN violation_uuid SET NOT NULL;
```

#### Step 1.3: Create Indexes on UUID Columns
```sql
-- Index on violations.uuid (will become primary key index)
CREATE UNIQUE INDEX CONCURRENTLY idx_violations_uuid ON violations (uuid);

-- Indexes on foreign key columns
CREATE INDEX CONCURRENTLY idx_violation_histories_violation_uuid ON violation_histories (violation_uuid);
CREATE INDEX CONCURRENTLY idx_violation_access_links_violation_uuid ON violation_access_links (violation_uuid);
```

### Phase 2: Application Layer Migration (Est. 4-6 hours)

#### Step 2.1: Update Backend Storage Layer
- Modify `getViolationWithUnit()` to accept UUID parameter
- Update all violation query methods to use UUID
- Maintain backward compatibility during transition

#### Step 2.2: Update API Routes
- Add new UUID-based routes: `/api/violations/:uuid`
- Keep existing integer routes during transition
- Add route parameter validation for UUIDs

#### Step 2.3: Update Frontend Components
- Modify violation routing to use UUIDs
- Update all violation links and navigation
- Update API calls to use UUID endpoints

### Phase 3: Foreign Key Migration (Est. 2-3 hours)

#### Step 3.1: Add New Foreign Key Constraints
```sql
-- Add foreign key constraints for UUID columns
ALTER TABLE violation_histories 
ADD CONSTRAINT fk_violation_histories_violation_uuid 
FOREIGN KEY (violation_uuid) REFERENCES violations (uuid);

ALTER TABLE violation_access_links 
ADD CONSTRAINT fk_violation_access_links_violation_uuid 
FOREIGN KEY (violation_uuid) REFERENCES violations (uuid);
```

### Phase 4: Primary Key Migration (Est. 1-2 hours)

#### Step 4.1: Drop Old Constraints and Indexes
```sql
-- Drop old foreign key constraints
ALTER TABLE violation_histories DROP CONSTRAINT IF EXISTS violation_histories_violation_id_violations_id_fk;
ALTER TABLE violation_access_links DROP CONSTRAINT IF EXISTS violation_access_links_violation_id_violations_id_fk;

-- Drop old primary key constraint
ALTER TABLE violations DROP CONSTRAINT IF EXISTS violations_pkey;
```

#### Step 4.2: Create New Primary Key
```sql
-- Add new primary key constraint on UUID
ALTER TABLE violations ADD CONSTRAINT violations_pkey PRIMARY KEY (uuid);
```

### Phase 5: Cleanup (Est. 1 hour)

#### Step 5.1: Remove Old Columns
```sql
-- Remove old foreign key columns
ALTER TABLE violation_histories DROP COLUMN violation_id;
ALTER TABLE violation_access_links DROP COLUMN violation_id;

-- Remove old ID column from violations (optional - keep for reference)
-- ALTER TABLE violations DROP COLUMN id;

-- Rename UUID column to id (optional)
-- ALTER TABLE violations RENAME COLUMN uuid TO id;
```

## Performance Considerations

### UUIDv7 Benefits
- **Time-ordered**: Maintains B-tree index efficiency
- **Reduced fragmentation**: ~90% of random UUID performance penalty eliminated
- **Insert performance**: Close to sequential integer performance
- **Query performance**: Minimal impact on JOIN operations

### Monitoring
- Monitor index bloat during and after migration
- Track query performance metrics
- Measure insert/update performance

## Security Benefits

### Current Risk (Sequential IDs)
```
https://app.stratatracker.com/violations/1    # First violation
https://app.stratatracker.com/violations/2    # Second violation  
https://app.stratatracker.com/violations/999  # Reveals ~999 total violations
```

### After UUID Implementation
```
https://app.stratatracker.com/violations/01h2x3y4-z5a6-7b8c-9d0e-f1g2h3i4j5k6  # Non-enumerable
```

## Risk Mitigation

### Rollback Strategy
1. **Dual column approach**: Keep both ID and UUID during transition
2. **Database triggers**: Maintain consistency between systems
3. **Feature flags**: Toggle between ID and UUID systems
4. **Backup verification**: Full database backup before each phase

### Testing Strategy
1. **Load testing**: Verify performance with UUIDs
2. **Integration testing**: Ensure all API endpoints work
3. **Security testing**: Verify enumeration protection
4. **Migration testing**: Test on copy of production data

## Timeline Estimate

| Phase | Duration | Downtime | Risk Level |
|-------|----------|----------|------------|
| Phase 1: Schema Prep | 2-4 hours | None | Low |
| Phase 2: Application | 4-6 hours | None | Medium |
| Phase 3: Foreign Keys | 2-3 hours | < 5 minutes | Low |
| Phase 4: Primary Key | 1-2 hours | < 2 minutes | Medium |
| Phase 5: Cleanup | 1 hour | None | Low |
| **Total** | **10-16 hours** | **< 7 minutes** | **Medium** |

## Success Criteria

- [ ] All violation URLs use UUIDs instead of sequential IDs
- [ ] No enumeration attacks possible on violation endpoints
- [ ] Query performance within 10% of current performance
- [ ] Zero data loss during migration
- [ ] All existing functionality preserved
- [ ] Full test suite passes with UUID implementation

## Post-Migration Monitoring

### Week 1
- Monitor database performance metrics
- Track error rates and user feedback
- Verify security improvements

### Month 1
- Analyze index growth and fragmentation
- Review query performance trends
- Assess user experience impact

## Future Considerations

### Other Tables
Consider migrating other sensitive entities:
- `users` table (if user enumeration is a concern)
- `property_units` table (if unit enumeration is a concern)
- `violation_categories` table (less critical)

### Database Engine
- PostgreSQL 15+ has improved UUID performance
- Consider upgrading if on older versions
- Monitor for UUIDv7 native support in future versions 