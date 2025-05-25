# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY server ./server
COPY shared ./shared
COPY client ./client
RUN npm install

# Build frontend
WORKDIR /app/client
RUN npm install
RUN npm run build

# Build backend
WORKDIR /app
RUN esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Stage 2: Run
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/client ./client
ENV NODE_ENV=production
EXPOSE 3000
CMD [ "node", "dist/index.js" ] 