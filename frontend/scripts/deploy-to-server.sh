#!/bin/bash

# Deploy OpenShutter to a production server
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
    docker load < openshutter-image.tar && \
    docker-compose -f docker-compose.prod.yml down || true && \
    docker-compose -f docker-compose.prod.yml up -d"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Application is running at:${NC}"
    echo -e "  ${YELLOW}http://${SERVER#*@}:4000${NC}"
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo -e "  ${YELLOW}ssh $SERVER 'cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml logs -f'${NC}"
    echo -e "  ${YELLOW}ssh $SERVER 'cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml down'${NC}"
    echo -e "  ${YELLOW}ssh $SERVER 'cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml up -d'${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi
