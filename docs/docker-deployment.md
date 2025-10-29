# OpenShutter Deployment Guide

Complete guide for running, testing, debugging, and deploying OpenShutter using Docker containers.

## 🏗️ **Architecture Overview**

- **Single Docker Image**: One image works for both dev and production
- **Development**: MongoDB included in Docker for easy development
- **Production**: External MongoDB (shared between applications)
- **Environment-based Configuration**: Different `.env` files for different environments
- **Persistent Storage**: Local storage mounted as volumes
- **Multi-Environment Support**: Easy switching between development and production

## 📁 **File Structure**

```
openshutter/
├── Dockerfile                    # Multi-environment Docker image
├── docker-compose.dev-with-mongo.yml  # Development environment (with MongoDB)
├── docker-compose.prod.yml      # Production environment (external MongoDB)
├── env.development              # Development configuration
├── env.production               # Production configuration
├── scripts/
│   ├── docker-build.sh          # Build Docker image
│   └── docker-deploy.sh         # Deploy to production
└── docs/
    └── docker-deployment.md     # This guide
```

## 🚀 **Quick Start**

### **Prerequisites**
- Docker and Docker Compose installed
- pnpm package manager

### **Local Development & Testing**

1. **Setup Development Environment**:
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd openshutter
   
   # Install dependencies
   pnpm install
   ```

2. **Start Development Container**:
   ```bash
   # Using pnpm script (recommended)
   pnpm run docker:dev
   
   # Or using docker-compose directly
   docker-compose -f docker-compose.dev-with-mongo.yml up --build
   ```

3. **Access Application**:
   - **URL**: http://localhost:4000
   - **Database**: MongoDB included in Docker container
   - **Admin Panel**: http://localhost:4000/admin
   - **Default Admin**: openshutter / openshutter123

### **Production Deployment**

**Important**: Production uses **host networking** to access external MongoDB shared with other applications.

1. **Prerequisites**:
   - External MongoDB running on the host machine
   - MongoDB accessible at `localhost:27017`
   - Database name: `openshutter`

2. **Build Production Image**:
   ```bash
   # Build the Docker image
   pnpm run docker:build
   
   # Or manually
   docker build -t openshutter:latest .
   ```

3. **Configure Production Environment**:
   ```bash
   # Copy and edit production configuration
   cp env.production .env
   
   # Edit .env with your production settings:
   # - NEXTAUTH_SECRET=your_secure_secret
   # - NEXTAUTH_URL=https://yourdomain.com
   # - NEXT_PUBLIC_APP_URL=https://yourdomain.com
   # - MONGODB_URI=mongodb://localhost:27017/openshutter
   ```

4. **Deploy to Production**:
   ```bash
   # Deploy using script
   pnpm run docker:deploy
   
   # Or manually
  # Option A: with bundled MongoDB service
  docker-compose -f docker-compose.prod.yml up -d

  # Option B: with EXTERNAL MongoDB (same server or remote)
  #   - Set MONGODB_URI in .env.production, e.g. for same server:
  #       MONGODB_URI=mongodb://localhost:27017/openshutter
  docker-compose -f docker-compose.external-mongodb.yml up -d
   ```

5. **Verify MongoDB Connection**:
   ```bash
   # Test MongoDB connection from container
   docker exec openshutter-prod node -e "
     const { MongoClient } = require('mongodb');
     MongoClient.connect('mongodb://localhost:27017/openshutter')
       .then(() => console.log('✅ MongoDB connected successfully'))
       .catch(err => console.error('❌ MongoDB connection failed:', err));
   "
   ```

## 🛠️ **Local Development & Testing**

### **Development Workflow**

1. **Start Development Environment**:
   ```bash
   # Start with hot reload
   pnpm run docker:dev
   
   # Or run in background
   docker-compose -f docker-compose.dev.yml up -d --build
   ```

2. **Monitor Development**:
   ```bash
   # View logs in real-time
   docker logs -f openshutter-dev
   
   # Check container status
   docker ps
   
   # Access container shell
   docker exec -it openshutter-dev sh
   ```

3. **Stop Development**:
   ```bash
   # Stop development environment
   docker-compose -f docker-compose.dev.yml down
   
   # Or use pnpm script
   pnpm run docker:stop
   ```

### **Testing Your Application**

1. **Health Check**:
   ```bash
   # Check if application is running
   curl http://localhost:4000/api/health
   
   # Or visit in browser
   open http://localhost:4000/api/health
   ```

2. **Test Database Connection**:
   ```bash
   # Test MongoDB connection
   curl http://localhost:4000/api/test-mongodb
   ```

3. **Test Storage Providers**:
   ```bash
   # Test Google Drive (if configured)
   curl http://localhost:4000/api/storage/google-drive/test
   
   # Test local storage
   curl http://localhost:4000/api/storage/local/test
   ```

4. **Test Admin Panel**:
   - Visit: http://localhost:4000/admin
   - Test storage configuration
   - Test album creation
   - Test photo upload

### **Debugging**

1. **Container Debugging**:
   ```bash
   # Access container shell
   docker exec -it openshutter-dev sh
   
   # Inside container, check:
   pnpm list                    # Check installed packages
   ls -la /app                  # Check app structure
   cat /app/.env                # Check environment variables
   ```

2. **Log Analysis**:
   ```bash
   # View all logs
   docker logs openshutter-dev
   
   # View last 100 lines
   docker logs --tail 100 openshutter-dev
   
   # Follow logs in real-time
   docker logs -f openshutter-dev
   
   # View logs with timestamps
   docker logs -t openshutter-dev
   ```

3. **Debug Mode**:
   ```bash
   # Run container in debug mode
   docker run -it --rm \
     --env-file env.development \
     -p 4000:4000 \
     -v $(pwd)/src:/app/src \
     openshutter:latest sh
   
   # Inside container, start manually
   pnpm start
   ```

4. **Common Debug Commands**:
   ```bash
   # Check container resource usage
   docker stats openshutter-dev
   
   # Check container configuration
   docker inspect openshutter-dev
   
   # Check environment variables
   docker exec openshutter-dev env
   
   # Check network connectivity
   docker exec openshutter-dev ping google.com
   ```

### **Hot Reload Development** (Optional)

For faster development with hot reload:

1. **Mount Source Code**:
   ```yaml
   # In docker-compose.dev.yml, add volume:
   volumes:
     - ./src:/app/src
     - ./public:/app/public
   ```

2. **Run with Hot Reload**:
   ```bash
   # Start with mounted volumes
   docker-compose -f docker-compose.dev.yml up --build
   ```

### **Testing Different Environments**

1. **Test Production Build Locally**:
   ```bash
   # Build production image
   pnpm run docker:build
   
   # Run production image locally
   docker run -p 4001:4000 --env-file env.production openshutter:latest
   
   # Access at http://localhost:4001
   ```

2. **Compare Environments**:
   ```bash
   # Run both dev and prod side by side
   pnpm run docker:dev          # Port 4000
   docker run -p 4001:4000 --env-file env.production openshutter:latest
   ```

## ⚙️ **Configuration**

### **Environment Variables**

#### **Development (env.development)**
```env
NODE_ENV=development
MONGODB_URI=mongodb://host.docker.internal:27017/openshutter
NEXTAUTH_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:4000
# ... other development settings
```

#### **Production (env.production)**
```env
NODE_ENV=production
MONGODB_URI=mongodb://your_production_mongodb_host:27017/openshutter
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
# ... other production settings
```

### **Database Configuration**

The application uses an **external MongoDB database** that can be shared between development and production:

- **Development**: `mongodb://host.docker.internal:27017/openshutter`
- **Production**: `mongodb://your_production_mongodb_host:27017/openshutter`

## 🐳 **Docker Commands**

### **Build Commands**
```bash
# Build Docker image
pnpm run docker:build

# Build specific tag
docker build -t openshutter:v1.0.0 .

# Build with no cache
docker build --no-cache -t openshutter:latest .
```

### **Development Commands**
```bash
# Start development environment
pnpm run docker:dev

# Stop development environment
docker-compose -f docker-compose.dev.yml down

# View development logs
docker logs openshutter-dev

# Access development container
docker exec -it openshutter-dev sh
```

### **Production Commands**

> **📍 Important**: These commands run on different machines!

#### **On Local Development Machine:**
```bash
# Build production image
pnpm run docker:build
```

#### **On Production Server:**
```bash
# Deploy to production
pnpm run docker:deploy

# Start production environment
pnpm run docker:prod

# Stop production environment
docker-compose -f docker-compose.prod.yml down

# View production logs
docker logs openshutter-prod

# Restart production container
docker restart openshutter-prod
```

### **General Commands**
```bash
# View all containers
docker ps -a

# View container logs
pnpm run docker:logs

# Stop all environments
pnpm run docker:stop

# Remove all containers
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.prod.yml down
```

## 📊 **Monitoring & Health Checks**

### **Health Check**
The container includes a built-in health check:
```bash
# Check container health
docker inspect openshutter-prod | grep Health -A 10

# Manual health check
curl http://localhost:4000/api/health
```

### **Logs**
```bash
# View logs
docker logs openshutter-prod

# Follow logs
docker logs -f openshutter-prod

# View last 100 lines
docker logs --tail 100 openshutter-prod
```

### **Resource Usage**
```bash
# View resource usage
docker stats openshutter-prod

# View container details
docker inspect openshutter-prod
```

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

1. **Port Already in Use**:
   ```bash
   # Check what's using port 4000
   lsof -i :4000
   netstat -tulpn | grep :4000
   
   # Kill process or change port in docker-compose
   sudo kill -9 $(lsof -t -i:4000)
   ```

2. **Database Connection Issues**:
   ```bash
   # Check MongoDB is running
   docker ps | grep mongo
   # Or if external: systemctl status mongod
   
   # Test connection from container
   docker exec -it openshutter-dev sh
   # Inside container: wget -qO- http://localhost:4000/api/health
   
   # Check MongoDB URI in environment
   docker exec openshutter-dev env | grep MONGODB
   ```

3. **Permission Issues**:
   ```bash
   # Fix storage permissions
   sudo chown -R 1001:1001 ./storage
   sudo chown -R 1001:1001 ./logs
   
   # Or for production
   sudo chown -R 1001:1001 /var/openshutter/storage
   sudo chown -R 1001:1001 /var/openshutter/logs
   ```

4. **Container Won't Start**:
   ```bash
   # Check logs
   docker logs openshutter-dev
   
   # Check environment variables
   docker exec openshutter-dev env
   
   # Check container configuration
   docker inspect openshutter-dev
   ```

5. **Build Issues**:
   ```bash
   # Clean build
   docker build --no-cache -t openshutter:latest .
   
   # Clean everything
   docker system prune -a
   docker volume prune
   ```

6. **Memory Issues**:
   ```bash
   # Check container resource usage
   docker stats
   
   # Increase Docker memory limit in Docker Desktop
   # Or add memory limits to docker-compose
   ```

### **Debug Commands**

```bash
# Full debugging workflow
docker logs openshutter-dev                    # Check logs
docker exec -it openshutter-dev sh            # Access container
docker inspect openshutter-dev                # Check configuration
docker stats openshutter-dev                  # Check resources
curl http://localhost:4000/api/health         # Test health endpoint
```

### **Reset Everything**

```bash
# Stop all containers
pnpm run docker:stop

# Remove all containers and images
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.prod.yml down
docker rmi openshutter:latest

# Clean up
docker system prune -a

# Start fresh
pnpm run docker:build
pnpm run docker:dev
```

## 🚀 **Production Deployment Workflow**

### **Option 1: Build Locally, Deploy on Server** (Recommended)

#### **Step 1: Local Development Machine**
```bash
# 1. Build production image locally
pnpm run docker:build

# 2. Save image to file for transfer
docker save openshutter:latest | gzip > openshutter.tar.gz

# 3. Transfer files to server
scp openshutter.tar.gz user@server:/opt/
scp env.production user@server:/opt/openshutter/
scp docker-compose.prod.yml user@server:/opt/openshutter/
scp scripts/docker-deploy.sh user@server:/opt/openshutter/scripts/
```

#### **Step 2: Production Server**
```bash
# 1. Load the Docker image
docker load < openshutter.tar.gz

# 2. Navigate to project directory
cd /opt/openshutter

# 3. Make scripts executable
chmod +x scripts/docker-deploy.sh

# 4. Deploy to production
pnpm run docker:deploy

# 5. Verify deployment
docker ps
curl http://localhost:4000/api/health
```

### **Option 2: Build Directly on Server**

#### **On Production Server**
```bash
# 1. Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 2. Clone/upload code
git clone https://github.com/your-repo/openshutter.git
cd openshutter

# 3. Configure environment
nano env.production
# Set correct values for:
# - MONGODB_URI
# - NEXTAUTH_URL  
# - NEXTAUTH_SECRET

# 4. Build and deploy
pnpm run docker:build
pnpm run docker:deploy

# 5. Verify deployment
docker ps
curl http://localhost:4000/api/health
docker logs openshutter-prod
```

### **Command Location Summary**

| Command | Where to Run | Purpose |
|---------|--------------|---------|
| `pnpm run docker:build` | **Local Machine** | Build production image |
| `pnpm run docker:deploy` | **Production Server** | Deploy image to production |
| `docker logs openshutter-prod` | **Production Server** | View production logs |
| `pnpm run docker:dev` | **Local Machine** | Run development environment |
| `docker logs openshutter-dev` | **Local Machine** | View development logs |

## 🔄 **Updates & Maintenance**

### **Updating Application**
```bash
# Pull latest code
git pull origin main

# Rebuild image
pnpm run docker:build

# Restart production
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### **Backup & Restore**
```bash
# Backup storage
tar -czf openshutter-storage-backup.tar.gz /var/openshutter/storage

# Backup database (external MongoDB)
mongodump --uri="mongodb://your_mongodb_host:27017/openshutter" --out=./backup

# Restore storage
tar -xzf openshutter-storage-backup.tar.gz -C /
```

## 📋 **Quick Reference**

### **Essential Commands**

#### **Local Development Machine:**
```bash
# Development
pnpm run docker:dev              # Start development
pnpm run docker:stop             # Stop all environments
docker logs -f openshutter-dev   # View dev logs

# Production (build only)
pnpm run docker:build            # Build production image

# Debugging
docker exec -it openshutter-dev sh    # Access dev container
curl http://localhost:4000/api/health # Test health
docker stats                         # Check resources
```

#### **Production Server:**
```bash
# Production
pnpm run docker:deploy           # Deploy to production
docker logs openshutter-prod     # View prod logs
docker exec -it openshutter-prod sh  # Access prod container
curl http://localhost:4000/api/health # Test health
```

### **Key URLs**
- **Development**: http://localhost:4000
- **Admin Panel**: http://localhost:4000/admin
- **Health Check**: http://localhost:4000/api/health
- **API Test**: http://localhost:4000/api/test-mongodb

### **Important Files**
- `env.development` - Development configuration
- `env.production` - Production configuration
- `docker-compose.dev.yml` - Development setup
- `docker-compose.prod.yml` - Production setup
- `Dockerfile` - Multi-environment image

## 📝 **Notes**

- **Database**: Uses external MongoDB, so data persists between container restarts
- **Storage**: Local storage is mounted as volumes for persistence
- **Environment**: Same image works for both dev and production
- **Security**: Update all secrets in production environment files
- **Monitoring**: Use Docker health checks and logs for monitoring
- **Package Manager**: Uses pnpm throughout (not npm)

## 🆘 **Support**

For issues or questions:
1. Check container logs: `docker logs openshutter-dev`
2. Check health status: `docker inspect openshutter-dev`
3. Verify environment variables: `docker exec -it openshutter-dev env`
4. Check database connectivity
5. Review this documentation
6. Use debug commands in troubleshooting section
