# StrataTracker: Supabase Auth Migration Plan

**Document Version:** 1.0
**Date:** 2024-10-27
**Author:** Gemini AI

## 1. Executive Summary

This document outlines the strategy, impact, and step-by-step plan for migrating the StrataTracker application from its current custom session-based authentication system to Supabase Auth.

This is a **high-impact, high-complexity** architectural change that will replace the existing `passport.js` implementation for admins and the custom session token system for public users with a unified, modern, and stateless JWT-based authentication model powered by Supabase.

The primary benefits of this migration include enhanced security (MFA, provider support), improved scalability, reduced maintenance overhead, and a superior developer experience with real-time capabilities. The most significant challenge involves a mandatory password reset for all existing users due to cryptographic hashing, which requires a carefully managed transition.

**This plan is for assessment purposes. Implementation should not proceed without careful review and allocation of development resources.**

---

## 2. Current Authentication System Analysis

StrataTracker currently operates two distinct authentication systems.

### 2.1. Admin & Council Authentication
- **Framework:** `passport.js` with `passport-local` strategy.
- **State Management:** Stateful, using `express-session` with a server-side session store.
- **Security:**
    - Passwords are hashed using `bcryptjs`.
    - Implements rate limiting on the login endpoint (`/api/login`) to prevent brute-force attacks.
    - Tracks failed login attempts and implements account locking.
- **Core Files:** `server/auth.ts`, `server/storage.ts`.
- **Database Table:** `users`.

### 2.2. Public User (Owner/Tenant) Authentication
- **Framework:** Custom token-based session implementation.
- **Flow:**
    1. A user accesses a unique link (likely from an email).
    2. The backend generates a temporary, secure session token.
    3. This session is stored in the `public_user_sessions` table.
    4. The token is sent to the client and included in subsequent API requests via the `x-public-session-id` header.
- **Security:** Relies on the uniqueness and time-bound nature of the generated session token.
- **Core Files:** `server/routes/public-violations.ts`, `server/storage.ts`.
- **Database Table:** `public_user_sessions`.

---

## 3. Impact Assessment

The migration will affect all layers of the application stack.

| Component | Impact Description |
| :--- | :--- |
| **Database** | - The `users` and `public_user_sessions` tables will be deprecated. <br/> - User identities will be managed in Supabase's `auth.users` table. <br/> - A new `profiles` table, linked to `auth.users`, will be required to store application-specific user data (e.g., full name, role). |
| **Backend** | - Complete removal of `passport`, `express-session`, `bcryptjs`, and related middleware. <br/>- All route protection logic will be replaced with new middleware that validates Supabase JWTs. <br/> - User management API endpoints (`/api/users`, `/api/login`, `/api/logout`) will be removed or fundamentally refactored. |
| **Frontend** | - All authentication-related UI/components (Login, Logout, Password Reset) must be rewritten using the `supabase-js` client library. <br/> - Global state management for authentication must be refactored to use Supabase's `onAuthStateChange` listener. <br/>- All authenticated API calls must be updated to include the Supabase JWT in the `Authorization` header. |
| **Configuration** | - New environment variables for the Supabase URL and `anon` key will be required. <br/> - Old variables like `SESSION_SECRET` will be deprecated. |

---

## 4. Phased Migration Plan

This plan breaks the migration into sequential, manageable phases.

### Phase 0: Preparation & Setup
1.  **Create Supabase Project:** Set up a new project in the Supabase dashboard.
2.  **Configure Auth Settings:**
    -   Enable and configure Email as an authentication provider.
    -   Customize email templates (Welcome, Password Reset, Magic Link) to match StrataTracker branding.
    -   Disable any providers you don't need (e.g., Phone, social providers).
    -   Consider enabling Multi-Factor Authentication (MFA) options for admins.
3.  **Database Setup:**
    -   Using the Supabase SQL editor, create a new `profiles` table to store user metadata. This table will be linked to the `auth.users` table.
      ```sql
      CREATE TABLE public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name TEXT,
        role TEXT NOT NULL, -- e.g., 'admin', 'council', 'user'
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      -- Optional: Create a trigger to automatically create a profile on new user signup.
      ```
4.  **Install Dependencies:**
    ```bash
    npm install @supabase/supabase-js
    ```
5.  **Environment Variables:** Add Supabase credentials to your `.env` and `coolify.env.example` files.
    ```env
    SUPABASE_URL=your-supabase-project-url
    SUPABASE_ANON_KEY=your-supabase-anon-key
    ```

### Phase 1: Backend API & Middleware Refactoring
1.  **Create Supabase Client:** Initialize a Supabase admin client in a new server-side utility file (`server/supabase-client.ts`). Use the `service_role` key for admin-level operations.
2.  **Develop JWT Middleware:** Create a new Express middleware (`server/middleware/supabase-auth-middleware.ts`). This middleware will:
    -   Extract the JWT from the `Authorization: Bearer <token>` header.
    -   Use `supabase.auth.getUser(jwt)` to verify the token and retrieve the user.
    -   If valid, attach the user object to `req.user`.
    -   If invalid, send a `401 Unauthorized` response.
3.  **Replace Old Middleware:** Systematically replace all existing authentication middleware (`isAuthenticated`, `checkPublicSession`, role checks) across all protected routes in `server/routes/` with the new Supabase JWT middleware.
4.  **Remove Old Code:** Delete `server/auth.ts`. Remove all `express-session`, `passport`, and `memorystore` initialization code from `server/index.ts`.

### Phase 2: Admin/Council Authentication Flow Migration
1.  **Frontend Supabase Client:** Create a client-side Supabase utility (`client/src/lib/supabase.ts`).
2.  **Refactor Auth State:** Create a global `AuthContext` in the React application. This context will use `supabase.auth.onAuthStateChange` to listen for login/logout events in real-time and provide session and user data to the entire component tree.
3.  **Rewrite Login Page:**
    -   Modify the login form (`client/src/pages/login-page.tsx`) to call `supabase.auth.signInWithPassword()`.
    -   Remove any direct API calls to your old `/api/login` endpoint.
4.  **Update API Client:** Modify your frontend API fetching logic (e.g., an `axios` or `fetch` interceptor) to dynamically get the current session token from `supabase.auth.getSession()` and attach it as a Bearer token to all outgoing API requests.
5.  **Implement Logout:** Update the logout functionality to call `supabase.auth.signOut()`.
6.  **Refactor User Management:** Rewrite backend logic for creating/managing users to use the Supabase admin client (`supabase.auth.admin.createUser`, etc.).

### Phase 3: Public (Owner/Tenant) Authentication Flow Migration
1.  **Adopt Magic Link:** This flow will be replaced entirely by Supabase's passwordless "Magic Link" feature.
2.  **Update Notification Logic:** Modify the email notification service (`server/email.ts`) that sends dispute links. Instead of generating a custom token, it will now call `supabase.auth.signInWithOtp()` to generate a magic link for the user's email address.
3.  **Create Callback Page:** Create a new frontend page/route to handle the user being redirected back from the magic link. This page will effectively complete the sign-in process and redirect the user to their violations page.

### Phase 4: User Data Migration & Database Integration
1.  **Write Migration Script:** Create a secure, one-off script (`scripts/migrate-users-to-supabase.ts`). This script will:
    -   Fetch all users from your PostgreSQL `users` table.
    -   For each user, call `supabase.auth.admin.createUser()` to create a corresponding user in Supabase `auth.users`. **Crucially, you will need to set a temporary password or create the user without one, as you cannot migrate existing passwords.**
    -   Insert the user's non-auth data (full name, role) into the new `profiles` table.
2.  **User Communication Plan:** Prepare an email to send to all users informing them of the security upgrade and instructing them to use the "Forgot Password" feature on the new login page to set their password for the first time.
3.  **Update Drizzle Schema:** Modify `shared/schema.ts` to remove the `users` and `publicUserSessions` tables and add the new `profiles` table definition. Update all database queries in `server/storage.ts` to reference the new `profiles` table.

### Phase 5: Cleanup & Deprecation
1.  **Remove Dependencies:**
    ```bash
    npm uninstall express-session connect-pg-simple passport passport-local bcryptjs memorystore
    npm uninstall @types/express-session @types/passport @types/passport-local @types/bcryptjs
    ```
2.  **Delete Old Tables:** After confirming the migration is successful, drop the `users` and `public_user_sessions` tables from your database.
3.  **Remove Old Files:** Delete `server/auth.ts`, old middleware, and other now-unused files.
4.  **Update Documentation:** Update `README.md` and other relevant documentation to reflect the new authentication architecture.

---

## 5. Risks & Mitigation

| Risk | Mitigation |
| :--- | :--- |
| **User Experience Disruption** | The mandatory password reset is the highest user-facing risk. Mitigate with clear, proactive communication via email, explaining the security benefits of the change. Provide clear instructions on how to reset the password. |
| **Data Migration Failure** | The migration script must be idempotent and handle errors gracefully. Test it extensively in a staging environment with a backup of the production database before running it on production data. |
| **Security Vulnerabilities** | An incorrect JWT validation implementation could expose the API. Strictly follow Supabase's official documentation. Consider using Supabase's Row Level Security (RLS) for fine-grained data access control directly in the database. |
| **Extended Downtime** | Plan the final cutover during a low-traffic period. A well-rehearsed plan, tested in staging, will minimize downtime. |

## 6. Post-Migration Benefits

- **Enhanced Security:** Leverage Supabase's robust security features, including MFA, enterprise SSO (if needed), and continuous security auditing.
- **Reduced Maintenance:** Offload the complexity of building and maintaining a secure authentication system.
- **Improved Developer Experience:** Utilize simple client libraries and a unified API for all authentication needs.
- **Scalability & Reliability:** Rely on Supabase's managed, scalable infrastructure.
- **Real-time Capabilities:** Easily integrate real-time features using Supabase subscriptions, which pair naturally with `onAuthStateChange`.
- **Unified Auth:** Consolidate two separate, complex auth systems into a single, modern, and well-documented solution. 