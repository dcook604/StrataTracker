# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY server ./server
COPY shared ./shared
COPY client ./client

# Single npm install for all dependencies from root package.json
RUN npm install

# Build frontend and backend from /app
# vite.config.ts sets root to 'client' and outDir to 'dist/public'
RUN ls -la client # Debug: List files in /app/client to verify index.html presence
RUN npm run build

# Stage 2: Run
FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/shared ./shared
COPY --from=builder --chown=nextjs:nodejs /app/server ./server

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Switch to non-root user
USER nextjs

EXPOSE 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start the server with automatic migrations
CMD ["npm", "start"] 