# Spectrum 4 Violation System – Technical Overview

## Table of Contents
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Backend Overview](#backend-overview)
- [Frontend Overview](#frontend-overview)
- [Database Schema](#database-schema)
- [Security Model](#security-model)
- [DevOps & Deployment](#devops--deployment)
- [Development Scripts](#development-scripts)
- [Extensibility & Contribution](#extensibility--contribution)

---

## Architecture

- **Full-stack TypeScript**: Shared types and validation between client and server.
- **Backend**: Node.js, Express, Drizzle ORM, PostgreSQL.
- **Frontend**: React, Wouter (routing), TanStack Query, custom UI components.
- **DevOps**: Docker, Docker Compose, PM2, scripts for admin/test setup.
- **Security**: Auth, RBAC, rate limiting, CORS, Helmet, error boundaries, password reset, account lockout.

---

## Project Structure

```
/ (root)
├── client/         # React SPA frontend
├── server/         # Express backend API
├── shared/         # Shared types and DB schema (Drizzle + Zod)
├── db/init/        # SQL scripts for DB initialization
├── scripts/        # Node scripts for admin/test setup, DB checks
├── public/         # Static assets (images, icons, etc.)
├── Dockerfile, docker-compose.yml
└── README.md, docs/
```

---

## Key Features

| Area         | Features                                                                 |
|--------------|--------------------------------------------------------------------------|
| Auth         | Admin-managed, password reset, account lockout, RBAC                     |
| Violations   | Reporting, evidence upload, status tracking, PDF generation              |
| Units        | Add/search units, assign tenants/owners, facilities fields               |
| Users        | Add/edit/lock/remove, roles (admin, council, user), invite by email      |
| Categories   | Manage violation categories, bylaw references, default fines             |
| Reports      | Dashboard stats, export, filtering                                       |
| Settings     | Email/SMTP, system, user management, access control                      |
| PWA          | Installable, manifest/icons, offline support (service worker ready)      |
| Security     | Helmet, CORS, rate limiting, error boundaries, input validation          |
| DevOps       | Docker, PM2, scripts, environment variable management                    |

---

## Backend Overview

- **Entry Point:** `server/index.ts` (Express app, error handling, static serving, Vite integration for dev)
- **API Routes:** Modularized in `server/routes/` (e.g., user-management, email-config)
- **Business Logic:** Centralized in `server/storage.ts` (DB access, user/unit/violation management)
- **Middleware:** Logging, error handling, authentication, performance monitoring
- **Email:** SMTP integration for notifications, password reset, invitations
- **Database:** PostgreSQL, schema defined in `shared/schema.ts`, migrations in `db/init/`

---

## Frontend Overview

- **Entry Point:** `client/src/main.tsx` (LogRocket init, renders `App`)
- **Routing:** Wouter, routes defined in `client/src/App.tsx`
- **Pages:**
  - Dashboard, Violations (list/detail/new), Reports, Units, Categories, Settings, User Profile, Auth, Public Comment
- **State/Data:** TanStack Query for API data, React context for auth
- **UI:** Custom components in `client/src/components/`, shadcn/ui, error boundaries
- **PWA:** Manifest, icons, service worker ready

---

## Database Schema

- **Defined in:** `shared/schema.ts` (Drizzle ORM + Zod)
- **Core Tables:**
  - `users`, `customers` (units), `violations`, `violation_categories`, `system_settings`, `violation_histories`, `unit_facilities`, `persons`, `unit_person_roles`, etc.
- **Validation:** Zod schemas for inserts/updates
- **Migrations:** SQL scripts in `db/init/`

---

## Security Model

- **Authentication:** Session-based, password hashing, reset tokens, force password change
- **Authorization:** Role-based (admin, council, user), protected API routes and frontend routes
- **Input Validation:** Zod schemas, server-side checks
- **Rate Limiting:** Express middleware
- **CORS & Headers:** Helmet, CORS restricted in production
- **Error Handling:** Centralized error boundaries (frontend) and middleware (backend)
- **Account Lockout:** After failed login attempts

---

## DevOps & Deployment

- **Docker:** Containerized backend, frontend, and PostgreSQL
- **PM2:** For process management in non-Docker production
- **Environment Variables:** Managed via `.env` and `.env.example`
- **Static Files:** Served from `client/public/`
- **Backups:** PostgreSQL volume/data
- **Monitoring:** LogRocket (frontend), extensible for Sentry, UptimeRobot, etc.

---

## Development Scripts

- **Location:** `scripts/`
- **Examples:**
  - `add-custom-admin.ts`, `add-test-admin.ts`: Add admin users
  - `check-db.ts`, `test-db-connection.ts`: DB health checks
  - `fix-admin.ts`: Admin account fixes

---

## Extensibility & Contribution

- **Shared Types:** All models/types in `shared/` for type safety across stack
- **API:** Modular, easy to extend with new routes/controllers
- **Frontend:** Component-based, easy to add new pages/routes
- **Testing:** (Add tests as needed; see README for recommendations)
- **Docs:** Expand this file or add more in `docs/` as project grows

---

For more details, see the main [README.md](../README.md) or explore the codebase. 