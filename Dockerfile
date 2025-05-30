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
FROM node:18-alpine
WORKDIR /app

# Create target directories
RUN mkdir -p ./dist/public
RUN mkdir -p ./node_modules

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/dist/public ./dist/public/
COPY --from=builder /app/node_modules ./node_modules/

ENV NODE_ENV=production
EXPOSE 3000
CMD [ "node", "dist/index.js" ] 