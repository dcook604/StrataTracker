# Spectrum 4 Violation System

## Overview
A modern web application for managing property violations, units/customers, and user roles for strata/condo management. Built with React, TypeScript, and a Node.js backend.

---

## Features
- **User Management**: Add, edit, and delete users with multiple roles (Administrator, Council Member, Regular User). Strict Zod schemas enforce correct validation for both creation and editing.
- **Unit/Customer Management**: Unified Add Unit/Customer flow with duplicate checking and update option, consistent across Violations and Customers sections.
- **Violation Tracking**: Create, view, and manage violations, with file attachments and status tracking.
- **Settings**: System and email settings with client-side navigation (SPA experience, no full page reloads).
- **Responsive UI**: Modern, accessible, and mobile-friendly design.

---

## Architecture & Patterns
- **Component-Driven**: All UI is built from small, reusable React components.
- **Strict Typing**: Uses TypeScript and Zod for runtime and compile-time safety. No `any` types in core logic.
- **Schema-Driven Forms**: All forms use Zod schemas for validation. Separate schemas for create/edit where logic differs (e.g., user password rules).
- **Unified Add Unit/Customer**: The Add Customer dialog now uses the same logic and validation as the Add Unit flow in the Violation form, ensuring consistency and DRY code.
- **Client-Side Routing**: Navigation (e.g., Settings, User Management) uses SPA routing (wouter or react-router) for a seamless experience.
- **Feedback & Accessibility**: All actions provide user feedback (toasts, confirmations), and UI is accessible (keyboard, ARIA, color contrast).

---

## Code Quality & Testing
- **Linting & Formatting**: ESLint and Prettier are enforced. No linter errors in committed code.
- **File Size**: Components are kept under 300 lines; large logic is split into smaller files.
- **Testing**: TDD encouraged. Write tests for new features and bug fixes. Use mock data only in tests.
- **Security**: No secrets in code. All user input is validated and sanitized. Sensitive logic is server-side.
- **Documentation**: All major components and schemas are documented with JSDoc. README is kept up to date with architecture and usage changes.

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

---

## Documentation & Maintenance
- Update this README and relevant JSDoc/comments whenever code changes impact architecture, patterns, or usage.
- Review and refactor code for maintainability and DRYness before merging.
- Never commit secrets or .env files to version control.

---

## License
MIT 