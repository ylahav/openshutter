#!/bin/bash

# Deploy OpenShutter monorepo to a production server
# Usage: ./scripts/deploy-to-server.sh user@server-ip [path]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Usage: $0 user@server-ip [deployment-path]${NC}"
    echo -e "${YELLOW}Example: $0 user@192.168.1.100 /opt/openshutter${NC}"
    exit 1
fi

SERVER=$1
DEPLOY_PATH=${2:-/opt/openshutter}

echo -e "${BLUE}🚀 Deploying OpenShutter to ${SERVER}${NC}"
echo -e "${BLUE}Deployment path: ${DEPLOY_PATH}${NC}"
echo ""

# Check if deployment package exists
if [ ! -f "openshutter-deployment.tar.gz" ]; then
    echo -e "${YELLOW}⚠️  Deployment package not found. Building it now...${NC}"
    ./scripts/build-for-production.sh
fi

# Check if pnpm is installed on server
echo -e "${BLUE}🔍 Checking server requirements...${NC}"
if ! ssh $SERVER "command -v pnpm > /dev/null 2>&1"; then
    echo -e "${YELLOW}⚠️  pnpm is not installed on the server. Installing...${NC}"
    ssh $SERVER "npm install -g pnpm" || {
        echo -e "${RED}❌ Failed to install pnpm on server${NC}"
        echo -e "${YELLOW}Please install pnpm manually: npm install -g pnpm${NC}"
        exit 1
    }
fi

# Check if Node.js is installed
if ! ssh $SERVER "command -v node > /dev/null 2>&1"; then
    echo -e "${RED}❌ Node.js is not installed on the server${NC}"
    echo -e "${YELLOW}Please install Node.js 18+ on the server${NC}"
    exit 1
fi

# Create deployment directory on server
echo -e "${BLUE}📁 Creating deployment directory on server...${NC}"
ssh $SERVER "mkdir -p $DEPLOY_PATH"

# Copy deployment package
echo -e "${BLUE}📦 Copying deployment package to server...${NC}"
scp openshutter-deployment.tar.gz $SERVER:$DEPLOY_PATH/

# Extract and deploy on server
echo -e "${BLUE}🔧 Deploying on server...${NC}"
ssh $SERVER "cd $DEPLOY_PATH && \
    tar -xzf openshutter-deployment.tar.gz && \
    cd openshutter && \
    pnpm install --prod --frozen-lockfile && \
    echo '✅ Deployment files extracted and dependencies installed'"

# Check if .env.production exists
if ssh $SERVER "[ ! -f $DEPLOY_PATH/openshutter/.env.production ]"; then
    echo -e "${YELLOW}⚠️  .env.production not found. Please create it on the server.${NC}"
    echo -e "${YELLOW}Example: ssh $SERVER 'cd $DEPLOY_PATH/openshutter && cp .env.production.example .env.production && nano .env.production'${NC}"
fi

# Ask if user wants to start the services
echo ""
read -p "Do you want to start the services now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🚀 Starting services...${NC}"
    ssh $SERVER "cd $DEPLOY_PATH/openshutter && \
        chmod +x start.sh && \
        nohup ./start.sh > ../openshutter.log 2>&1 &"
    
    echo -e "${GREEN}✅ Services started in background${NC}"
    echo -e "${BLUE}Check logs with: ssh $SERVER 'tail -f $DEPLOY_PATH/openshutter.log'${NC}"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Application should be running at:${NC}"
    echo -e "  ${YELLOW}Backend:  http://${SERVER#*@}:5000${NC}"
    echo -e "  ${YELLOW}Frontend: http://${SERVER#*@}:4000${NC}"
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo -e "  ${YELLOW}ssh $SERVER 'cd $DEPLOY_PATH/openshutter && ./start.sh'${NC} - Start services"
    echo -e "  ${YELLOW}ssh $SERVER 'tail -f $DEPLOY_PATH/openshutter.log'${NC} - View logs"
    echo -e "  ${YELLOW}ssh $SERVER 'pkill -f \"node dist/main.js\"'${NC} - Stop backend"
    echo -e "  ${YELLOW}ssh $SERVER 'pkill -f \"node build\"'${NC} - Stop frontend"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi
