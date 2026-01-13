#!/bin/bash

# Cleanup Storage Configs Script (Bash wrapper)
# 
# This script cleans up storage configuration records in the database by:
# - Removing isEnabled from config objects (it should only be at root level)
# - Removing duplicate top-level fields (clientId, clientSecret, etc.)
# 
# Usage:
#   ./scripts/cleanup-storage-configs.sh
#   OR
#   bash scripts/cleanup-storage-configs.sh
#   OR
#   pnpm run cleanup-storage-configs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}🧹 Storage Config Cleanup Script${NC}"
echo ""

# Check if backend is built
if [ ! -f "$PROJECT_ROOT/backend/dist/services/storage/config.js" ]; then
    echo -e "${RED}❌ Backend must be built first!${NC}"
    echo -e "${YELLOW}   Run: pnpm --filter openshutter-backend build${NC}"
    echo -e "${YELLOW}   Or: cd backend && pnpm build${NC}"
    exit 1
fi

# Run the Node.js script
cd "$PROJECT_ROOT"
node scripts/cleanup-storage-configs.cjs
