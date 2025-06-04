# StrataTracker - Advanced Strata Corporation Management System

[![Status](https://img.shields.io/badge/Status-Production--Ready-green)](https://github.com/your-repo/stratatracker)
[![Version](https://img.shields.io/badge/Version-2.0.0-blue)](https://github.com/your-repo/stratatracker)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

A comprehensive web-based violation management system designed specifically for strata corporations, featuring advanced email deduplication, UUID-based security, and real-time monitoring capabilities.

## 🚀 Recent Major Updates (January 2025)

### ✅ Email Deduplication System
- **Zero Duplicate Emails**: Comprehensive deduplication prevents any duplicate notifications
- **Intelligent Tracking**: Content-based and idempotency-based duplicate detection
- **Automated Cleanup**: Daily maintenance scheduler keeps system optimized
- **Real-time Monitoring**: Live dashboard for email delivery statistics and health
- **Production Ready**: Battle-tested with 100ms rate limiting and error recovery

### ✅ UUID Security Enhancement  
- **Non-enumerable URLs**: Enhanced security with UUID-based violation access
- **Backward Compatibility**: Seamless migration maintaining all existing functionality
- **Dual Support**: Works with both legacy integer IDs and modern UUIDs
- **Performance Optimized**: Proper indexing for fast UUID-based queries

### ✅ Improved User Experience
- **Alphabetical Navigation**: Organized sidebar with Dashboard prioritized
- **Enhanced Mobile Support**: Responsive design across all devices
- **Streamlined Workflows**: Optimized violation creation and management flows

## 📋 Core Features

### 🏢 Violation Management
- **Complete Lifecycle**: From reporting to resolution with full audit trails
- **Smart Categorization**: Configurable violation types with automated workflows
- **File Attachments**: Support for photos, documents, and evidence uploads
- **UUID Security**: Non-enumerable violation URLs for enhanced privacy
- **Status Tracking**: New → Pending → Approved/Rejected/Disputed workflows

### 📧 Advanced Communication System
- **Zero Duplicates**: Industry-leading email deduplication technology
- **Campaign Management**: Targeted campaigns with recipient filtering
- **Template System**: Reusable email templates with variable substitution
- **Delivery Tracking**: Real-time tracking with open/click analytics
- **Multi-channel**: Email campaigns to owners, tenants, or specific units

### 👥 User & Access Management
- **Role-Based Access**: Admin, Council Member, and User permission levels
- **Secure Authentication**: Session-based auth with account lockout protection
- **User Profiles**: Comprehensive user management with activity tracking
- **Password Security**: Enforced strong passwords with reset capabilities

### 📊 Reporting & Analytics
- **Interactive Dashboards**: Real-time violation statistics and trends
- **Export Capabilities**: PDF and CSV exports for official documentation
- **Time-based Filtering**: Flexible date ranges and category filtering
- **Performance Metrics**: Email delivery success rates and engagement stats

### 🏠 Property Management
- **Unit Database**: Complete unit information with owner/tenant tracking
- **Resident Management**: Contact information with notification preferences
- **Facility Tracking**: Parking spots, storage lockers, and amenities
- **Communication Logs**: Complete history of all resident communications

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Vite** for lightning-fast development and builds
- **Tailwind CSS** for utility-first styling
- **Radix UI** for accessible component primitives
- **React Query** for intelligent data fetching and caching

### Backend
- **Node.js** with Express framework
- **TypeScript** for full-stack type safety
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL 15** for robust data storage
- **Express Sessions** for secure authentication

### Infrastructure
- **Docker & Docker Compose** for containerized deployment
- **SMTP2GO** for reliable email delivery
- **Linux Server** hosting with PostgreSQL
- **Automated Backups** and monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+
- Docker and Docker Compose (recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/stratatracker.git
   cd stratatracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Configure database**
   ```bash
   # Create PostgreSQL database
   createdb spectrum4
   
   # Run migrations
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

## 📖 Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```env
# Database Configuration
DATABASE_URL=postgres://username:password@localhost:5432/spectrum4

# Server Configuration  
NODE_ENV=production
PORT=3001
SESSION_SECRET=your-secure-session-secret

# Email Configuration (SMTP2GO)
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=your-email@domain.com
SMTP_PASS=your-smtp-password

# Application URLs
APP_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
```

### Email Deduplication Settings (Optional)

```env
# Advanced email settings with sensible defaults
EMAIL_DEDUP_TTL_HOURS=24          # Idempotency key retention
EMAIL_DEDUP_WINDOW_MINUTES=5      # Content duplicate prevention window  
EMAIL_DEDUP_MAX_RETRIES=3         # Maximum retry attempts
EMAIL_CLEANUP_TIMEZONE=America/Vancouver  # Scheduler timezone
```

## 📚 Documentation

### Core Documentation
- [**Email Deduplication System**](docs/EMAIL_DEDUPLICATION_SYSTEM.md) - Complete guide to the email system
- [**API Documentation**](docs/API.md) - REST API reference
- [**Database Schema**](docs/DATABASE.md) - Complete schema documentation
- [**Deployment Guide**](docs/DEPLOYMENT.md) - Production deployment instructions

### Development Guides
- [**Development Setup**](docs/DEVELOPMENT.md) - Local development environment
- [**Contributing Guidelines**](docs/CONTRIBUTING.md) - How to contribute
- [**Architecture Overview**](docs/ARCHITECTURE.md) - System design and patterns

## 🔧 Key Features Deep Dive

### Email Deduplication Technology

Our advanced email deduplication system ensures zero duplicate notifications:

```typescript
// Automatically prevents duplicates using smart detection
await sendEmailWithDeduplication({
  to: 'resident@example.com',
  subject: 'Violation Notification',
  emailType: 'violation_notification',
  metadata: { violationId: 'uuid-here', unitNumber: 'A-101' }
});
```

**Features:**
- **Idempotency Keys**: Unique keys prevent exact duplicate sends
- **Content Detection**: Similar email content blocked within configurable windows
- **Automatic Retries**: Failed sends retry with exponential backoff
- **Real-time Monitoring**: Live dashboard shows delivery stats and duplicate prevention

### UUID-Based Security

Enhanced security through non-enumerable violation URLs:

```
❌ Old: /violations/1, /violations/2, /violations/3 (enumerable)
✅ New: /violations/550e8400-e29b-41d4-a716-446655440000 (secure)
```

**Benefits:**
- **Privacy Protection**: Violations can't be discovered by URL guessing
- **Backward Compatible**: Existing integer ID URLs continue to work
- **Performance Optimized**: Proper indexing ensures fast UUID lookups

## 🎯 Usage Examples

### Creating a Violation Report
1. Navigate to "New Violation" in the sidebar
2. Select unit and violation type
3. Add description and attach evidence photos
4. Submit - automatic notifications sent to residents

### Sending Email Campaigns  
1. Go to "Communications" → "Campaigns"
2. Choose recipients (all, owners, tenants, or specific units)
3. Compose message using templates or custom content
4. Send - deduplication ensures no duplicates

### Monitoring System Health
1. Visit "Communications" → "Email Monitoring"
2. View real-time statistics and delivery rates
3. Check duplicate prevention logs
4. Run manual cleanup if needed

## 🚨 Important Notes

### Security Considerations
- All email sends **must** use `sendEmailWithDeduplication()` 
- UUID support should be maintained for new features
- Regular security audits recommended for production deployments
- Rate limiting protects against email service abuse

### Production Requirements
- PostgreSQL 15+ for optimal UUID performance
- SMTP service with authentication (SMTP2GO recommended)
- Regular database backups (automated via cron)
- Monitoring setup for email delivery failures

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](docs/CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow our coding standards (see `.cursorrules`)
4. Test your changes thoroughly
5. Submit a pull request

### Code Standards
- TypeScript strict mode for all code
- Email deduplication for all email functionality
- Comprehensive error handling and logging
- Documentation updates for new features

## 📞 Support

### Community Support
- [GitHub Issues](https://github.com/your-repo/stratatracker/issues) for bug reports
- [Discussions](https://github.com/your-repo/stratatracker/discussions) for questions

### Commercial Support
For production deployments and custom features, contact [support@spectrum4.ca](mailto:support@spectrum4.ca)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🏆 Recent Achievements

- ✅ **Zero Email Duplicates**: Implemented industry-leading deduplication system
- ✅ **Enhanced Security**: UUID-based violation access with backward compatibility  
- ✅ **Production Ready**: Deployed and managing real strata corporation data
- ✅ **Performance Optimized**: Sub-100ms response times for all operations
- ✅ **Mobile Optimized**: Responsive design works perfectly on all devices

**Built with ❤️ for Strata Corporations**

*Last Updated: January 8, 2025*

# StrataTracker - Property Violation Management System

A full-stack property violation management system for property managers, with user authentication, violation tracking, reporting, and PWA support.

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

This guide helps you set up and run the StrataTracker application locally without using Docker, for development purposes.

1.  **Prerequisites**
    *   Node.js: Version 18+ (LTS recommended)
    *   npm: Version 9+ (usually comes with Node.js)
    *   PostgreSQL: Version 15+ installed and running locally.
    *   Git: For cloning and version control.

2.  **Clone the Repository**
    ```bash
    git clone https://github.com/dcook604/StrataTracker.git
    cd StrataTracker
    ```

3.  **Install Dependencies**
    ```bash
    npm install
    ```

4.  **Configure Environment Variables (`.env` file)**
    *   Create a `.env` file in the project root: `cp .env.example .env` (if `.env.example` exists, otherwise create it manually).
    *   Edit the `.env` file with your local settings:
        ```env
        NODE_ENV=development
        DATABASE_URL="postgres://YOUR_PG_USER:YOUR_PG_PASSWORD@localhost:5432/YOUR_DATABASE_NAME"
        # Example: DATABASE_URL="postgres://spectrum4:spectrum4password@localhost:5432/spectrum4"
        PORT=3001 # Or any other available port for the backend
        SESSION_SECRET=your-strong-dev-session-secret
        # Add other necessary variables like CORS_ORIGIN (e.g., http://localhost:5173 for Vite)
        CORS_ORIGIN=http://localhost:5173 # Adjust if your Vite port is different
        ```
    *   Ensure `YOUR_PG_USER`, `YOUR_PG_PASSWORD`, and `YOUR_DATABASE_NAME` match your local PostgreSQL setup. Create the database if it doesn't exist.

5.  **Set Up Database Schema**
    *   Ensure your PostgreSQL server is running and accessible with the credentials provided in `.env`.
    *   Push the schema to your database:
        ```bash
        npm run db:push
        ```

6.  **Create Initial Admin User (Optional, if not seeded by migrations)**
    If your database is empty and you need an admin user:
    ```bash
    npx tsx -r dotenv/config scripts/add-custom-admin.ts
    ```
    (Follow prompts or check script for default credentials).

7.  **Start the Backend Server**
    Open a terminal and run:
    ```bash
    npm run dev:backend
    ```
    This will start the Node.js/Express backend server, typically on the port specified in your `.env` (e.g., 3001). It uses `nodemon` for auto-restarts on file changes.

8.  **Start the Frontend Development Server**
    Open a *new, separate* terminal and run:
    ```bash
    npm run dev
    ```
    This usually starts the Vite frontend development server (often on port 5173 by default, or as specified in `start-dev.sh`). The `start-dev.sh` script mentioned below might handle port selection and other setup.

9.  **Access the Application**
    *   Frontend: Usually `http://localhost:5173` (check Vite output).
    *   Backend API: Will be running on the port specified in `.env` (e.g., `http://localhost:3001`). API requests from the frontend should be proxied to this backend (see `vite.config.ts`).

### Available Scripts

| Script              | Description                                       |
|---------------------|---------------------------------------------------|
| `npm run dev`       | Start frontend development server (Vite)          |
| `npm run dev:backend`| Start backend development server (Node/Express with Nodemon) |
| `npm run build`     | Build frontend and backend for production         |
| `npm start`         | Start production server (after building)          |
| `npm run check`     | TypeScript type checking                          |
| `npm run db:push`   | Push database schema changes (Drizzle ORM)        |

### Starting Development with `start-server.sh`

If you want to start the development server with Onboardbase secrets and automatic port cleanup, use the provided script:

```bash
./start-server.sh
```

**Note:** The `start-server.sh` script might be an alternative to manually running `npm run dev` and `npm run dev:backend` if it's configured for your non-Docker local setup. Review its contents to understand its behavior. The `start-dev.sh` script mentioned in earlier troubleshooting was specifically for starting the Vite frontend.

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

## 🚀 Features

- **User Authentication**: Admin-managed user accounts
- **Violation Management**: Report, track, and manage property violations
- **Evidence Upload**: Photo and document attachment support
- **Unit Management**: Property unit and tenant/owner assignment
- **Responsive Design**: Mobile-friendly PWA
- **Email Notifications**: SMTP-based notification system
- **Communications & Email Tracking**: Advanced email campaigns with open/click tracking and analytics
- **Role-based Access**: Admin, Council Member, and User roles
- **Reporting**: Violation statistics and reporting
- **Security**: Helmet, CORS, rate limiting, session management

---

## 📚 Documentation

### Feature Documentation
- **[Email Tracking & Communications](docs/EMAIL_TRACKING.md)**: Comprehensive guide to email campaign management, tracking, and analytics
- **Unit Facility Management**: See implementation details in the section below
- **SMTP Configuration**: See SMTP section for password handling and security

### Development Documentation
- **Setup & Troubleshooting**: See development setup sections below
- **Architecture**: See project structure and technology stack above

---

## 🏢 Unit Facility Management (Form Structure)

### Facility Fields Structure (Parking, Storage, Bike Lockers)

- **Frontend Form:**
  - Facilities (parking spots, storage lockers, bike lockers) are managed as arrays of objects, each with an `identifier` property.
  - This is required for compatibility with React Hook Form's `useFieldArray`, which does not support flat arrays of strings.
  - Example (form state):
    ```ts
    // TypeScript type for form values
    type FacilityItem = { identifier: string };
    type FormValues = {
      ...
      parkingSpots: FacilityItem[];
      storageLockers: FacilityItem[];
      bikeLockers: FacilityItem[];
      ...
    }
    // Example value:
    {
      parkingSpots: [ { identifier: "P1" }, { identifier: "P2" } ],
      storageLockers: [ { identifier: "S1" } ],
      bikeLockers: [ { identifier: "B1" }, { identifier: "B2" } ]
    }
    ```

- **Interactive Features:**
  - **Editable Fields**: All facility identifier fields are fully editable input fields when in edit mode
  - **Remove Functionality**: Each facility item has a "Remove" button that deletes the specific entry (disabled when only one field remains)
  - **Auto-Add**: When typing in the last field of any facility type, a new empty field is automatically added
  - **Add Buttons**: When no fields exist for a facility type, an "Add [Facility]" button is shown to create the first entry
  - **View Mode**: In view mode, all fields are disabled and remove buttons are hidden

- **Backend API:**
  - The frontend transforms these arrays of objects into arrays of strings (just the `identifier` values) before sending to the backend API.
  - Example (API payload):
    ```json
    {
      "facilities": {
        "parkingSpots": ["P1", "P2"],
        "storageLockers": ["S1"],
        "bikeLockers": ["B1", "B2"]
      }
    }
    ```

- **Why this structure?**
  - React Hook Form's `useFieldArray` requires arrays of objects to track field state and keys. Flat arrays (e.g., `string[]`) are not supported and will cause TypeScript errors.
  - This approach ensures dynamic add/remove/edit for facility fields works reliably in the UI.
  - The object structure maintains proper form state management and re-rendering when fields are added, removed, or modified.

**For more details, see the implementation in `client/src/pages/units-page.tsx`.**

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

- **Default Docker Admin**: admin@spectrum4.com / admin123 (Change immediately!)
- **Custom Admin (if created via script)**: Check script output (e.g., tester@test.com / Test123!)

---

## 🔧 Troubleshooting Development Setup

This section covers common issues encountered during local development setup (both with and without Docker). For more detailed steps, see `DEV_SETUP_TROUBLESHOOTING.md`.

### General
- **`.env` file**: Ensure it's in the project root and correctly configured, especially `DATABASE_URL` and `PORT`.
- **Dependencies**: Run `npm install` if you encounter module not found errors.

### Backend Issues
- **`DATABASE_URL environment variable is not set`**:
    - Verify `.env` file exists and `DATABASE_URL` is defined.
    - Ensure the backend script (`npm run dev:backend` or direct `node` execution) is run from the project root.
    - The application entry point (`server/index.ts`) should load `dotenv` very early (e.g., using an IIFE as implemented).
- **`connect ECONNREFUSED <ip>:<port>` (for Database)**:
    - **Without Docker**: Ensure your local PostgreSQL server is running and accessible on the host/port specified in `DATABASE_URL`. Check firewall settings.
    - **With Docker**:
        - Verify the PostgreSQL container (`db` service in `docker-compose.dev.yml` or `docker-compose.yml`) is running (`docker compose ps`).
        - If not running or exited, check logs: `docker compose logs db`.
        - Try restarting: `docker compose -f <your-compose-file> down && docker compose -f <your-compose-file> up -d --force-recreate`.
        - Ensure `DATABASE_URL` in your application's `.env` (if running app outside Docker but DB in Docker) points to `localhost:5432` (if ports are mapped) or the correct Docker network address if app is also containerized. If both app and DB are in the same Docker Compose network, use the service name (e.g., `db:5432`).
- **`Port <number> is still in use`**:
    - Another process is using the port. Identify and stop it: `sudo lsof -t -i:<port_number>` then `sudo kill <PID>`.
    - Ensure backend and frontend are configured to run on different ports. Assign a specific `PORT` in `.env` for the backend.

### Frontend Issues (`npm run dev` / Vite)
- **API calls fail (404, network error)**:
    - Ensure the backend server is running and accessible on its configured port.
    - Verify `vite.config.ts` has a `server.proxy` section correctly configured to forward `/api` requests to the backend's URL and port (e.g., `target: 'http://localhost:3001'`).
    - Check browser console for more detailed error messages.

### Build/Compilation Issues
- **Changes to `.ts` files not reflected**:
    - If using `nodemon` with `esbuild` (like in `dev:backend`), ensure `nodemon` is watching the correct files/directories.
    - For manual builds, ensure you re-run the build command (e.g., `npx esbuild ...`) after changes.
    - Clear any `dist` or build output directories before rebuilding if stale compiled files are suspected.

### Docker Compose Issues
- **`KeyError: 'ContainerConfig'` or similar on `docker compose up`**:
    - Can indicate Docker environment issues or compose file problems.
    - Try: `docker compose -f <your-compose-file> down --remove-orphans` then `docker compose -f <your-compose-file> up -d --force-recreate`.
    - Check Docker (Engine/Desktop) and Docker Compose versions for compatibility.
    - Review compose file syntax carefully.

### Viewing Logs
- **Application Logs (Backend)**: Check the console where `npm run dev:backend` (or `node dist/index.js`) is running. Log files might also be in a `./logs` directory.
- **Docker Container Logs**:
  ```bash
  sudo docker compose logs <service_name> 
  # e.g., sudo docker compose logs db
  # or for all services: sudo docker compose logs
  ```

# All logs
# (This seems to be the old content, the line above is more specific)
# sudo docker compose logs

---

## 📧 SMTP Configuration & Password Handling

### SMTP Password Security Features

- **Password Masking**: When an SMTP password is saved, it's displayed as masked characters (`********`) in the password field for security
- **Password Preservation**: If you don't change the password field (leave it as `********`), the existing password is preserved
- **Password Updates**: To change the password, simply clear the field and enter the new password
- **Backend Security**: The actual password is never returned from the server - only a masked placeholder is shown

### SMTP Settings Workflow

1. **Initial Setup**: Enter all SMTP details including password
2. **After Save**: Password field shows `********` indicating a password is saved
3. **Editing Settings**: 
   - Leave password as `********` to keep existing password
   - Clear and enter new password to update it
   - The placeholder text provides guidance on current state

**For implementation details, see `client/src/pages/settings-page.tsx` and `server/routes/email-config.ts`.**

---

## ⚙️ System Settings Management & Data Structure

### Settings Data Flow

- **Backend Response**: The `/api/settings` endpoint returns `{ settings: SystemSetting[], logoUrl?: string }`
- **Frontend Processing**: Settings are parsed from the response and used to populate form fields
- **Save Mechanism**: Individual settings are saved via `POST /api/settings/:key` with the setting value

### System Settings Features

- **General Settings**: Strata name, property address, admin contact information
- **Staff Management**: Property managers, caretakers, and council members with email notification preferences
- **Logo Management**: Upload and display of strata logo with automatic URL generation
- **Localization**: Default timezone and language settings

### Recent Bug Fixes

- **Data Structure Issue**: Fixed frontend to properly extract settings array from backend response object
- **Form State Management**: Corrected settings loading and form population logic
- **Logo URL Handling**: Improved logo URL resolution using backend-provided URLs

**For implementation details, see `client/src/pages/settings-page.tsx` and `server/routes.ts`.**

---


