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
# Copy i18n translation files so backend TranslationsService can find them (backend runs with cwd=backend, looks for ./i18n)
if [ -d "frontend/src/i18n" ]; then
    mkdir -p "$DEPLOY_DIR/backend/i18n"
    cp frontend/src/i18n/*.json "$DEPLOY_DIR/backend/i18n/" 2>/dev/null || true
    echo -e "${GREEN}    Copied frontend/src/i18n to backend/i18n${NC}"
fi

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

# Copy utility scripts
echo -e "${BLUE}  Copying utility scripts...${NC}"
mkdir -p "$DEPLOY_DIR/scripts"
if [ -f "scripts/cleanup-storage-configs.cjs" ]; then
    cp scripts/cleanup-storage-configs.cjs "$DEPLOY_DIR/scripts/"
    chmod +x "$DEPLOY_DIR/scripts/cleanup-storage-configs.cjs"
fi
if [ -f "scripts/cleanup-storage-configs.sh" ]; then
    cp scripts/cleanup-storage-configs.sh "$DEPLOY_DIR/scripts/"
    chmod +x "$DEPLOY_DIR/scripts/cleanup-storage-configs.sh"
fi

# Create build script (installs dependencies and configures environment)
cat > "$DEPLOY_DIR/build.sh" << 'BUILD_SCRIPT_EOF'
#!/bin/bash
# Production build script for OpenShutter
# This script installs all production dependencies and configures environment variables

set -e

echo "=========================================="
echo "OpenShutter Production Setup"
echo "=========================================="
echo ""

# Ask if this is an update or first installation
read -p "Is this an update to an existing installation? (y/n) [n]: " IS_UPDATE
IS_UPDATE=${IS_UPDATE:-n}

if [[ "$IS_UPDATE" =~ ^[Yy]$ ]]; then
    echo ""
    echo "=========================================="
    echo "Update Mode: Installing dependencies only"
    echo "=========================================="
    echo ""
    echo "Existing configuration files will be preserved."
    echo ""
    
    # Install dependencies only (preserves existing .env files)
    echo "Installing root dependencies..."
    pnpm install --prod --frozen-lockfile
    
    echo "Installing backend dependencies..."
    cd backend
    pnpm install --prod --frozen-lockfile
    cd ..
    
    echo "Installing frontend dependencies..."
    cd frontend
    pnpm install --prod --frozen-lockfile
    cd ..
    
    echo ""
    echo "=========================================="
    echo "✅ Update completed successfully!"
    echo "=========================================="
    echo ""
    echo "Dependencies have been updated."
    echo "Your existing configuration files (.env, ecosystem.config.js) have been preserved."
    echo ""
    echo "Next steps:"
    echo "  1. Restart services: pm2 restart all"
    echo "  2. Verify: pm2 status"
    echo ""
    exit 0
fi

# First installation - prompt for configuration
echo "First Installation Mode: Full setup"
echo ""
echo "Please provide the following configuration:"
echo ""

# Backend port
read -p "Backend port [5000]: " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-5000}

# Frontend port
read -p "Frontend port [4000]: " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-4000}

# MongoDB configuration
echo ""
echo "MongoDB Configuration:"
read -p "MongoDB host [localhost:27017]: " MONGODB_HOST
MONGODB_HOST=${MONGODB_HOST:-localhost:27017}

read -p "Database name [openshutter]: " MONGODB_DB
MONGODB_DB=${MONGODB_DB:-openshutter}

read -p "Does MongoDB require authentication? (y/n) [n]: " MONGODB_AUTH_REQUIRED
MONGODB_AUTH_REQUIRED=${MONGODB_AUTH_REQUIRED:-n}

MONGODB_USER=""
MONGODB_PASSWORD=""
MONGODB_AUTH_SOURCE="admin"

if [[ "$MONGODB_AUTH_REQUIRED" =~ ^[Yy]$ ]]; then
    read -p "MongoDB username: " MONGODB_USER
    read -sp "MongoDB password: " MONGODB_PASSWORD
    echo ""
    read -p "MongoDB auth source [admin]: " MONGODB_AUTH_SOURCE
    MONGODB_AUTH_SOURCE=${MONGODB_AUTH_SOURCE:-admin}
fi

# Build MongoDB URI
if [[ "$MONGODB_AUTH_REQUIRED" =~ ^[Yy]$ ]]; then
    # URL encode special characters in password
    MONGODB_PASSWORD_ENCODED=$(echo -n "$MONGODB_PASSWORD" | sed 's/!/%21/g; s/@/%40/g; s/#/%23/g; s/\$/%24/g; s/%/%25/g; s/&/%26/g; s/\//%2F/g; s/:/%3A/g')
    MONGODB_URI="mongodb://${MONGODB_USER}:${MONGODB_PASSWORD_ENCODED}@${MONGODB_HOST}/${MONGODB_DB}?authSource=${MONGODB_AUTH_SOURCE}"
else
    MONGODB_URI="mongodb://${MONGODB_HOST}/${MONGODB_DB}"
fi

echo ""
echo "=========================================="
echo "Installing dependencies..."
echo "=========================================="

# Install root dependencies
echo "Installing root dependencies..."
pnpm install --prod --frozen-lockfile

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
pnpm install --prod --frozen-lockfile
cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
pnpm install --prod --frozen-lockfile
cd ..

echo ""
echo "=========================================="
echo "Creating environment files..."
echo "=========================================="

# Generate JWT secret (same for both frontend and backend)
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)

# Create backend .env file
echo "Creating backend/.env..."
cat > backend/.env << EOF
# MongoDB Configuration
MONGODB_URI=${MONGODB_URI}
MONGODB_DB=${MONGODB_DB}

# Authentication Configuration
AUTH_JWT_SECRET=${JWT_SECRET}

# Application Configuration
NODE_ENV=production
PORT=${BACKEND_PORT}

# CORS Configuration
FRONTEND_URL=http://localhost:${FRONTEND_PORT}
EOF

# Create frontend .env.production file
echo "Creating frontend/.env.production..."
cat > frontend/.env.production << EOF
# Authentication Configuration (SvelteKit)
AUTH_JWT_SECRET=${JWT_SECRET}

# Application Configuration
NODE_ENV=production
BACKEND_URL=http://localhost:${BACKEND_PORT}
PORT=${FRONTEND_PORT}
EOF

echo ""
echo "=========================================="
echo "✅ Setup completed successfully!"
echo "=========================================="
echo ""
echo "Configuration summary:"
echo "  Backend port: ${BACKEND_PORT}"
echo "  Frontend port: ${FRONTEND_PORT}"
echo "  MongoDB URI: ${MONGODB_URI}"
echo ""
echo "Environment files created:"
echo "  - backend/.env"
echo "  - frontend/.env.production"
echo ""

# Create PM2 ecosystem.config.js for frontend
echo "Creating frontend/ecosystem.config.js..."
cat > frontend/ecosystem.config.js << ECFGEOF
// PM2 Ecosystem Configuration for OpenShutter Frontend
// Auto-generated by build.sh - do not edit manually

// Load environment variables from .env.production
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.production');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

module.exports = {
  apps: [{
    name: 'openshutter-frontend',
    script: 'build/index.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: ${FRONTEND_PORT},
      BACKEND_URL: 'http://localhost:${BACKEND_PORT}',
      AUTH_JWT_SECRET: '${JWT_SECRET}',
      ...envVars  // Include all other variables from .env.production
    },
    // Auto restart settings
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    
    // Health monitoring
    min_uptime: '10s',
    max_restarts: 10,
    
    // Process management
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
ECFGEOF

echo "  - frontend/ecosystem.config.js"
echo ""
echo "⚠️  IMPORTANT: The AUTH_JWT_SECRET has been set to the same value in both files."
echo ""
BUILD_SCRIPT_EOF

chmod +x "$DEPLOY_DIR/build.sh"

# Create a start script
cat > "$DEPLOY_DIR/start.sh" << 'EOF'
#!/bin/bash
# Production start script for OpenShutter
# This script starts both backend and frontend services
# Ports are read from environment files created by build.sh

set -e

# Load backend port from backend/.env file
if [ -f "backend/.env" ]; then
    export $(grep -v '^#' backend/.env | grep -E '^PORT=' | xargs)
    BACKEND_PORT=${PORT:-5000}
    echo "📋 Loaded backend port from backend/.env: ${BACKEND_PORT}"
else
    BACKEND_PORT=${PORT:-5000}
    echo "⚠️  backend/.env not found, using default port: ${BACKEND_PORT}"
fi

# Load frontend port from frontend/.env.production file
if [ -f "frontend/.env.production" ]; then
    export $(grep -v '^#' frontend/.env.production | grep -E '^PORT=' | xargs)
    FRONTEND_PORT=${PORT:-4000}
    echo "📋 Loaded frontend port from frontend/.env.production: ${FRONTEND_PORT}"
else
    FRONTEND_PORT=${PORT:-4000}
    echo "⚠️  frontend/.env.production not found, using default port: ${FRONTEND_PORT}"
fi

echo ""
echo "🚀 Starting OpenShutter services..."
echo "   Backend port: ${BACKEND_PORT}"
echo "   Frontend port: ${FRONTEND_PORT}"
echo ""

# Start backend
echo "Starting backend on port ${BACKEND_PORT}..."
cd backend
PORT=${BACKEND_PORT} node dist/main.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend (SvelteKit)
echo "Starting frontend on port ${FRONTEND_PORT}..."
cd ../frontend
# Load environment variables from .env.production if it exists
if [ -f ".env.production" ]; then
    export $(grep -v '^#' .env.production | grep -v '^$' | xargs)
    echo "📋 Loaded environment variables from .env.production"
fi
# PORT must be set as environment variable (adapter-node defaults to 3000 if not set)
# Use build/index.js (not just 'build') for ES module compatibility
PORT=${FRONTEND_PORT} node build/index.js &
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
