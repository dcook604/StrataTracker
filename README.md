# StrataTracker - Property Violation Management System

A full-stack property violation management system for property managers, with user authentication, violation tracking, reporting, and PWA support.

**Recently migrated from Replit to local Docker development environment.**

---

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- **Docker**: Version 20.10+ 
- **Docker Compose**: V2 (use `docker compose` not `docker-compose`)
- **Git**: For cloning the repository

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/dcook604/StrataTracker.git
   cd StrataTracker
   ```

2. **Start the application**
   ```bash
   sudo docker compose up --build
   ```
   
   The application will be available at:
   - **Frontend/Backend**: http://localhost:3001
   - **Database**: PostgreSQL on localhost:5432

3. **First-time setup:**
   - Database schema is automatically created from Drizzle migrations
   - An admin user is created during initialization:
     - **Email**: admin@spectrum4.com
     - **Password**: admin123
   - **⚠️ Important**: Change the default admin password after first login!

### Stopping the Application
```bash
sudo docker compose down
```

To also remove the database volume (fresh start):
```bash
sudo docker compose down -v
```

---

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 15
- **ORM**: Drizzle ORM
- **Containerization**: Docker + Docker Compose V2
- **UI Components**: Radix UI + Tailwind CSS

### Project Structure
```
├── client/                 # React frontend
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   └── index.html         # Entry point
├── server/                # Express backend
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utilities
│   └── index.ts           # Server entry point
├── shared/                # Shared types and schemas
├── migrations/            # Drizzle database migrations
├── db/init/              # Database initialization scripts
├── docker-compose.yml    # Docker services configuration
├── Dockerfile            # Container build instructions
└── vite.config.ts        # Vite configuration
```

---

## 🔧 Development

### Local Development (without Docker)

If you prefer to run without Docker:

1. **Prerequisites**
   - Node.js 18+
   - PostgreSQL 15+
   - npm 9+

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Run database migrations**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Available Scripts

| Script              | Description                           |
|---------------------|---------------------------------------|
| `npm run dev`       | Start development server              |
| `npm run build`     | Build for production                  |
| `npm start`         | Start production server               |
| `npm run check`     | TypeScript type checking              |
| `npm run db:push`   | Push database schema changes          |

### Starting Development with `start-server.sh`

If you want to start the development server with Onboardbase secrets and automatic port cleanup, use the provided script:

```bash
./start-server.sh
```

**What this script does:**
- Kills any processes running on ports 3001 and 3002 (to avoid conflicts)
- Waits for ports to be freed
- Starts the dev server on port 3002 using Onboardbase secrets
**Note:**
- Make sure you have `npx` and `onboardbase` installed (see project dependencies)
- The script is executable; if not, run `chmod +x start-server.sh` first

---

## 🐳 Docker Configuration

### Services

- **backend**: Node.js application (port 3001 → 3000)
- **db**: PostgreSQL 15 database (port 5432)

```env
NODE_ENV=production
DATABASE_URL=postgres://spectrum4:spectrum4password@db:5432/spectrum4
SESSION_SECRET=your-session-secret
PUBLIC_BASE_URL=http://localhost:3001
```

---

## 🔄 Migration from Replit

This application was successfully migrated from Replit to a local Docker environment. Key changes made:

### Removed Replit Dependencies
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-runtime-error-modal`

### Database Migration
- **From**: Neon cloud database (`@neondatabase/serverless`)
- **To**: Local PostgreSQL with standard `pg` driver

### Build System Updates
- Fixed ES module/CommonJS compatibility issues
- Updated Vite configuration for local development
- Resolved `import.meta.dirname` bundling issues

### Docker Compatibility
- Updated to Docker Compose V2
- Fixed container configuration issues
- Added proper volume mounts for migrations

---

## 🚀 Features

- **User Authentication**: Admin-managed user accounts
- **Violation Management**: Report, track, and manage property violations
- **Evidence Upload**: Photo and document attachment support
- **Unit Management**: Property unit and tenant/owner assignment
- **Responsive Design**: Mobile-friendly PWA
- **Email Notifications**: SMTP-based notification system
- **Role-based Access**: Admin, Council Member, and User roles
- **Reporting**: Violation statistics and reporting
- **Security**: Helmet, CORS, rate limiting, session management

---

## 🔒 Security Features

- **HTTP Security Headers**: Helmet.js integration
- **CORS Protection**: Configurable cross-origin policies
- **Rate Limiting**: API endpoint protection
- **Session Management**: Secure session handling
- **Input Validation**: Zod schema validation
- **Error Boundaries**: React error boundary protection
- **Environment Variables**: Secure configuration management

---

## 📊 Settings & Administration

### Admin Features (Settings Page)

- **Email**: admin@spectrum4.com
- **Password**: admin123
- **⚠️ Change immediately after first login!**

---

## 🔧 Troubleshooting


# All logs
sudo docker compose logs
```


