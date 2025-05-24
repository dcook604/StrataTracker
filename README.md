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

## CORS Configuration

The backend is configured to allow requests only from the production frontend domain:

```
https://strata-tracker-dcook5.replit.app
```

If you need to allow local development, you can uncomment the localhost entry in the CORS config in `server/routes.ts`:

```js
const allowedOrigins = [
  'https://strata-tracker-dcook5.replit.app',
  // 'http://localhost:3000', // Uncomment if you use local dev
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in our allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log the rejected origin for debugging
    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
```

- The CORS middleware prevents cross-origin attacks by only allowing requests from trusted domains
- `credentials: true` enables sending cookies for authentication
- Comprehensive error logging helps with debugging CORS issues

## Authentication & Session Management

### Session Configuration

The application uses express-session with the following security settings:

```js
const sessionSettings = {
  store: dbStorage.sessionStore,
  secret: sessionSecret,
  name: 'sessionId',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Refresh session with each request
  cookie: {
    maxAge: 1000 * 60 * 30, // 30 minutes (extended to 24h if "Remember Me")
    httpOnly: true,
    secure: true, // Required for HTTPS (Replit)
    sameSite: "lax",
    path: "/"
    // domain is intentionally omitted to avoid cross-domain issues
  }
};
```

### Login Loop Prevention

The authentication system includes multiple safeguards to prevent infinite login loops:

1. **Conditional Query Execution**: Authentication queries don't run on auth pages
2. **Redirect Loop Protection**: Global flags prevent multiple simultaneous redirects
3. **Proper Session Cleanup**: Complete session destruction on logout
4. **Smart Error Handling**: 401 errors are handled without triggering infinite retries
5. **React Router Integration**: Uses History API instead of window.location for navigation

### Troubleshooting Authentication Issues

#### Login Loop Symptoms
- Constant "Session expired" messages
- Unable to reach login form
- Infinite redirects between `/` and `/auth`
- Browser dev tools showing repeated 401 requests

#### Common Causes & Solutions

1. **CORS Misconfiguration**
   - Ensure frontend domain matches CORS allowedOrigins
   - Check browser network tab for CORS errors
   - Verify credentials: true is set

2. **Session Cookie Issues**
   - Confirm secure: true for HTTPS environments
   - Ensure sameSite is set to "lax"
   - Remove domain property for same-domain deployments

3. **Query Configuration Problems**
   - Check that auth queries are disabled on auth pages
   - Verify retry logic doesn't infinitely retry 401s
   - Ensure proper cache invalidation on auth state changes

4. **Component State Conflicts**
   - Multiple authentication checks running simultaneously
   - Stale React Query cache containing invalid session data
   - Race conditions between navigation and auth state updates

#### Debug Steps

1. **Check Network Tab**:
   ```
   Look for: Repeated requests to /api/auth/me
   Expected: Single request, then silence until user action
   ```

2. **Verify Session Cookies**:
   ```
   Application tab → Cookies → sessionId
   Should exist after login, be httpOnly, secure
   ```

3. **Monitor Console Logs**:
   ```
   Auth query enabled/disabled status
   Redirect prevention flags
   Session destruction confirmations
   ```

### Best Practices

- Never use window.location.href for internal navigation in React apps
- Always include credentials in CORS when using session cookies  
- Implement proper loading states to prevent authentication race conditions
- Use React Query's enabled option to conditionally run auth queries
- Clear all caches on logout to prevent stale authentication state

## Security Headers

Security headers are currently disabled during debugging but should be re-enabled in production:

```js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://replit.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));
```

---

For further details, see [Express CORS documentation](https://expressjs.com/en/resources/middleware/cors.html) and [MDN: CORS and credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#requests_with_credentials). 