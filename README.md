# Spectrum 4 Violation System

A complete violation management system for property managers, with user authentication, violation tracking, reporting, and PWA support.

---

## Features
- User authentication (admin-managed)
- Violation reporting and evidence upload
- Unit and user management
- Responsive UI, PWA-ready
- Secure (Helmet, CORS, rate limiting)
- Error boundaries for robust UX
- PM2 process management (recommended for production)

---

## Requirements

- **Node.js**: >=18.x
- **npm**: >=9.x
- **Database**: PostgreSQL (or your configured DB)
- **Other**:
  - [PM2](https://pm2.keymetrics.io/) (for production process management)
  - [ts-node](https://typestrong.org/ts-node/) (if running TypeScript directly)
  - SMTP server (for email notifications)

---

## Setup

1. **Clone the repository**
   ```sh
   git clone <your-repo-url>
   cd <your-repo>
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env` and fill in all required values.

4. **Build the app**
   ```sh
   npm run build
   ```

5. **Run in development**
   ```sh
   npm run dev
   ```

6. **Run in production (recommended: PM2)**
   ```sh
   pm2 start dist/index.js --name spectrum4
   # or, for TypeScript:
   pm2 start server/index.ts --name spectrum4 --interpreter $(which ts-node)
   ```

---

## Deployment

- **HTTPS**: Use a reverse proxy (Nginx, Caddy) for SSL.
- **Static files**: Served from `client/public/`.
- **PWA**: Manifest and icons are included.
- **Process management**: Use PM2 for zero-downtime restarts and monitoring.

---

## Security & Best Practices

- Helmet for HTTP security headers
- CORS restricted in production
- Rate limiting enabled
- All secrets/config in `.env`
- Error boundaries in React
- Regular DB backups recommended

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

See `.env.example` for all required variables.

---

## Additional Recommendations

- **Automated tests**: Add/expand as needed.
- **Monitoring**: Integrate with Sentry, UptimeRobot, etc.
- **Image optimization**: Compress all images in `client/public/`.
- **Accessibility**: Review UI for a11y best practices.

---

## License

MIT (or your chosen license)

## Settings Page Tabs

The Settings page now includes the following tabs (visible to Administrators and Council Members):

- **Email Settings**: Configure notification sender, enable/disable notifications, customize email subjects and footer.
- **System Settings**: General system-wide preferences (future expansion).
- **SMTP Settings**: Configure the outgoing email (SMTP) server, including host, port, authentication, and sender address. Test email delivery directly from this tab.
- **User Management**: Add, edit, lock, or remove user accounts and assign roles.

**Access:** Only users with the Administrator or Council Member role can view and modify these settings. Regular users will not see the Settings page or its tabs. 