# Spectrum 4 Violation System

## Overview
A modern web application for managing property violations, units/customers, and user roles for strata/condo management. Built with React, TypeScript, and a Node.js backend.

---

## Features
- **User Management**: Add, edit, and delete users with multiple roles (Administrator, Council Member, Regular User). Strict Zod schemas enforce correct validation for both creation and editing.
- **Unit/Customer Management**: Unified Add Unit/Customer flow with duplicate checking and update option, consistent across Violations and Customers sections.
- **Violation Tracking**: Create, view, and manage violations, with file attachments and status tracking.
- **Settings**: System, email, SMTP, and user management settings with client-side navigation (SPA experience, no full page reloads). Admins and council members can now configure SMTP (outgoing email server) and manage user accounts directly from the Settings page.
- **Responsive UI**: Modern, accessible, and mobile-friendly design.
- **Performance Optimizations**: Paginated queries, optimized count queries, and recommended database indexing for large datasets.
- **Security**: All sensitive logic is server-side, and user input is strictly validated and sanitized.

---

## Architecture & Patterns
- **Component-Driven**: All UI is built from small, reusable React components.
- **Strict Typing**: Uses TypeScript and Zod for runtime and compile-time safety. No `any` types in core logic.
- **Schema-Driven Forms**: All forms use Zod schemas for validation. Separate schemas for create/edit where logic differs (e.g., user password rules).
- **Unified Add Unit/Customer**: The Add Customer dialog now uses the same logic and validation as the Add Unit flow in the Violation form, ensuring consistency and DRY code.
- **Client-Side Routing**: Navigation (e.g., Settings, User Management) uses SPA routing (wouter or react-router) for a seamless experience.
- **Feedback & Accessibility**: All actions provide user feedback (toasts, confirmations), and UI is accessible (keyboard, ARIA, color contrast).
- **Backend Pagination**: All major data tables use paginated queries and optimized count queries for scalability.
- **Testing**: TDD is encouraged. Write tests for new features and bug fixes. Use mock data only in tests.

---

## Cursor Development Rules (Summary)
This project follows the [Cursor Development Rules](#) for all code and documentation:
- **Simplicity**: Prioritize clear, maintainable solutions over complexity.
- **Iteration**: Build on existing code; avoid unnecessary rewrites.
- **Focus**: Stay on task and avoid scope creep.
- **Quality**: Maintain clean, organized, well-tested, secure code.
- **Collaboration**: Communicate clearly and document all significant changes.
- **TypeScript**: Use strict typing, avoid `any`, and document complex logic with JSDoc.
- **Organization**: Keep files under 300 lines, break up large components, and follow DRY principles.
- **Testing**: Use TDD where possible, write comprehensive tests, and ensure all tests pass before merging.
- **Security**: Validate and sanitize all user input, keep secrets out of code, and use environment variables.
- **Version Control**: Commit frequently with clear messages, never commit secrets or .env files.
- **Documentation**: Update documentation with all architectural or pattern changes.

For the full rules, see the project documentation or ask a maintainer.

---

## Getting Started
1. **Install dependencies**: `npm install`
2. **Start the backend**: `npm run server`
3. **Start the frontend**: `npm run client`
4. **Access the app**: Open [http://localhost:3000](http://localhost:3000)

---

## Contributing
- Follow the Cursor rules: prioritize simplicity, maintainability, and clarity.
- Update documentation and tests with any significant code changes.
- Keep all code and UI consistent with established patterns.
- Review and refactor code for maintainability and DRYness before merging.

---

## Documentation & Maintenance
- Update this README and relevant JSDoc/comments whenever code changes impact architecture, patterns, or usage.
- Review and refactor code for maintainability and DRYness before merging.
- Never commit secrets or .env files to version control.
- Monitor performance and optimize queries and indexes as data grows.

---

## Database Migrations (Drizzle ORM)

This project uses Drizzle ORM and `drizzle-kit` for managing database schema changes.

**Standard Workflow:**

1.  **Modify Schema:** Make changes to your table definitions in `shared/schema.ts`.
2.  **Generate Migration:** Run `npx drizzle-kit generate` (or the specific command suggested by `drizzle-kit` if it changes, e.g., `npx drizzle-kit generate:pg`). This will create a new SQL migration file in the `migrations/` directory.
3.  **Review Migration:** Inspect the generated SQL file to ensure it accurately reflects your intended changes.
4.  **Apply Migration:** Run the migration script. Ideally, you should have an npm script for this, e.g., `npm run migrate`.
    *   A typical migration script (e.g., `scripts/migrate.ts`) uses `drizzle-orm/postgres-js/migrator` to apply migrations.
    *   Example `package.json` script: `"migrate": "tsx ./scripts/migrate.ts"`

**Troubleshooting Migration Script Execution (Manual Intervention Record - 2025-05-22):**

*   **Issue:** During development, automated execution of migration scripts (e.g., `npm run migrate` via `tsx ./scripts/migrate.ts` or `npm run db:push` via `drizzle-kit push`) failed in the Replit environment without providing clear error messages. This prevented the creation of the `persons` and `unit_person_roles` tables automatically.
*   **Manual Resolution:** The migration `migrations/0001_slow_chimera.sql` (which included `CREATE TABLE "persons"` and `CREATE TABLE "unit_person_roles"`) was applied manually by executing its SQL content directly against the PostgreSQL database using Replit's built-in database UI.
*   **Future Considerations:**
    *   The underlying issue causing `tsx` and `drizzle-kit push` to fail silently in the Replit terminal needs further investigation. This could be related to environment configuration, PATH issues, or how `stderr` is handled.
    *   If automated migration application continues to be problematic, manual SQL execution via the database UI remains a fallback. However, this is not ideal for CI/CD or team workflows.
    *   **Reconciling Manual Migrations:** If a migration is applied manually, `drizzle-kit`'s metadata (e.g., `migrations/meta/_journal.json`) might not be aware. To prevent `drizzle-kit generate` from trying to re-apply the same changes:
        1.  Ensure the manually applied SQL was successful.
        2.  Consider deleting the corresponding `.sql` migration file *after* manual application and before running `drizzle-kit generate` again for *new* changes. Alternatively, if `drizzle-kit push` can be made to work, it should reconcile the schema state. The goal is to ensure `drizzle-kit` accurately understands the current state of the deployed database schema.

**Key Migration Commands:**

*   `npx drizzle-kit generate`: Generates a new SQL migration file based on schema changes.
*   `npm run migrate` (or equivalent): Applies pending SQL migration files from the `migrations` folder.
*   `npm run db:push` (or `npx drizzle-kit push`): Directly synchronizes the DB schema with the code schema (use with caution, especially in production, as it can be destructive and bypasses versioned SQL migration files).

---

## License
MIT 

## Settings Page Tabs

The Settings page now includes the following tabs (visible to Administrators and Council Members):

- **Email Settings**: Configure notification sender, enable/disable notifications, customize email subjects and footer.
- **System Settings**: General system-wide preferences (future expansion).
- **SMTP Settings**: Configure the outgoing email (SMTP) server, including host, port, authentication, and sender address. Test email delivery directly from this tab.
- **User Management**: Add, edit, lock, or remove user accounts and assign roles.

**Access:** Only users with the Administrator or Council Member role can view and modify these settings. Regular users will not see the Settings page or its tabs. 