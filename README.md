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


