# Spectrum 4 Violation System

A full-stack property violation management system for property managers, with user authentication, violation tracking, reporting, and PWA support.

---

## 🚀 Quick Start with Docker (Recommended)

1. **Clone the repository**
   ```sh
   git clone <your-repo-url>
   cd <your-repo>
   ```
2. **Copy and configure environment variables**
   - Copy `.env.example` to `.env` and fill in all required values (see below).
3. **Start the app with Docker Compose**
   ```sh
   docker-compose up --build
   ```
   - The backend will be available at [http://localhost:3000](http://localhost:3000)
   - PostgreSQL will run on port 5432 (see `docker-compose.yml` for credentials)
4. **First-time setup:**
   - The database will be initialized with an admin user (see `db/init/01-init.sql`).
   - **Important:** Replace the default admin password hash in `01-init.sql` with a bcrypt hash of your own password before deploying to production.
   initial admin user
admin@spectrum4.com
admin123

---

## Features
- User authentication (admin-managed)
- Violation reporting and evidence upload (with static file serving)
- Unit and user management (add/search units, assign tenants/owners, facilities fields)
- Responsive UI, PWA-ready (installable, with manifest/icons)
- Secure (Helmet, CORS, rate limiting)
- Error boundaries for robust UX
- PM2 process management (for non-Docker production)
- Full Canadian address support, multiple property managers/caretakers/council
- Email notification toggles and SMTP settings

---

## Requirements (for non-Docker/manual setup)

- **Node.js**: >=18.x
- **npm**: >=9.x
- **Database**: PostgreSQL
- **Other**:
  - [PM2](https://pm2.keymetrics.io/) (for process management)
  - [ts-node](https://typestrong.org/ts-node/) (if running TypeScript directly)
  - SMTP server (for email notifications)

---

## Manual Setup (Alternative to Docker)

1. **Install dependencies**
   ```sh
   npm install
   ```
2. **Configure environment variables**
   - Copy `.env.example` to `.env` and fill in all required values.
3. **Build the app**
   ```sh
   npm run build
   ```
4. **Run in development**
   ```sh
   npm run dev
   ```
5. **Run in production (recommended: PM2)**
   ```sh
   pm2 start dist/index.js --name spectrum4
   # or, for TypeScript:
   pm2 start server/index.ts --name spectrum4 --interpreter $(which ts-node)
   ```

---

## Database Initialization
- On first run with Docker Compose, the database is initialized using scripts in `db/init/`.
- The default script (`01-init.sql`) creates an admin user. **Replace the bcrypt hash with your own password hash before production.**
- You can add more SQL scripts to this directory for further initialization.

---

## Deployment & Production Notes
- **HTTPS**: Use a reverse proxy (Nginx, Caddy) for SSL.
- **Static files**: Served from `client/public/` (including evidence uploads).
- **PWA**: Manifest and icons included; app is installable.
- **Process management**: Use PM2 or Docker for zero-downtime restarts and monitoring.
- **Backups**: Regularly back up your PostgreSQL volume/data.
- **Environment variables**: Never commit secrets; use `.env` and `.env.example`.

---

## Security & Best Practices
- Helmet for HTTP security headers
- CORS restricted in production
- Rate limiting enabled
- All secrets/config in `.env`
- Error boundaries in React
- Regular DB backups recommended
- **Sanitize and validate all user input**
- **Never hardcode credentials**

---

## Scripts

| Script            | Description                       |
|-------------------|-----------------------------------|
| `npm run dev`     | Start app in development mode     |
| `npm run build`   | Build app for production          |
| `npm start`       | Start app (use in production)     |
| `npm run lint`    | Run linter                        |
| `npm test`        | Run tests (if implemented)        |

---

## Environment Variables

See `.env.example` for all required variables. Key variables include:
- `DATABASE_URL` (Postgres connection string)
- `SESSION_SECRET` (session encryption)
- `PUBLIC_BASE_URL` (frontend URL)
- SMTP/email settings

---

## Additional Recommendations
- **Automated tests**: Add/expand as needed.
- **Monitoring**: Integrate with Sentry, UptimeRobot, etc.
- **Image optimization**: Compress all images in `client/public/`.
- **Accessibility**: Review UI for a11y best practices.
- **Service workers**: Consider for advanced PWA features.

---

## Docker & Image Notes
- `.dockerignore` is configured to keep images lean.
- Static files and evidence are served from `client/public/`.
- Database data is persisted via Docker volume (`db_data`).

---

## License

MIT (or your chosen license)

---

## Settings Page Tabs

The Settings page now includes the following tabs (visible to Administrators and Council Members):

- **Email Settings**: Configure notification sender, enable/disable notifications, customize email subjects and footer.
- **System Settings**: General system-wide preferences (future expansion).
- **SMTP Settings**: Configure the outgoing email (SMTP) server, including host, port, authentication, and sender address. Test email delivery directly from this tab.
- **User Management**: Add, edit, lock, or remove user accounts and assign roles.

**Access:** Only users with the Administrator or Council Member role can view and modify these settings. Regular users will not see the Settings page or its tabs.

---

## Recent Fixes & Resolutions

### Dashboard & Settings Page Stability

A series of issues affecting the Dashboard and Settings page have been resolved:

1.  **Dashboard Statistics Display:**
    *   **Issue:** Statistics cards on the Dashboard (Total Violations, New, Pending, etc.) were appearing blank.
    *   **Cause:** The `DashboardStats` component was not correctly accessing the nested `stats` object from the `/api/reports/stats` API response. The `useQuery` hook was returning the entire response object, and the component was attempting to read properties like `totalViolations` from this parent object where they were undefined.
    *   **Fix:** The `useQuery` hook in `client/src/components/dashboard-stats.tsx` was updated. An explicit `queryFn` was added that now processes the API response and returns the `jsonData.stats` object directly. This ensures the component receives the correct data structure for display.

2.  **Settings Page Crash (`TypeError: e.find is not a function`):**
    *   **Issue:** The Settings page was crashing with a "Something went wrong" message, and browser console logs showed a `TypeError: e.find is not a function`.
    *   **Primary Cause (Corrected in `settings-page.tsx`):**
        *   The `useEffect` hook responsible for populating the "System Settings" form (including strata name, address, logo, etc.) was incorrectly attempting to access `settings.settings` and `settings.logoUrl` as if the `settings` data (from `/api/settings`) was an object containing these properties. However, `settings` is an array (`SystemSetting[]`).
        *   **Fix:** The `useEffect` hook in `client/src/pages/settings-page.tsx` was modified to correctly treat `settings` as an array. It now iterates directly over `settings` to find the relevant `SystemSetting` objects (e.g., for 'strata_logo') and populates the form state and `logoUrl` state variable appropriately.
    *   **Preventative Measure (Corrected in `settings-page.tsx`):**
        *   The `mapSettingsToForm` helper function (used for email settings) was also made more robust.
        *   **Fix:** Added `Array.isArray(settings)` checks before calling `.find()` on the `settings` data within `mapSettingsToForm` and in the `useEffect` hook that calls it. This prevents type errors if the `/api/settings` endpoint were to return a non-array (though the primary fix ensures correct usage of the expected array).

3.  **Settings Page - Dialog Accessibility Warnings:**
    *   **Issue:** Browser console logs showed accessibility warnings for `DialogContent` components (from Radix UI, via shadcn/ui) within the User Management tab of the Settings page, indicating missing `DialogTitle` or `DialogDescription` / `aria-describedby` attributes.
    *   **Fix:** Added the required `<DialogDescription>` components to the following dialogs within `client/src/components/user-management-tab.tsx`:
        *   Add/Edit User Dialog
        *   Invite User Dialog
        *   Lock/Unlock User Account Dialog
        This ensures these dialogs are more accessible to screen reader users.

4.  **Backend API Error (`/api/violations/pending-approval` - 500 Error):**
    *   **Issue:** The API endpoint `/api/violations/pending-approval` (called by the main Layout component for notification badges) was consistently returning a 500 Internal Server Error.
    *   **Resolution Note:** While the exact backend fix details were not processed here, this issue was also reported as resolved. For future reference, server logs are located in the `logs/` directory and are essential for diagnosing such backend errors. The endpoint relies on the `dbStorage.getViolationsByStatus("pending_approval")` function in `server/storage.ts`. 