# Multi-stage Docker build for OpenShutter (SvelteKit + NestJS)
# NOTE: This image does NOT include MongoDB - use external MongoDB instance
# Configure MONGODB_URI environment variable to point to your MongoDB server
# Stage 1: Build both frontend and backend
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies for canvas (native module)
# canvas requires Python, build tools, and graphics libraries
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    librsvg-dev \
    && ln -sf python3 /usr/bin/python

# Install pnpm globally
RUN npm install -g pnpm

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy backend package files
COPY backend/package.json ./backend/

# Copy frontend package files
COPY frontend/package.json ./frontend/

# Install dependencies for the entire workspace
RUN pnpm install --frozen-lockfile

# Copy backend source code
COPY backend ./backend

# Copy frontend source code
COPY frontend ./frontend

# Set environment variables for build
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=4096

# Build backend
RUN pnpm --filter openshutter-backend build

# Build frontend
RUN pnpm --filter openshutter build

# Stage 2: Production runtime
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Install runtime dependencies for canvas (shared libraries)
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    librsvg

# Install pnpm for production dependencies
RUN npm install -g pnpm

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV BACKEND_PORT=5000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 openshutter

# Copy workspace configuration
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copy backend build and package files
COPY --from=builder --chown=openshutter:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=openshutter:nodejs /app/backend/package.json ./backend/
COPY --from=builder --chown=openshutter:nodejs /app/backend/tsconfig.json ./backend/ 2>/dev/null || true

# Copy frontend build
COPY --from=builder --chown=openshutter:nodejs /app/frontend/build ./frontend/build
COPY --from=builder --chown=openshutter:nodejs /app/frontend/package.json ./frontend/
COPY --from=builder --chown=openshutter:nodejs /app/frontend/svelte.config.js ./frontend/ 2>/dev/null || true
COPY --from=builder --chown=openshutter:nodejs /app/frontend/vite.config.ts ./frontend/ 2>/dev/null || true

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Create storage and logs directories
RUN mkdir -p /app/storage /app/logs && \
    chown -R openshutter:nodejs /app/storage /app/logs

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'cd /app/backend && node dist/main.js &' >> /app/start.sh && \
    echo 'BACKEND_PID=$!' >> /app/start.sh && \
    echo 'sleep 3' >> /app/start.sh && \
    echo 'cd /app/frontend && node build &' >> /app/start.sh && \
    echo 'FRONTEND_PID=$!' >> /app/start.sh && \
    echo 'wait $BACKEND_PID $FRONTEND_PID' >> /app/start.sh && \
    chmod +x /app/start.sh && \
    chown openshutter:nodejs /app/start.sh

# Switch to non-root user
USER openshutter

# Expose ports
EXPOSE 4000 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["/app/start.sh"]
