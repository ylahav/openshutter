# Docker Deployment Guide

This guide explains how to deploy OpenShutter using Docker with multi-stage builds.

## Prerequisites

- Docker and Docker Compose installed
- Environment variables configured (see `.env.example`)
- MongoDB database accessible

## Quick Start

### Production Deployment

```bash
# Build and start production environment
pnpm docker:prod

# Or use automated deployment
pnpm deploy:prod user@your-server
```

### Development Deployment

```bash
# Build and start development environment
pnpm docker:dev
```

## Docker Commands

| Command | Description |
|---------|-------------|
| `pnpm docker:build` | Build Docker image |
| `pnpm docker:run` | Run container with .env.local |
| `pnpm docker:dev` | Start development environment |
| `pnpm docker:prod` | Start production environment |
| `pnpm docker:stop` | Stop all containers |
| `pnpm docker:logs` | View container logs |
| `pnpm docker:clean` | Clean up Docker resources |
| `pnpm docker:test` | Test Docker setup |
| `pnpm build:prod` | Build production deployment package |
| `pnpm deploy:prod` | Deploy to production server |

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/openshutter

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:4000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Storage
LOCAL_STORAGE_PATH=/app/storage
STORAGE_PROVIDER=local
```

## Multi-Stage Build

The Dockerfile uses a multi-stage build process:

### Stage 1: Builder
- Installs pnpm and dependencies
- Builds the Next.js application
- Creates standalone build

### Stage 2: Runner
- Creates minimal production image
- Copies built application
- Sets up non-root user
- Configures health checks

## Volumes

The following directories are mounted as volumes:

- `./storage:/app/storage` - Photo storage
- `./logs:/app/logs` - Application logs

## Health Checks

The container includes health checks that verify the application is running:

- **Endpoint**: `http://localhost:4000/api/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

## Production Considerations

### Security
- Container runs as non-root user (`nextjs:nodejs`)
- Minimal Alpine Linux base image
- No unnecessary packages installed

### Performance
- Standalone Next.js build for optimal performance
- Static files served efficiently
- Health checks for monitoring

### Monitoring
- Health check endpoint for load balancers
- Structured logging
- Resource usage monitoring with `docker stats`

## Troubleshooting

### Container Won't Start
```bash
# Check logs
pnpm docker:logs

# Check container status
docker ps -a

# Check resource usage
docker stats
```

### Build Issues
```bash
# Clean build cache
docker builder prune -f

# Rebuild without cache
docker-compose build --no-cache
```

### Storage Issues
```bash
# Check volume mounts
docker inspect openshutter

# Fix permissions
docker exec openshutter chown -R nextjs:nodejs /app/storage
```

## Scaling

For production scaling, consider:

1. **Load Balancer**: Use nginx or cloud load balancer
2. **Multiple Instances**: Run multiple containers
3. **Database**: Use managed MongoDB service
4. **Storage**: Use cloud storage (S3, Google Drive)

## Example Production Setup

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  openshutter:
    image: openshutter:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
    volumes:
      - storage:/app/storage
    networks:
      - openshutter-network

volumes:
  storage:
    driver: local
```

## Support

For issues or questions:
1. Check the logs: `pnpm docker:logs`
2. Verify environment variables
3. Check Docker and Docker Compose versions
4. Review the troubleshooting section above
