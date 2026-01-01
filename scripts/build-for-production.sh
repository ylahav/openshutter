#!/bin/bash

# Build OpenShutter monorepo for production deployment
# This script builds both backend and frontend, then creates a deployment package

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Building OpenShutter for Production${NC}"
echo ""

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed. Please install pnpm first.${NC}"
    exit 1
fi

# Check if Docker is running (for Docker-based deployment)
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Docker-based deployment will be skipped.${NC}"
    DOCKER_AVAILABLE=false
else
    DOCKER_AVAILABLE=true
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
pnpm install --frozen-lockfile

# Build backend
echo -e "${BLUE}🔨 Building backend...${NC}"
pnpm --filter openshutter-backend build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend built successfully${NC}"
else
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi

# Build frontend
echo -e "${BLUE}🔨 Building frontend...${NC}"
pnpm --filter openshutter build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

# Clean up old deployment files
echo -e "${BLUE}🧹 Cleaning up old build files...${NC}"
rm -f openshutter-deployment.tar.gz
rm -f openshutter-image.tar

# Create deployment package
echo -e "${BLUE}📁 Creating deployment package...${NC}"

# Create a temporary directory for deployment files
TEMP_DIR=$(mktemp -d)
DEPLOY_DIR="$TEMP_DIR/openshutter"

mkdir -p "$DEPLOY_DIR"

# Copy necessary files
echo -e "${BLUE}  Copying backend files...${NC}"
cp -r backend/dist "$DEPLOY_DIR/backend/"
cp backend/package.json "$DEPLOY_DIR/backend/"
cp backend/tsconfig.json "$DEPLOY_DIR/backend/" 2>/dev/null || true

echo -e "${BLUE}  Copying frontend files...${NC}"
cp -r frontend/build "$DEPLOY_DIR/frontend/"
cp frontend/package.json "$DEPLOY_DIR/frontend/"
cp frontend/svelte.config.js "$DEPLOY_DIR/frontend/" 2>/dev/null || true
cp frontend/vite.config.ts "$DEPLOY_DIR/frontend/" 2>/dev/null || true

echo -e "${BLUE}  Copying configuration files...${NC}"
cp package.json "$DEPLOY_DIR/"
cp pnpm-workspace.yaml "$DEPLOY_DIR/" 2>/dev/null || true
cp pnpm-lock.yaml "$DEPLOY_DIR/" 2>/dev/null || true

# Copy Docker files if they exist
# Note: Docker image does NOT include MongoDB - use external MongoDB
if [ -f "docker-compose.external-mongodb.yml" ]; then
    cp docker-compose.external-mongodb.yml "$DEPLOY_DIR/docker-compose.yml"
    echo -e "${GREEN}  Using external MongoDB configuration (no MongoDB in image)${NC}"
fi
if [ -f "docker-compose.prod.yml" ]; then
    cp docker-compose.prod.yml "$DEPLOY_DIR/"
fi
if [ -f "Dockerfile" ]; then
    cp Dockerfile "$DEPLOY_DIR/"
fi

# Copy environment example files
echo -e "${BLUE}  Copying environment example files...${NC}"
# Frontend environment example
if [ -f "frontend/env.production.example" ]; then
    cp frontend/env.production.example "$DEPLOY_DIR/frontend/env.production.example"
fi
# Frontend PM2 ecosystem config example
if [ -f "frontend/ecosystem.config.js.example" ]; then
    cp frontend/ecosystem.config.js.example "$DEPLOY_DIR/frontend/ecosystem.config.js.example"
fi
# Backend environment example
if [ -f "backend/env.example" ]; then
    cp backend/env.example "$DEPLOY_DIR/backend/env.example"
fi

# Copy deployment documentation
if [ -f "docs/DEPLOYMENT.md" ]; then
    mkdir -p "$DEPLOY_DIR/docs"
    cp docs/DEPLOYMENT.md "$DEPLOY_DIR/docs/"
fi

# Create a start script
cat > "$DEPLOY_DIR/start.sh" << 'EOF'
#!/bin/bash
# Production start script for OpenShutter

set -e

# Start backend
echo "Starting backend..."
cd backend
pnpm install --prod --frozen-lockfile
PORT=${PORT:-5000} node dist/main.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd ../frontend
pnpm install --prod --frozen-lockfile
# Use build/index.js (not just 'build') for ES module compatibility
PORT=${FRONTEND_PORT:-4000} node build/index.js &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
EOF

chmod +x "$DEPLOY_DIR/start.sh"

# Create deployment package
cd "$TEMP_DIR"
tar -czf openshutter-deployment.tar.gz openshutter/
cd - > /dev/null

# Move to project root
mv "$TEMP_DIR/openshutter-deployment.tar.gz" .

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Docker build (optional)
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "${BLUE}🐳 Building Docker image...${NC}"
    docker build -t openshutter:latest . 2>/dev/null || echo -e "${YELLOW}⚠️  Docker build skipped (no Dockerfile found)${NC}"
    
    if docker images openshutter:latest | grep -q openshutter; then
        echo -e "${BLUE}📦 Exporting Docker image...${NC}"
        docker save openshutter:latest > openshutter-image.tar
        echo -e "${GREEN}✅ Docker image exported to openshutter-image.tar${NC}"
    fi
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Production build completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Files created:${NC}"
    echo -e "  ${YELLOW}openshutter-deployment.tar.gz${NC} - Complete deployment package"
    if [ -f "openshutter-image.tar" ]; then
        echo -e "  ${YELLOW}openshutter-image.tar${NC}        - Docker image (if Docker was used)"
    fi
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Copy ${YELLOW}openshutter-deployment.tar.gz${NC} to your server"
    echo -e "  2. Extract: ${YELLOW}tar -xzf openshutter-deployment.tar.gz${NC}"
    echo -e "  3. Configure ${YELLOW}.env.production${NC} with your MongoDB URI (external MongoDB required)"
    echo -e "     Example: ${YELLOW}MONGODB_URI=mongodb://your-mongodb-host:27017/openshutter${NC}"
    echo -e "  4. Install dependencies: ${YELLOW}cd openshutter && pnpm install --prod${NC}"
    echo -e "  5. Start with Docker: ${YELLOW}docker-compose up -d${NC}"
    echo -e "     Or start manually: ${YELLOW}./start.sh${NC}"
    echo ""
    echo -e "${YELLOW}Note: Docker image does NOT include MongoDB. Use external MongoDB instance.${NC}"
    echo ""
    echo -e "${BLUE}Or use the deployment script:${NC}"
    echo -e "  ${YELLOW}./scripts/deploy-to-server.sh user@your-server${NC}"
else
    echo -e "${RED}❌ Failed to create deployment package${NC}"
    exit 1
fi
