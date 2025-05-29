# StrataTracker Migration Guide: Replit to Docker

This document outlines the complete migration process from Replit to a local Docker development environment.

## 📋 Migration Overview

**Migration Date**: December 2024  
**From**: Replit cloud development environment  
**To**: Local Docker containerized environment  
**Status**: ✅ Complete and Successful

### Key Benefits Achieved
- ✅ **Local Development**: Full control over development environment
- ✅ **Production Ready**: Docker containers for consistent deployment
- ✅ **Database Control**: Local PostgreSQL instead of cloud dependency
- ✅ **Performance**: Faster builds and development cycles
- ✅ **Cost Effective**: No cloud service dependencies for development

---

## 🔧 Technical Changes Made

### 1. Dependency Management

#### Removed Replit-Specific Dependencies
```json
// Removed from package.json
{
  "devDependencies": {
    "@replit/vite-plugin-cartographer": "^0.2.0",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.3"
  }
}
```

#### Added Standard PostgreSQL Support
```json
// Added to package.json
{
  "dependencies": {
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "@types/pg": "^8.10.9"
  }
}
```

### 2. Database Migration

#### Before: Neon Serverless Database
```typescript
// server/db.ts - Old configuration
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

// Explicitly set WebSocket constructor for Neon
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Neon-specific configuration
});
```

#### After: Standard PostgreSQL
```typescript
// server/db.ts - New configuration
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';

// Standard PostgreSQL configuration
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true
});
```

### 3. Vite Configuration Updates

#### Before: Replit-Specific Plugins
```typescript
// vite.config.ts - Old configuration
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  // ...
});
```

#### After: Clean Configuration
```typescript
// vite.config.ts - New configuration
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          "@babel/plugin-transform-react-display-name"
        ]
      }
    }),
  ],
  // ... rest of configuration
});
```

### 4. Build System Fixes

#### Import Resolution Issues
**Problem**: `import.meta.dirname` was undefined in bundled production environment

**Solution**: Conditional import in `server/vite.ts`
```typescript
// Before: Top-level import causing issues
import viteConfig from "../vite.config";

// After: Conditional import only when needed
export async function setupVite(app: Express, server: Server) {
  // Import vite config only when needed (development mode)
  const viteConfig = (await import("../vite.config")).default;
  // ...
}
```

#### CommonJS/ES Module Compatibility
**Problem**: `pg` module import syntax incompatibility

**Solution**: Updated import syntax
```typescript
// Fixed import for CommonJS module in ES environment
import pkg from 'pg';
const { Pool } = pkg;
```

### 5. Docker Configuration

#### Docker Compose Setup
```yaml
# docker-compose.yml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: spectrum4
      POSTGRES_USER: spectrum4
      POSTGRES_PASSWORD: spectrum4password
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d
      - ./migrations:/docker-entrypoint-initdb.d/migrations
    ports:
      - "5432:5432"

  backend:
    build: .
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://spectrum4:spectrum4password@db:5432/spectrum4
      SESSION_SECRET: your-session-secret
      PUBLIC_BASE_URL: http://localhost:3001
    ports:
      - "3001:3000"
    depends_on:
      - db

volumes:
  db_data:
```

#### Dockerfile Configuration
```dockerfile
FROM node:18-alpine

# Multi-stage build for optimization
# Stage 1: Build application
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY server ./server
COPY shared ./shared
COPY client ./client
RUN npm install
RUN npm run build

# Stage 2: Production runtime
FROM node:18-alpine
WORKDIR /app
RUN mkdir -p ./dist/public
RUN mkdir -p ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/dist/public ./dist/public/
COPY --from=builder /app/node_modules ./node_modules/

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## 🗄️ Database Migration Process

### 1. Schema Migration Setup

#### Database Initialization Scripts
```sql
-- db/init/00-schema.sql
-- This file applies the Drizzle migrations to create the database schema

-- Apply the initial migration
\i /docker-entrypoint-initdb.d/migrations/0000_stormy_lockjaw.sql

-- Apply subsequent migrations
\i /docker-entrypoint-initdb.d/migrations/0001_dark_kulan_gath.sql
\i /docker-entrypoint-initdb.d/migrations/0002_productive_saracen.sql
\i /docker-entrypoint-initdb.d/migrations/0001_add_email_notifications.sql
```

#### Admin User Creation
```sql
-- db/init/01-init.sql
INSERT INTO users (email, password, full_name, is_admin, created_at)
VALUES (
  'admin@spectrum4.com',
  '$2a$12$dFCWp0Vsv3fK2KvM4Z3gCewf0VIC6m/pEmgryI9btxDYsBu66rlIO', 
  'Admin User',
  true,
  NOW()
)
ON CONFLICT (email) DO NOTHING;
```

### 2. Migration Execution
The database schema is automatically created when the Docker containers start:

1. **PostgreSQL Container**: Starts and initializes empty database
2. **Schema Creation**: Runs migration scripts from `/docker-entrypoint-initdb.d/`
3. **Data Initialization**: Creates admin user and default settings
4. **Backend Connection**: Connects to fully initialized database

---

## 🚨 Issues Encountered & Solutions

### 1. Docker Compose Compatibility
**Issue**: `'ContainerConfig'` error with docker-compose v1.29.2

**Solution**: Upgraded to Docker Compose V2
```bash
# Old command (causing errors)
sudo docker-compose up --build

# New command (working)
sudo docker compose up --build
```

### 2. Path Resolution Errors
**Issue**: `TypeError [ERR_INVALID_ARG_TYPE]: The "paths[0]" argument must be of type string. Received undefined`

**Root Cause**: `import.meta.dirname` was undefined in bundled production environment due to Replit-specific vite config being imported at module level.

**Solution**: 
1. Removed Replit-specific vite plugins
2. Made vite config import conditional (only in development)
3. Fixed static path resolution in production

### 3. Database Connection Issues
**Issue**: Application trying to connect to Neon cloud database instead of local PostgreSQL

**Solution**: 
1. Replaced `@neondatabase/serverless` with standard `pg` driver
2. Updated import syntax for CommonJS/ES module compatibility
3. Configured proper connection string for local PostgreSQL

### 4. Build System Errors
**Issue**: Vite build failing due to missing `index.html` resolution

**Solution**: 
1. Updated Dockerfile to properly copy client directory
2. Fixed vite.config.ts path resolution
3. Ensured proper build output directory structure

---

## ✅ Verification Steps

### 1. Application Startup
```bash
# Start services
sudo docker compose up --build

# Verify containers are running
sudo docker ps

# Check logs
sudo docker compose logs backend
sudo docker compose logs db
```

### 2. Database Verification
```bash
# Connect to database
sudo docker exec -it violation-db-1 psql -U spectrum4 -d spectrum4

# Check tables
\dt

# Verify admin user
SELECT email, full_name, is_admin FROM users WHERE is_admin = true;
```

### 3. Application Access
- **Frontend**: http://localhost:3001
- **Admin Login**: admin@spectrum4.com / admin123
- **Database**: localhost:5432

### 4. Functionality Testing
- ✅ User authentication working
- ✅ Database connections established
- ✅ Static file serving operational
- ✅ API endpoints responding
- ✅ Frontend rendering correctly

---

## 📊 Performance Comparison

### Before (Replit)
- **Startup Time**: 30-60 seconds (cloud initialization)
- **Build Time**: Variable (shared resources)
- **Database**: External dependency (Neon)
- **Development**: Browser-based IDE limitations

### After (Docker)
- **Startup Time**: 10-15 seconds (local containers)
- **Build Time**: Consistent and fast (local resources)
- **Database**: Local PostgreSQL (full control)
- **Development**: Full IDE capabilities

---

## 🔮 Future Considerations

### Potential Improvements
1. **Development Environment**: Add hot-reload for backend development
2. **Testing**: Implement automated testing with test database
3. **CI/CD**: Set up GitHub Actions for automated deployment
4. **Monitoring**: Add application monitoring and logging
5. **Security**: Implement secrets management for production

### Deployment Options
1. **Local Development**: Current Docker setup
2. **Production**: Docker containers with reverse proxy
3. **Cloud Deployment**: Container orchestration (Kubernetes, Docker Swarm)
4. **Managed Services**: Cloud database with containerized application

---

## 📝 Lessons Learned

### Key Takeaways
1. **Platform Dependencies**: Avoid platform-specific dependencies when possible
2. **Import Compatibility**: Be aware of CommonJS/ES module compatibility issues
3. **Docker Versions**: Use latest Docker Compose V2 for better compatibility
4. **Migration Planning**: Thorough testing in isolated environment before full migration
5. **Documentation**: Maintain detailed migration documentation for future reference

### Best Practices Established
1. **Containerization**: All services containerized for consistency
2. **Environment Variables**: Proper configuration management
3. **Database Migrations**: Automated schema management
4. **Error Handling**: Comprehensive error logging and handling
5. **Security**: Secure defaults with ability to customize for production

---

## 🆘 Troubleshooting Guide

### Common Issues After Migration

#### Port Conflicts
```bash
# Check what's using port 3001
sudo lsof -i :3001

# Stop conflicting services
sudo docker compose down

# Restart with clean state
sudo docker compose up --build
```

#### Database Connection Issues
```bash
# Check database container status
sudo docker compose logs db

# Verify database is accepting connections
sudo docker exec -it violation-db-1 pg_isready -U spectrum4

# Reset database if needed
sudo docker compose down -v
sudo docker compose up --build
```

#### Build Failures
```bash
# Clear Docker cache
sudo docker system prune -f

# Rebuild without cache
sudo docker compose build --no-cache

# Check for file permission issues
ls -la docker-compose.yml
```

---

## 📞 Support & Resources

### Documentation
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)

### Migration Support
For issues related to this migration:
1. Check this migration guide
2. Review application logs
3. Consult Docker documentation
4. Create GitHub issue with detailed error information

---

**Migration completed successfully on December 2024. StrataTracker is now fully containerized and ready for local development and production deployment.**

---

## 📧 Communications Feature Addition (May 2025)

### Overview
After the successful Docker migration, a comprehensive Communications feature was added to enable newsletter and announcement management for administrators and council members.

### Database Schema Changes

#### New Tables Added
```sql
-- Migration file: 0003_communications_schema.sql

-- Communication campaigns table
CREATE TABLE communication_campaigns (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'newsletter', 'announcement', 'update', 'emergency'
  status TEXT DEFAULT 'draft' NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  plain_text_content TEXT,
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Campaign recipients tracking table
CREATE TABLE communication_recipients (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL,
  unit_id INTEGER REFERENCES property_units(id),
  person_id INTEGER REFERENCES persons(id),
  email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Email templates table
CREATE TABLE communication_templates (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Migration Application
```bash
# Manual migration application (if needed)
sudo docker exec -i stratatracker-db-1 psql -U spectrum4 -d spectrum4 < migrations/0003_communications_schema.sql

# Verification
sudo docker exec -i stratatracker-db-1 psql -U spectrum4 -d spectrum4 -c "\\dt" | grep communication
```

### Backend Integration

#### New API Routes
- `/api/communications/campaigns` - Campaign management
- `/api/communications/templates` - Template management  
- `/api/communications/recipients` - Recipient management
- `/api/communications/units` - Unit selection

#### SMTP Integration
- Automatically uses existing SMTP settings from system_settings table
- No additional configuration required
- Falls back to safe defaults if SMTP not configured

### Frontend Changes

#### Navigation Update
- Added "Communications" menu item under "All Violations"
- Restricted to Admin and Council members only
- Uses Mail icon for visual identification

#### New Pages
- `client/src/pages/communications-page.tsx` - Main communications interface
- Tabbed interface for campaigns and templates
- Modern UI with comprehensive form validation

### Development Setup Impact

#### Important Development Note
**Critical**: Always use the startup script for development:
```bash
# Correct way to start development environment
sh start-dev.sh

# This replaces individual npm commands:
# npm run dev          (frontend only - NOT recommended)
# npm run dev:backend  (backend only - NOT recommended)
```

#### Port Management
- Script automatically finds available ports
- Backend typically on 3001, frontend on next available port
- No manual port configuration needed

### Security Implementation
- All communications routes require authentication
- Admin/Council role validation on all endpoints
- Email address validation before sending
- Campaign creation attribution tracking

### Performance Considerations
- Asynchronous email sending prevents blocking
- 100ms delay between emails to avoid SMTP overwhelm
- Comprehensive error handling and retry logic
- Database indexes for optimal performance

### Verification Steps
```bash
# 1. Verify tables exist
sudo docker exec -i stratatracker-db-1 psql -U spectrum4 -d spectrum4 -c "SELECT tablename FROM pg_tables WHERE tablename LIKE 'communication%';"

# 2. Test API endpoints (requires authentication)
curl -s -w "%{http_code}" http://localhost:3001/api/communications/campaigns
# Should return 403 (requires auth) - indicates endpoint is working

# 3. Check frontend access
curl -s -w "%{http_code}" http://localhost:5175/communications  
# Should return 200 - indicates page loads
```

### Integration Success
- ✅ Database migration applied successfully
- ✅ API routes integrated with authentication system
- ✅ Frontend components added to navigation
- ✅ SMTP integration uses existing email settings
- ✅ Comprehensive recipient management system
- ✅ Role-based access control implemented

---

**Communications feature successfully added May 2025. StrataTracker now includes comprehensive newsletter and announcement capabilities integrated with existing SMTP settings and user management system.** 