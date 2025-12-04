# Production Deployment Guide

This guide explains how to deploy OpenShutter to a production server using Docker.

## Option 1: Automated Deployment (Recommended)

### Quick Deployment

```bash
# Deploy automatically (builds and deploys in one command)
pnpm deploy:prod user@your-server

# Or with custom path
pnpm deploy:prod user@your-server /opt/openshutter
```

### Manual Deployment

#### 1. Build Production Package

```bash
# Build the production package
pnpm build:prod

# This creates: openshutter-deployment.tar.gz
```

#### 2. Deploy to Server (choose one compose file)

```bash
# Copy deployment package to server
scp openshutter-deployment.tar.gz user@your-server:/opt/openshutter/

# SSH to server and deploy
ssh user@your-server
cd /opt/openshutter
tar -xzf openshutter-deployment.tar.gz
cd openshutter
pnpm install --prod
./start.sh

# Or use Docker (if docker-compose files are included):
# docker load < openshutter-image.tar  # if using Docker
# docker-compose -f docker-compose.prod.yml up -d
```

## Option 2: Source Code Deployment

### What to Copy to Server

1. **Source Code** (excluding node_modules, build artifacts, etc.)
2. **Docker Files** (Dockerfile, docker-compose.yml)
3. **Environment File** (`.env.production`)

### Steps

#### 1. Prepare Source Code

```bash
# Create deployment package
tar -czf openshutter-source.tar.gz \
  --exclude=node_modules \
  --exclude=.svelte-kit \
  --exclude=build \
  --exclude=backend/dist \
  --exclude=frontend/build \
  --exclude=storage \
  --exclude=logs \
  --exclude=.git \
  --exclude=.env.local \
  .
```

**Note**: Build directories (`.svelte-kit`, `build`, `backend/dist`) are excluded from deployment as they will be rebuilt on the server.

#### 2. Copy to Server

```bash
scp openshutter-source.tar.gz user@your-server:/opt/openshutter/
scp .env.production user@your-server:/opt/openshutter/
```

#### 3. Deploy on Server

```bash
# SSH to server
ssh user@your-server

# Extract source code
cd /opt/openshutter
tar -xzf openshutter-source.tar.gz

# Build and start
docker-compose up -d --build
```

## Option 3: Git-Based Deployment

### What to Copy to Server

1. **Git Repository Access** (SSH keys or HTTPS)
2. **Environment File** (`.env.production`)
3. **Deployment Script**

### Steps

#### 1. Create Deployment Script

```bash
#!/bin/bash
# deploy.sh
set -e

# Pull latest code
git pull origin main

# Build and start
docker-compose down
docker-compose up -d --build

# Clean up old images
docker image prune -f
```

#### 2. Deploy on Server

```bash
# Clone repository
git clone https://github.com/your-username/openshutter.git /opt/openshutter

# Copy environment file
cp .env.production /opt/openshutter/

# Make script executable
chmod +x deploy.sh

# Deploy
./deploy.sh
```

## Required Files for Production

### 1. Environment File (`.env.production`)

```env
# MongoDB Configuration
# - With docker-compose.prod.yml (bundled MongoDB):
#     MONGODB_URI=mongodb://mongodb:27017/openshutter
# - External MongoDB on SAME server (host networking):
#     MONGODB_URI=mongodb://localhost:27017/openshutter
# - External MongoDB on DIFFERENT server:
#     MONGODB_URI=mongodb://your-mongodb-host:27017/openshutter
# - MongoDB Atlas:
#     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/openshutter
MONGODB_URI=mongodb://localhost:27017/openshutter
MONGODB_DB=openshutter

# Authentication Configuration
JWT_SECRET=your-production-secret-key
FRONTEND_URL=https://your-domain.com

# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Local Storage Configuration
LOCAL_STORAGE_PATH=/app/storage
STORAGE_PROVIDER=local

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 2. Production Docker Compose (two options)

```yaml
# docker-compose.prod.yml (includes MongoDB service)
services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
  openshutter:
    image: openshutter:latest
    container_name: openshutter-prod
    ports:
      - "4000:4000"
    env_file:
      - .env.production
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/openshutter
    volumes:
      - ./storage:/app/storage
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - mongodb
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:4000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

# docker-compose.external-mongodb.yml (uses host network, no MongoDB service)
services:
  openshutter:
    image: openshutter:latest
    container_name: openshutter-prod
    network_mode: host
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:4000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

> Note: With `network_mode: host`, the container shares the host network. The app binds directly to port 4000 on the host, and `localhost:27017` resolves to the host MongoDB.

## Server Requirements

### Minimum Requirements
- **CPU**: 1 core
- **RAM**: 1GB
- **Storage**: 10GB
- **OS**: Linux (Ubuntu 20.04+ recommended)

### Recommended Requirements
- **CPU**: 2 cores
- **RAM**: 2GB
- **Storage**: 20GB
- **OS**: Ubuntu 22.04 LTS

### Required Software
- Docker (20.10+)
- Docker Compose (2.0+)
- Git (for Git-based deployment)

## Security Considerations

### 1. Environment Variables
- Use strong, unique secrets
- Never commit `.env.production` to Git
- Use environment variable management tools

### 2. Network Security
- Use reverse proxy (nginx) for HTTPS
- Configure firewall rules
- Use non-default ports if needed

### 3. Data Security
- Regular backups of MongoDB
- Secure file permissions
- Monitor logs for suspicious activity

## Monitoring and Maintenance

### 1. Health Checks
```bash
# Check container status
docker ps

# Check logs
docker logs openshutter-prod

# Check health endpoint
curl http://localhost:4000/api/health
```

### 2. Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### 3. Backups
```bash
# Backup MongoDB
mongodump --uri="mongodb://localhost:27017/openshutter" --out=/backup/openshutter-$(date +%Y%m%d)

# Backup storage
tar -czf /backup/storage-$(date +%Y%m%d).tar.gz /opt/openshutter/storage
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   - Check environment variables
   - Check port availability
   - Check Docker logs

2. **Database connection failed**
   - Verify MongoDB URI
   - Check network connectivity
   - Verify MongoDB is running

3. **Permission denied**
   - Check file permissions
   - Check Docker user permissions
   - Check volume mounts

### Useful Commands

```bash
# View container logs
docker logs -f openshutter-prod

# Execute commands in container
docker exec -it openshutter-prod sh

# Check resource usage
docker stats openshutter-prod

# Restart container
docker restart openshutter-prod
```

## Next Steps

1. Choose your deployment method
2. Set up your production environment
3. Configure your domain and SSL
4. Set up monitoring and backups
5. Test the deployment thoroughly
