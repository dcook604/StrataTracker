# StrataTracker - Technical Overview

## 🏗️ Architecture Overview

StrataTracker is a full-stack property violation management system built with modern web technologies and containerized for easy deployment and development.

**Migration Status**: Successfully migrated from Replit to local Docker environment (v2.0.0)

### Technology Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4.14
- **UI Library**: Radix UI components with Tailwind CSS
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter (lightweight React router)
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

#### Backend
- **Runtime**: Node.js 18 (Alpine Linux in Docker)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 15
- **ORM**: Drizzle ORM with node-postgres driver
- **Authentication**: Passport.js with local strategy
- **Session Management**: Express Session with PostgreSQL store
- **Security**: Helmet, CORS, Rate limiting
- **File Upload**: Multer for evidence attachments

#### Infrastructure
- **Containerization**: Docker with Docker Compose V2
- **Database**: PostgreSQL 15 in Docker container
- **Process Management**: Docker containers with graceful shutdown
- **Static Files**: Served via Express static middleware

---

## 🐳 Docker Architecture

### Container Services

#### Backend Service (`violation-backend`)
```dockerfile
FROM node:18-alpine
WORKDIR /app
# Multi-stage build for optimization
# Stage 1: Build application
# Stage 2: Production runtime
```

**Configuration**:
- **Port Mapping**: 3001:3000 (host:container)
- **Environment**: Production mode
- **Dependencies**: All Node.js dependencies bundled
- **Build Process**: Vite frontend build + esbuild backend bundle

#### Database Service (`violation-db`)
```yaml
image: postgres:15
environment:
  POSTGRES_DB: spectrum4
  POSTGRES_USER: spectrum4
  POSTGRES_PASSWORD: spectrum4password
volumes:
  - db_data:/var/lib/postgresql/data
  - ./db/init:/docker-entrypoint-initdb.d
  - ./migrations:/docker-entrypoint-initdb.d/migrations
```

**Features**:
- **Automatic Schema Creation**: Drizzle migrations applied on startup
- **Data Persistence**: Docker volume for database storage
- **Initialization Scripts**: Admin user creation and schema setup

### Volume Management
- **`db_data`**: Persistent PostgreSQL data storage
- **Migration Mounts**: Live migration files for schema updates

---

## 📁 Project Structure

```
StrataTracker/
├── client/                     # React Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Route components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities and configurations
│   │   └── main.tsx           # Application entry point
│   ├── public/                # Static assets and PWA files
│   └── index.html             # HTML template
├── server/                     # Express Backend
│   ├── routes/                # API route handlers
│   ├── middleware/            # Express middleware
│   ├── utils/                 # Server utilities
│   ├── db.ts                  # Database configuration
│   └── index.ts               # Server entry point
├── shared/                     # Shared TypeScript types
│   └── schema.ts              # Drizzle database schema
├── migrations/                 # Database migration files
│   ├── 0000_stormy_lockjaw.sql
│   ├── 0001_dark_kulan_gath.sql
│   └── 0002_productive_saracen.sql
├── db/init/                   # Database initialization
│   ├── 00-schema.sql          # Migration runner
│   └── 01-init.sql            # Admin user creation
├── docker-compose.yml         # Service orchestration
├── Dockerfile                 # Container build instructions
├── vite.config.ts            # Frontend build configuration
└── drizzle.config.ts         # Database ORM configuration
```

---

## 🔄 Migration from Replit

### Key Changes Made

#### 1. Dependency Updates
**Removed Replit-specific packages**:
```json
// Removed from package.json
"@replit/vite-plugin-cartographer": "^0.2.0"
"@replit/vite-plugin-runtime-error-modal": "^0.0.3"
```

**Added standard PostgreSQL support**:
```json
// Added to package.json
"pg": "^8.11.3"
"@types/pg": "^8.10.9"
```

#### 2. Database Migration
**From**: Neon Serverless Database
```typescript
// Old configuration
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;
```

**To**: Standard PostgreSQL
```typescript
// New configuration
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
```

#### 3. Build System Fixes
**Vite Configuration Updates**:
```typescript
// Removed Replit plugins
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["@babel/plugin-transform-react-display-name"]
      }
    }),
    // Removed: runtimeErrorOverlay(), cartographer()
  ],
  // ... rest of config
});
```

**Import Resolution Fixes**:
```typescript
// Fixed conditional import in server/vite.ts
export async function setupVite(app: Express, server: Server) {
  // Import vite config only when needed (development mode)
  const viteConfig = (await import("../vite.config")).default;
  // ... rest of function
}
```

#### 4. Docker Compose Updates
**Updated to V2 syntax**:
```yaml
# Removed obsolete version field
# version: '3.8'  # Removed

services:
  db:
    # ... configuration
  backend:
    # ... configuration
```

---

## 🗄️ Database Schema

### Core Tables

#### Users & Authentication
```sql
-- users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Violations Management
```sql
-- violations table
CREATE TABLE violations (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER REFERENCES units(id),
  reported_by INTEGER REFERENCES users(id),
  violation_type TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Property Management
```sql
-- units table
CREATE TABLE units (
  id SERIAL PRIMARY KEY,
  unit_number TEXT NOT NULL,
  building_id INTEGER,
  tenant_id INTEGER REFERENCES persons(id),
  owner_id INTEGER REFERENCES persons(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Migration System
- **Drizzle ORM**: Type-safe database operations
- **Automatic Migrations**: Applied on container startup
- **Version Control**: Migration files tracked in Git

---

## 🔐 Security Implementation

### Authentication & Authorization
```typescript
// Passport.js local strategy
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  // Authentication logic
}));
```

### Security Middleware Stack
```typescript
// Express security configuration
app.use(helmet());                    // Security headers
app.use(cors(corsOptions));          // CORS protection
app.use(rateLimit(rateLimitOptions)); // Rate limiting
app.use(session(sessionConfig));      // Session management
```

### Input Validation
```typescript
// Zod schema validation
const violationSchema = z.object({
  unit_id: z.number(),
  violation_type: z.string().min(1),
  description: z.string().optional(),
});
```

---

## 🚀 Development Workflow

### Local Development Setup
```bash
# Clone and start
git clone https://github.com/dcook604/StrataTracker.git
cd StrataTracker
sudo docker compose up --build

# Access application
# Frontend/Backend: http://localhost:3001
# Database: localhost:5432
```

### Development Commands
```bash
# View logs
sudo docker compose logs backend
sudo docker compose logs db

# Rebuild containers
sudo docker compose build --no-cache

# Reset database
sudo docker compose down -v
sudo docker compose up --build
```

### Code Organization
- **Shared Types**: TypeScript interfaces in `/shared`
- **API Routes**: RESTful endpoints in `/server/routes`
- **React Components**: Modular components in `/client/src/components`
- **Database Operations**: Drizzle ORM queries

---

## 📊 Performance Considerations

### Frontend Optimization
- **Vite Build**: Fast development and optimized production builds
- **Code Splitting**: Automatic route-based splitting
- **Asset Optimization**: Vite handles CSS/JS minification
- **PWA Features**: Service worker and manifest for offline capability

### Backend Optimization
- **Connection Pooling**: PostgreSQL connection pool management
- **Static File Serving**: Express static middleware for assets
- **Session Storage**: PostgreSQL-backed session store
- **Error Handling**: Comprehensive error boundaries and logging

### Database Optimization
- **Indexing**: Primary keys and foreign key constraints
- **Connection Management**: Pool configuration for concurrent requests
- **Migration Strategy**: Incremental schema updates

---

## 🔧 Configuration Management

### Environment Variables
```env
# Database
DATABASE_URL=postgres://spectrum4:spectrum4password@db:5432/spectrum4

# Application
NODE_ENV=production
SESSION_SECRET=your-session-secret
PUBLIC_BASE_URL=http://localhost:3001

# Optional: SMTP settings for email notifications
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

### Docker Configuration
```yaml
# docker-compose.yml
services:
  backend:
    build: .
    ports:
      - "3001:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://spectrum4:spectrum4password@db:5432/spectrum4
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: spectrum4
      POSTGRES_USER: spectrum4
      POSTGRES_PASSWORD: spectrum4password
    volumes:
      - db_data:/var/lib/postgresql/data
```

---

## 🚀 Deployment Strategy

### Production Deployment
1. **Environment Setup**: Configure production environment variables
2. **HTTPS Configuration**: Use reverse proxy (Nginx/Caddy)
3. **Database Security**: Change default credentials
4. **Monitoring**: Set up application and database monitoring
5. **Backups**: Implement regular database backup strategy

### Scaling Considerations
- **Horizontal Scaling**: Multiple backend containers behind load balancer
- **Database Scaling**: Read replicas for read-heavy workloads
- **Static Assets**: CDN for static file delivery
- **Session Storage**: Redis for distributed session management

---

## 🔍 Monitoring & Debugging

### Logging Strategy
```typescript
// Structured logging with Winston
logger.info('Database connection established', {
  database: 'spectrum4',
  connectionCount: pool.totalCount
});
```

### Health Checks
- **Database Connectivity**: Connection pool monitoring
- **Application Status**: Express server health endpoints
- **Container Health**: Docker health check configuration

### Error Handling
- **React Error Boundaries**: Frontend error containment
- **Express Error Middleware**: Centralized backend error handling
- **Database Error Recovery**: Connection retry logic

---

## 📈 Future Enhancements

### Planned Features
- **Real-time Notifications**: WebSocket integration
- **Advanced Reporting**: Data visualization and analytics
- **Mobile App**: React Native companion app
- **API Documentation**: OpenAPI/Swagger integration
- **Testing Suite**: Comprehensive unit and integration tests

### Technical Improvements
- **Caching Layer**: Redis for improved performance
- **Message Queue**: Background job processing
- **Microservices**: Service decomposition for scalability
- **CI/CD Pipeline**: Automated testing and deployment

---

This technical overview reflects the current state of StrataTracker after successful migration from Replit to a containerized local development environment. The application is now production-ready and easily deployable across different environments. 