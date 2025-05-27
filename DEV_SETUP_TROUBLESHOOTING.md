# Development Setup Troubleshooting Guide

This guide provides detailed steps for troubleshooting common issues encountered during the local development setup of the StrataTracker application. It covers both non-Docker and Docker-based environments.

## Table of Contents

1.  [General Prerequisites & Setup](#general-prerequisites--setup)
2.  [Environment Configuration (`.env` file)](#environment-configuration-env-file)
3.  [Database Issues](#database-issues)
    *   [DATABASE_URL Not Set](#database_url-not-set)
    *   [Database Connection Refused (ECONNREFUSED)](#database-connection-refused-econnrefused)
    *   [Drizzle ORM (`db:push`) Problems](#drizzle-orm-dbpush-problems)
4.  [Backend Server Issues](#backend-server-issues)
    *   [Port In Use](#port-in-use)
    *   [Application Fails to Start (Other Reasons)](#application-fails-to-start-other-reasons)
5.  [Frontend Server Issues (Vite)](#frontend-server-issues-vite)
    *   [API Requests Failing (404, Network Error)](#api-requests-failing-404-network-error)
6.  [Build & Compilation Problems](#build--compilation-problems)
    *   [Code Changes Not Reflected](#code-changes-not-reflected)
7.  [Docker Specific Issues](#docker-specific-issues)
    *   [Containers Not Starting / Exiting](#containers-not-starting--exiting)
    *   [Docker Compose Errors (e.g., `KeyError: 'ContainerConfig'`)](#docker-compose-errors)
8.  [Viewing Logs](#viewing-logs)

---

## 1. General Prerequisites & Setup

*   **Node.js & npm**: Ensure you have Node.js v18+ and npm v9+. Verify with `node -v` and `npm -v`.
*   **Git**: For cloning: `git clone https://github.com/dcook604/StrataTracker.git && cd StrataTracker`.
*   **Dependencies**: Run `npm install` in the project root. If you switch branches or pull new code, re-running `npm install` can resolve missing dependency issues.

---

## 2. Environment Configuration (`.env` file)

*   **Location**: The `.env` file *must* be in the project root (`/home/viodb/projects/StrataTracker/.env`).
*   **Creation**: If missing, copy from `.env.example` (if it exists) or create manually.
*   **Key Variables for Local (Non-Docker) Backend & Frontend Dev**:
    ```env
    NODE_ENV=development
    DATABASE_URL="postgres://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DB_NAME"
    PORT=3001                # For the backend server
    SESSION_SECRET=a_strong_secret_for_sessions
    CORS_ORIGIN=http://localhost:5173 # Vite frontend URL
    # Other API keys or service URLs as needed
    ```
*   **Verification**: Ensure variables (especially `DATABASE_URL` and `PORT`) are correctly set and have no typos or extra characters.

---

## 3. Database Issues

### `DATABASE_URL` Not Set

*   **Symptom**: Backend fails to start with an error like `Error: DATABASE_URL environment variable is not set` or `DATABASE_URL, ensure the database is provisioned` (from `drizzle.config.ts`).
*   **Checks & Solutions**:
    1.  **`.env` File**: Confirm its existence and correct configuration in the project root (see section 2).
    2.  **`dotenv` Loading**: The application entry point (`server/index.ts`) must load `dotenv` at the very beginning. The implemented solution involves an IIFE with dynamic import:
        ```typescript
        // server/index.ts
        (async () => {
          try {
            const dotenv = await import('dotenv');
            dotenv.config();
            console.log('DEBUG (IIFE): DATABASE_URL from .env =', process.env.DATABASE_URL); // Debug line
            await import('./app-bootstrap.js'); // Loads the rest of the app
          } catch (error) {
            console.error('Failed to initialize environment or app:', error);
            process.exit(1);
          }
        })();
        ```
    3.  **Run from Project Root**: Ensure scripts (`npm run dev:backend`, `node dist/index.js`, `npm run db:push`) are executed from the project's root directory where the `.env` file is located.
    4.  **Debug Output**: The `console.log` in the IIFE (as shown above) should print the `DATABASE_URL`. If it prints `undefined`, the `.env` file is not being read or the variable is missing/misspelled within it.

### Database Connection Refused (ECONNREFUSED)

*   **Symptom**: Backend starts but logs `connect ECONNREFUSED <ip>:<port>` (e.g., `127.0.0.1:5432`).
*   **Non-Docker PostgreSQL**:
    1.  **Is PostgreSQL Running?**: Check your system's services or use `pg_isready`.
    2.  **Correct Port/Host?**: Ensure `DATABASE_URL` in `.env` points to the correct host (usually `localhost`) and port (usually `5432`) where your local PostgreSQL is listening.
    3.  **Firewall**: Check if a firewall is blocking connections to PostgreSQL.
    4.  **Credentials**: Verify user, password, and database name in `DATABASE_URL` are correct.
*   **Dockerized PostgreSQL (`db` service from `docker-compose.dev.yml`)**:
    1.  **Container Running?**: Check status: `docker compose -f docker-compose.dev.yml ps`. State should be `Up`.
    2.  **Container Logs**: If not `Up` or restarting, check logs: `docker compose -f docker-compose.dev.yml logs db`.
    3.  **Restart Container**: If issues persist, try a full restart:
        ```bash
        docker compose -f docker-compose.dev.yml down --remove-orphans
        docker compose -f docker-compose.dev.yml up -d --force-recreate
        ```
    4.  **Port Mapping**: `docker-compose.dev.yml` maps container port `5432` to host port `5432`. So, `localhost:5432` in `DATABASE_URL` is correct when the application runs outside this Docker Compose setup (e.g., local Node.js process).
    5.  **Credentials**: The `docker-compose.dev.yml` defines `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`. Ensure these match your `DATABASE_URL`.
        *   `POSTGRES_DB=spectrum4`
        *   `POSTGRES_USER=spectrum4`
        *   `POSTGRES_PASSWORD=spectrum4password`
        *   Corresponds to: `DATABASE_URL="postgres://spectrum4:spectrum4password@localhost:5432/spectrum4"`

### Drizzle ORM (`db:push`) Problems

*   **Symptom**: `npm run db:push` (which runs `drizzle-kit push`) fails, often with `DATABASE_URL` errors or connection issues.
*   **Checks & Solutions**:
    1.  **`drizzle.config.ts`**: This file loads `DATABASE_URL` from `process.env`. It does not call `dotenv.config()` itself.
        ```typescript
        // drizzle.config.ts excerpt
        if (!process.env.DATABASE_URL) {
          throw new Error("DATABASE_URL, ensure the database is provisioned");
        }
        // ...
        dbCredentials: {
          url: process.env.DATABASE_URL,
        },
        ```
    2.  **Environment for `npm run`**: `DATABASE_URL` must be available in the environment when `npm run db:push` is executed. This can happen if:
        *   The `.env` file is already sourced in your shell (less reliable for this use case).
        *   Node.js or npm versions provide some implicit `.env` loading (observed to work in the session).
        *   You explicitly use a tool like `dotenv-cli`: `npx dotenv-cli -e .env -- npm run db:push` (more robust if direct `npm run` fails to see `.env` variables).
    3.  **Database Running**: All checks from the `ECONNREFUSED` section apply – the database must be running and accessible.

---

## 4. Backend Server Issues

### Port In Use

*   **Symptom**: Server fails to start with `Error: Port <number> is still in use`.
*   **Checks & Solutions**:
    1.  **Identify Process**: `sudo lsof -t -i:<port_number>` (e.g., `sudo lsof -t -i:3001`).
    2.  **Stop Process**: `sudo kill <PID_from_above>`.
    3.  **Configure Port**: Assign a unique port for the backend in `.env` via the `PORT` variable (e.g., `PORT=3001`). Ensure this doesn't conflict with other services (like Vite, which often uses 3000 or 5173).

### Application Fails to Start (Other Reasons)

*   **Check Logs**: Look at the terminal output where `npm run dev:backend` or `node dist/index.js` is running. Detailed error messages are usually printed here.
*   **Build Issues**: Ensure the `dist` folder contains the latest compiled code (see [Build & Compilation Problems](#build--compilation-problems)).

---

## 5. Frontend Server Issues (Vite)

### API Requests Failing (404, Network Error)

*   **Symptom**: Frontend loads, but login or other API interactions fail. Browser console shows 404s for `/api/...` routes or network errors.
*   **Checks & Solutions**:
    1.  **Backend Running?**: Confirm the backend server is running and listening on its configured port (e.g., 3001).
    2.  **Vite Proxy**: `vite.config.ts` must have a `server.proxy` configuration to forward API requests from the Vite dev server to the backend.
        ```typescript
        // vite.config.ts excerpt
        server: {
          proxy: {
            '/api': {
              target: 'http://localhost:3001', // Backend URL (update port if different)
              changeOrigin: true,
              secure: false, // If backend is HTTP
            }
          }
        }
        ```
    3.  **`CORS_ORIGIN`**: Ensure `CORS_ORIGIN` in the backend's `.env` includes the Vite frontend URL (e.g., `http://localhost:5173`).

---

## 6. Build & Compilation Problems

### Code Changes Not Reflected

*   **Symptom**: You change a `.ts` file, but the running application doesn't show the new behavior. The compiled output in `dist/` might be stale.
*   **Checks & Solutions**:
    1.  **`nodemon` (for `dev:backend`)**: Ensure `nodemon.json` (if used) or `package.json` script correctly specifies watched files/directories. `nodemon` should automatically trigger `esbuild` and restart Node.
    2.  **Manual Rebuild**: If not using `nodemon` or if it seems stuck:
        *   Stop the server.
        *   Delete the output directory: `rm -rf dist`.
        *   Re-run the build command: `npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`.
        *   Restart the server: `node dist/index.js`.
    3.  **Save Files**: Ensure files are actually saved before expecting the build process to pick them up.

---

## 7. Docker Specific Issues

### Containers Not Starting / Exiting

*   **Symptom**: `docker compose ps` shows a container as `Exited` or in a restart loop.
*   **Checks & Solutions**:
    1.  **Logs**: `docker compose -f <your-compose-file> logs <service_name>` (e.g., `docker compose -f docker-compose.dev.yml logs db`). This is the most important step to find the root cause.
    2.  **Configuration**: Double-check `docker-compose.yml` or `docker-compose.dev.yml` for typos, incorrect volume mounts, or environment variable issues.
    3.  **Port Conflicts**: Ensure ports mapped in `docker-compose` don't conflict with other services on your host or other containers.
    4.  **Resource Issues**: Docker might not have enough resources (CPU/memory).
    5.  **Init Scripts**: For the `db` service, if custom init scripts in `./db/init` or `./migrations` are failing, this will cause the container to exit. Check their syntax and permissions.

### Docker Compose Errors

*   **Symptom**: `docker compose up` fails with errors like `KeyError: 'ContainerConfig'`, tracebacks, etc.
*   **Checks & Solutions**:
    1.  **Force Recreate**: This often resolves state-related issues:
        ```bash
        docker compose -f <your-compose-file> down --remove-orphans
        docker compose -f <your-compose-file> up -d --force-recreate
        ```
    2.  **Docker/Compose Version**: Ensure Docker Engine and Docker Compose are up-to-date and compatible. Note if using Compose V1 (`docker-compose`) vs V2 (`docker compose`).
    3.  **Swarm Mode**: If Docker is in Swarm mode, Compose might show warnings. While usually not fatal, it can sometimes complicate things. Consider if Swarm mode is necessary for your local dev setup.
    4.  **Prune System**: `docker system prune -a --volumes` can clean up unused Docker resources, but **be careful as this removes all unused containers, networks, images, and volumes.**

---

## 8. Viewing Logs

*   **Backend Application (Non-Docker)**:
    *   Console output where `npm run dev:backend` or `node dist/index.js` is running.
    *   Log files potentially in `./logs/` (check application logger configuration).
*   **Vite Frontend Server**:
    *   Console output where `npm run dev` or `./start-dev.sh` is running.
    *   Browser developer console (Network and Console tabs).
*   **Docker Containers**:
    *   Per service: `docker compose -f <compose-file> logs <service_name>` (e.g., `logs db`, `logs backend` if you containerize the app).
    *   Follow logs in real-time: `docker compose -f <compose-file> logs -f <service_name>`.
    *   All services: `docker compose -f <compose-file> logs`. 