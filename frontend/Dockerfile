# Multi-stage Docker build for Next.js application
# Stage 1: Build the application
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

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV STANDALONE=true
# Increase Node memory to avoid OOM during Next.js build
ENV NODE_OPTIONS=--max-old-space-size=4096

# Minimal non-sensitive defaults for build (runtime should provide real values)
ENV MONGODB_URI=mongodb://localhost:27017/openshutter
ENV LOCAL_STORAGE_PATH=/app/storage
ENV STORAGE_PROVIDER=local

# Build the application
RUN pnpm build

# Stage 2: Production runtime
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Install runtime dependencies for canvas (shared libraries)
# These are needed at runtime even though canvas is compiled
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    librsvg

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application from builder stage
COPY --from=builder /app/public ./public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create storage directory and set permissions
RUN mkdir -p /app/storage && chown -R nextjs:nodejs /app/storage

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "server.js"]
