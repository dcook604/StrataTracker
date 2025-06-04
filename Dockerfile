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

# Install ClamAV and required dependencies
RUN apk update && apk add --no-cache \
    clamav \
    clamav-daemon \
    clamav-libunrar \
    freshclam \
    supervisor \
    curl \
    su-exec \
    netcat-openbsd \
    && rm -rf /var/cache/apk/*

# Create ClamAV directories and set permissions
RUN mkdir -p /var/lib/clamav /var/log/clamav /run/clamav \
    && addgroup -g 100 clamav \
    && adduser -D -u 100 -G clamav clamav \
    && chown -R clamav:clamav /var/lib/clamav /var/log/clamav /run/clamav

# Create target directories
RUN mkdir -p ./dist/public
RUN mkdir -p ./node_modules

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/dist/public ./dist/public/
COPY --from=builder /app/node_modules ./node_modules/

# Copy ClamAV configuration files
COPY docker/clamav/clamd.conf /etc/clamav/clamd.conf
COPY docker/clamav/freshclam.conf /etc/clamav/freshclam.conf
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/scripts/init-clamav.sh /usr/local/bin/init-clamav.sh
COPY docker/scripts/health-check.sh /usr/local/bin/health-check.sh

# Make scripts executable
RUN chmod +x /usr/local/bin/init-clamav.sh /usr/local/bin/health-check.sh

# Create virus scanning quarantine directory
RUN mkdir -p /app/quarantine && chown -R clamav:clamav /app/quarantine

ENV NODE_ENV=production
ENV VIRUS_SCANNING_ENABLED=true
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /usr/local/bin/health-check.sh

# Use supervisor to manage both Node.js app and ClamAV services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"] 