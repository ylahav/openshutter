# OpenShutter Multi-Environment Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# Set build-time environment variables to prevent build errors
ENV MONGODB_URI=mongodb://localhost:27017/openshutter
ENV MONGODB_DB=openshutter
ENV NEXTAUTH_SECRET=build-time-secret
ENV NEXTAUTH_URL=http://localhost:4000
ENV NEXT_PUBLIC_APP_URL=http://localhost:4000

# Ensure public directory exists and build
RUN mkdir -p public && corepack enable pnpm && pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Default environment variables (can be overridden by env files)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4000
ENV HOSTNAME=0.0.0.0

# Install wget for health checks and enable pnpm
RUN apk add --no-cache wget
RUN corepack enable pnpm

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

## Use Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Environment files are handled by Docker Compose

# Create storage and logs directories
RUN mkdir -p /app/storage /app/logs /app/public/albums
RUN chown -R nextjs:nodejs /app/storage /app/logs /app/public/albums

USER nextjs

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Start the Next.js application (standalone includes server.js)
CMD ["node", "server.js"]
