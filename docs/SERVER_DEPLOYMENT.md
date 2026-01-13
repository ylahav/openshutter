# Server Deployment Commands

This guide provides step-by-step commands to execute on your deployed server after extracting the deployment package.

## Quick Reference

### First Time Installation
1. Transfer and extract deployment package
2. Run `./build.sh` (interactive setup)
3. Start with PM2: `pm2 start ecosystem.config.js`

### Updating Existing Installation
1. **Backup** your `.env` files and database
2. **Stop** services: `pm2 stop all`
3. **Extract** new package: `unzip -o openshutter-deployment.zip`
4. **Install dependencies**: Run `./build.sh` and answer `y` when asked "Is this an update?"
   - The script will install dependencies only (root, backend, and frontend)
   - All existing configuration files (`.env`, `ecosystem.config.js`) will be preserved
   - No prompts for ports/database/credentials
5. **Restart**: `pm2 restart all`

**⚠️ Important**: 
- The deployment package includes **pre-built files** (`backend/dist/` and `frontend/build/`)
- You **MUST install dependencies** using `pnpm install --prod --frozen-lockfile` (new packages may have been added)
- You typically **DON'T need to rebuild** unless updating from source code
- `build.sh` in update mode installs dependencies only and preserves all configuration
- **Building from source**: If building on the server, backend build requires increased Node.js memory (4GB+). The build script automatically sets `NODE_OPTIONS=--max-old-space-size=4096`

## Prerequisites

Before deploying, ensure your server has:
- **Node.js 18+** installed
- **pnpm** installed (`npm install -g pnpm`)
- **MongoDB** running (external instance or local)
- **PM2** installed (`npm install -g pm2`) - Recommended for production process management

## Step 1: Transfer and Extract Deployment Package

### Transfer to Server
```bash
# From your local machine
scp openshutter-deployment.zip user@your-server:/opt/openshutter/
```

### On Server: Extract Package
```bash
# SSH to server
ssh user@your-server

# Create deployment directory
sudo mkdir -p /opt/openshutter
sudo chown $USER:$USER /opt/openshutter

# Navigate to directory
cd /opt/openshutter

# Extract deployment package
unzip -o openshutter-deployment.zip

# Navigate into extracted directory
cd openshutter
```

## Step 2: Configure Environment Variables

### Critical Configuration: CORS and JWT Secret

Before starting the services, ensure these are configured correctly:

1. **CORS Configuration** (Backend `.env`):
   - Set `FRONTEND_URL` to your frontend domain(s)
   - Example: `FRONTEND_URL=https://demo.openshutter.org,http://demo.openshutter.org`
   - This allows the backend to accept requests from your frontend
   - Without this, you'll get "Not allowed by CORS" errors

2. **JWT Secret** (Both Frontend and Backend):
   - Both `frontend/.env.production` and `backend/.env` must have the **same** `AUTH_JWT_SECRET`
   - Generate a secure secret: `openssl rand -base64 32`
   - Copy the same value to both files
   - This is critical for authentication to work

### Create Production Environment Files

The deployment package includes example files. Simply copy them and update with your values:

```bash
# Create frontend .env.production from example
cd frontend
cp env.production.example .env.production
nano .env.production  # Edit with your production values
cd ..

# Create backend .env from example
cd backend
cp env.example .env
nano .env  # Edit with your production values
cd ..
```

**Note**: 
- **Frontend** uses `.env.production` (SvelteKit convention)
- **Backend** uses `.env` (NestJS convention)

### Frontend Environment Variables (`frontend/.env.production`)

The frontend does NOT connect directly to MongoDB - it uses the backend API. Only these variables are needed:

```env
# Authentication Configuration (SvelteKit)
AUTH_JWT_SECRET=your-production-secret-key-change-this

# Application Configuration
NODE_ENV=production
BACKEND_URL=http://localhost:5000
# For production with separate backend server:
# BACKEND_URL=https://api.your-domain.com
# Or if backend is on same server:
# BACKEND_URL=http://localhost:5000

PORT=4000
```

### Backend Environment Variables (`backend/.env`)

The backend connects directly to MongoDB and needs these variables:

```env
# MongoDB Configuration
# IMPORTANT: If MongoDB requires authentication, include username:password in URI
# Format: mongodb://username:password@host:port/database
#
# ⚠️ SPECIAL CHARACTERS IN PASSWORD:
# If your password contains special characters (!, @, #, $, %, &, etc.), 
# you MUST URL-encode them in the connection string:
#   ! = %21, @ = %40, # = %23, $ = %24, % = %25, & = %26, / = %2F, : = %3A
# Example: If password is "mypass!123", use "mypass%21123"
#
# For MongoDB WITH authentication (PRODUCTION - Recommended):
# ⚠️ IMPORTANT: The database name is specified in the URI path (after the port, before the ?)
# Format: mongodb://username:password@host:port/DATABASE_NAME?authSource=admin
# Example for database named "openshutter":
MONGODB_URI=mongodb://openshutter_user:your_secure_password@localhost:27017/openshutter?authSource=admin

# For external MongoDB on different server with authentication:
# MONGODB_URI=mongodb://username:password@your-mongodb-host:27017/your_database_name?authSource=admin

# For MongoDB Atlas (cloud):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/your_database_name?retryWrites=true&w=majority

# Note: MONGODB_DB is NOT used by the application - the database name is in MONGODB_URI
# MONGODB_DB=openshutter  # This is for reference only, not used by code

# Authentication Configuration
AUTH_JWT_SECRET=your-production-secret-key-change-this

# Application Configuration
NODE_ENV=production
PORT=5000

# CORS Configuration (REQUIRED for production)
# Set this to your frontend domain(s) - comma-separated for multiple domains
# Both http and https versions should be included if you use both
FRONTEND_URL=https://demo.openshutter.org,http://demo.openshutter.org
# Or for localhost development:
# FRONTEND_URL=http://localhost:4000
```

**⚠️ IMPORTANT**: 
- **Frontend**: Only needs `AUTH_JWT_SECRET` and `BACKEND_URL` - no MongoDB connection needed
- **Backend**: Needs MongoDB configuration - see backend environment variables below
- Change all secrets before starting!
- If MongoDB requires authentication, you MUST include username:password in backend MONGODB_URI
- See "MongoDB Authentication Setup" section below if you get authentication errors

## Step 2.5: MongoDB Authentication Setup (If Required)

If your MongoDB instance requires authentication (which is recommended for production), you need to create a database user.

### Check if MongoDB Requires Authentication

```bash
# Try connecting without credentials
mongosh "mongodb://localhost:27017/openshutter"

# If you get "Command find requires authentication" error, authentication is enabled
```

### Create MongoDB User for OpenShutter

```bash
# Connect to MongoDB as admin
mongosh "mongodb://localhost:27017/admin"
# Or if admin requires auth:
mongosh "mongodb://admin_user:admin_password@localhost:27017/admin"
```

### In MongoDB Shell, Create User:

```javascript
// Switch to openshutter database
use openshutter

// Create user with read/write permissions
db.createUser({
  user: "openshutter_user",
  pwd: "your_secure_password_here",
  roles: [
    { role: "readWrite", db: "openshutter" }
  ]
})

// Verify user was created
db.getUsers()
```

### Alternative: Create User in Admin Database

If your MongoDB setup requires users to be in the `admin` database:

```javascript
use admin

db.createUser({
  user: "openshutter_user",
  pwd: "your_secure_password_here",
  roles: [
    { role: "readWrite", db: "openshutter" }
  ]
})
```

Then use this connection string:
```env
MONGODB_URI=mongodb://openshutter_user:your_secure_password@localhost:27017/openshutter?authSource=admin
```

### Test MongoDB Connection

```bash
# Test connection with credentials
mongosh "mongodb://openshutter_user:your_secure_password@localhost:27017/openshutter?authSource=admin"

# If connection succeeds, you should see MongoDB shell prompt
# Try a simple query:
db.albums.find().limit(1)
```

### Disable MongoDB Authentication (NOT RECOMMENDED for Production)

If you want to disable authentication (only for development/testing):

```bash
# Edit MongoDB config
sudo nano /etc/mongod.conf

# Comment out or remove:
# security:
#   authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

**⚠️ WARNING**: Disabling authentication is a security risk. Only do this in isolated development environments.

## Step 3: Install Dependencies and Configure Environment

### Option A: Using build.sh (Recommended - Interactive Setup)

The `build.sh` script will guide you through the setup process and create all necessary environment files:

```bash
# Make script executable
chmod +x build.sh

# Run the interactive setup script
./build.sh
```

The script will prompt you for:
1. **Backend port** (default: 5000)
2. **Frontend port** (default: 4000)
3. **MongoDB host** (default: localhost:27017)
4. **Database name** (default: openshutter)
5. **MongoDB authentication** (y/n)
   - If yes, you'll be prompted for:
     - MongoDB username
     - MongoDB password (hidden input)
     - MongoDB auth source (default: admin)

The script will:
- Install all production dependencies
- Create `backend/.env` with your configuration (including `PORT`)
- Create `frontend/.env.production` with your configuration (including `PORT` and `BACKEND_URL`)
- Create `frontend/ecosystem.config.js` for PM2 with your configured ports
- Generate a secure JWT secret (same for both frontend and backend)
- URL-encode special characters in MongoDB passwords automatically

**Note**: The generated `ecosystem.config.js` will automatically load environment variables from `.env.production`, so you don't need to manually edit it unless you want to customize PM2 settings.

### Option B: Manual Installation

If you prefer to configure manually:

```bash
# Install root dependencies
pnpm install --prod --frozen-lockfile

# Install backend dependencies
cd backend
pnpm install --prod --frozen-lockfile
cd ..

# Install frontend dependencies
cd frontend
pnpm install --prod --frozen-lockfile
cd ..

# Then manually create .env files (see Step 2)
```

## Step 4: Start the Application

**Before starting**, ensure your MongoDB connection is properly configured in `backend/.env` (see Step 2).

### Option A: Using PM2 (Recommended for Production)

PM2 is a production process manager that keeps your application running, handles restarts, and provides logging.

```bash
# Install PM2 globally (if not installed)
npm install -g pm2

# Start backend
cd backend
pm2 start dist/main.js --name openshutter-backend --env production
cd ..

# Start frontend (SvelteKit)
# Option 1: Use ecosystem.config.js (Recommended - auto-generated by build.sh)
cd frontend
pm2 start ecosystem.config.js
cd ..

# Option 2: Manual start with environment variables
# IMPORTANT: PORT must be set as environment variable (adapter-node defaults to 3000 if not set)
# Use build/index.js (not just 'build') for ES module compatibility
# cd frontend
# PORT=4000 BACKEND_URL=http://localhost:5000 pm2 start build/index.js --name openshutter-frontend --update-env
# cd ..

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown (usually involves running a sudo command)
```

**⚠️ IMPORTANT - If frontend starts on wrong port:**

If you're using `ecosystem.config.js` (recommended), the ports are automatically loaded from your `.env.production` file. If the port is incorrect:

1. **Check your `.env.production` file**:
   ```bash
   cd frontend
   cat .env.production | grep PORT
   ```

2. **If using ecosystem.config.js**, restart PM2:
   ```bash
   pm2 restart ecosystem.config.js
   # Or delete and restart:
   pm2 delete openshutter-frontend
   pm2 start ecosystem.config.js
   ```

3. **If using manual PM2 start**, ensure environment variables are set:
   ```bash
   cd frontend
   export $(grep -v '^#' .env.production | grep -v '^$' | xargs)
   pm2 restart openshutter-frontend
   ```

4. **Verify it's running on the correct port**:
   ```bash
   pm2 logs openshutter-frontend | grep -i "listening"
   ```

**PM2 Management Commands:**
```bash
# View status
pm2 status

# View logs
pm2 logs
pm2 logs openshutter-backend
pm2 logs openshutter-frontend

# Restart services
pm2 restart openshutter-backend
pm2 restart openshutter-frontend
pm2 restart all

# Stop services
pm2 stop all

# Delete services
pm2 delete openshutter-backend
pm2 delete openshutter-frontend
```

### Option B: Using start.sh script (Simple, but not recommended for production)

This script starts both services in the foreground. It automatically reads ports from the environment files created by `build.sh`.

```bash
# Make script executable
chmod +x start.sh

# Start application (runs in foreground - use Ctrl+C to stop)
# The script will automatically load ports from:
#   - backend/.env (for backend PORT)
#   - frontend/.env.production (for frontend PORT)
./start.sh
```

**Note**: The `start.sh` script reads ports from the environment files, so make sure you've run `build.sh` first or manually created the `.env` files.

### Option C: Manual Start (Direct Node.js)

```bash
# Terminal 1: Start backend
cd backend
PORT=5000 node dist/main.js

# Terminal 2: Start frontend
cd frontend
PORT=4000 node build/index.js
# Or load from .env.production file:
# export $(cat .env.production | xargs) && node build/index.js
```

## Step 5: Verify Deployment

### Check Application Status
```bash
# Check if services are running
# Through frontend (proxies to backend)
curl http://localhost:4000/api/health

# Direct backend access
curl http://localhost:5000/api/health

# Or check with PM2
pm2 status

# View logs
pm2 logs openshutter-backend
pm2 logs openshutter-frontend
```

**Note**: The `/api/health` endpoint is available both:
- Through the frontend at `http://localhost:4000/api/health` (proxies to backend)
- Directly on the backend at `http://localhost:5000/api/health`

### Test Application
```bash
# Open in browser
curl http://localhost:4000

# Or visit in browser
http://your-server-ip:4000
```

## Step 6: Setup Reverse Proxy (Nginx - Optional but Recommended)

### Install Nginx
```bash
sudo apt update
sudo apt install nginx
```

### Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/openshutter
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/openshutter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 7: Setup SSL with Let's Encrypt (Optional)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

## Running Multiple Installations on the Same Server

If you need to run multiple OpenShutter installations on the same server (e.g., different domains), you must configure each installation with **different ports** and **different databases**.

### Example: Two Installations

**Installation 1: openshutter.org**
- Backend port: `5000`
- Frontend port: `4000`
- Database: `openshutter`
- Backend `.env`:
  ```env
  PORT=5000
  MONGODB_URI=mongodb://user:pass@localhost:27017/openshutter?authSource=admin
  ```
- Frontend `.env.production`:
  ```env
  PORT=4000
  BACKEND_URL=http://localhost:5000
  ```

**Installation 2: yairl.com**
- Backend port: `5001` (different!)
- Frontend port: `4001` (different!)
- Database: `ygallery` (different!)
- Backend `.env`:
  ```env
  PORT=5001
  MONGODB_URI=mongodb://user:pass@localhost:27017/ygallery?authSource=admin
  ```
- Frontend `.env.production`:
  ```env
  PORT=4001
  BACKEND_URL=http://localhost:5001
  ```

### PM2 Configuration for Multiple Installations

When using PM2, use different process names. The easiest way is to use the auto-generated `ecosystem.config.js` from each installation:

```bash
# Installation 1 (openshutter.org)
cd /path/to/openshutter.org/openshutter/backend
pm2 start dist/main.js --name openshutter-backend --env production

cd /path/to/openshutter.org/openshutter/frontend
pm2 start ecosystem.config.js  # Uses ports from .env.production

# Installation 2 (yairl.com)
cd /path/to/yairl.com/openshutter/backend
pm2 start dist/main.js --name yairl-backend --env production

cd /path/to/yairl.com/openshutter/frontend
pm2 start ecosystem.config.js  # Uses ports from .env.production
```

**Note**: Each installation's `ecosystem.config.js` is generated by `build.sh` with the correct ports for that installation. The config file automatically loads additional environment variables from `.env.production`.

### Nginx Configuration for Multiple Domains

Configure Nginx to route each domain to its respective frontend port:

```nginx
# openshutter.org
server {
    listen 80;
    server_name openshutter.org;

    location / {
        proxy_pass http://localhost:4000;
        # ... other proxy settings
    }

    location /api {
        proxy_pass http://localhost:5000;
        # ... other proxy settings
    }
}

# yairl.com
server {
    listen 80;
    server_name yairl.com;

    location / {
        proxy_pass http://localhost:4001;
        # ... other proxy settings
    }

    location /api {
        proxy_pass http://localhost:5001;
        # ... other proxy settings
    }
}
```

**⚠️ CRITICAL**: 
- Each installation **MUST** use different ports (backend and frontend)
- Each installation **MUST** use a different database name in `MONGODB_URI`
- Each frontend **MUST** point to its own backend port in `BACKEND_URL`
- If both installations use the same ports, they will conflict and share the same backend/database

## Maintenance Commands

### View Logs
```bash
# PM2 logs (recommended)
pm2 logs
pm2 logs openshutter-backend
pm2 logs openshutter-frontend

# Application logs (if configured)
tail -f /opt/openshutter/logs/*.log
```

### Restart Application
```bash
# PM2 (recommended)
pm2 restart openshutter-backend
pm2 restart openshutter-frontend
pm2 restart all

# Manual restart
# Stop processes (pm2 stop all) and restart using Step 4 commands
```

## Updating an Existing Installation

When updating to a new version of OpenShutter, follow these steps:

### Step 1: Backup Current Installation

**⚠️ IMPORTANT**: Always backup before updating!

```bash
# Backup MongoDB database
mongodump --uri="mongodb://localhost:27017/your_database_name" --out=/backup/openshutter-$(date +%Y%m%d)

# Backup environment files (they contain your configuration)
cd /opt/openshutter/openshutter
cp backend/.env /backup/backend.env.$(date +%Y%m%d)
cp frontend/.env.production /backup/frontend.env.production.$(date +%Y%m%d)
cp frontend/ecosystem.config.js /backup/ecosystem.config.js.$(date +%Y%m%d) 2>/dev/null || true

# Backup storage files (if using local storage)
tar -czf /backup/storage-$(date +%Y%m%d).tar.gz /opt/openshutter/storage 2>/dev/null || true
```

### Step 2: Stop Running Services

```bash
# Stop PM2 processes
pm2 stop all

# Or stop individual services
pm2 stop openshutter-backend
pm2 stop openshutter-frontend
```

### Step 3: Extract New Deployment Package

```bash
# Navigate to deployment directory
cd /opt/openshutter

# Extract new deployment package (overwrites existing files)
unzip -o openshutter-deployment.zip

# Navigate into extracted directory
cd openshutter
```

**Note**: The `-o` flag overwrites existing files. Your `.env` files will be preserved if they exist, but it's safer to backup them first (see Step 1).

### Step 4: Install Dependencies

**Important**: The deployment package includes **pre-built** files (`backend/dist/` and `frontend/build/`), but you still need to install dependencies as new packages may have been added.

**Use the `build.sh` script** - it will ask if this is an update or first installation:

```bash
# Make build script executable
chmod +x build.sh

# Run build script
./build.sh
```

When prompted:
- **For updates**: Answer `y` to "Is this an update to an existing installation?"
  - The script will install dependencies only
  - All existing `.env` files and `ecosystem.config.js` will be preserved
  - No configuration prompts will be shown
  
- **For first installation**: Answer `n` (or press Enter)
  - The script will prompt for all configuration (ports, database, MongoDB credentials)
  - It will create `.env` files and `ecosystem.config.js`

**What `build.sh` does:**
- **Update mode**: Installs dependencies using `pnpm install --prod --frozen-lockfile` (for root, backend, and frontend) and preserves all existing configuration
- **First installation mode**: Installs dependencies, prompts for configuration, creates `.env` files, and generates `ecosystem.config.js`

**Note**: The deployment package already includes built files (`backend/dist/` and `frontend/build/`), so `build.sh` does NOT rebuild the code - it only installs dependencies and configures environment.

#### Manual Install (Alternative, if you prefer)

If you prefer to install dependencies manually without using `build.sh`:

```bash
# Install/update dependencies (production only, no dev dependencies)
# IMPORTANT: Install dependencies at root, backend, AND frontend
pnpm install --prod --frozen-lockfile
cd backend && pnpm install --prod --frozen-lockfile && cd ..
cd frontend && pnpm install --prod --frozen-lockfile && cd ..
```

**Note**: 
- `--prod` flag installs only production dependencies (no dev dependencies)
- `--frozen-lockfile` ensures exact versions from lockfile (important for consistency)
- Must run in **all three locations**: root, backend, and frontend
- This preserves all your existing `.env` files and `ecosystem.config.js` unchanged
- **No rebuild needed** - The deployment package already includes built files (`backend/dist/` and `frontend/build/`)

**Recommendation**: Use `build.sh` instead - it's simpler and handles both update and first installation scenarios automatically.

### Step 5: Restart Services

```bash
# Option 1: Using PM2 (Recommended)
pm2 restart openshutter-backend
pm2 restart openshutter-frontend
# Or restart all
pm2 restart all

# Option 2: Using start.sh (if not using PM2)
# Note: start.sh reads ports from .env files automatically
chmod +x start.sh
./start.sh
```

### Step 6: Verify Update

```bash
# Check PM2 status
pm2 status

# Check logs for errors
pm2 logs openshutter-backend --lines 50
pm2 logs openshutter-frontend --lines 50

# Test backend health
curl http://localhost:5000/api/health

# Test frontend (replace with your port)
curl http://localhost:4000/api/health
```

### Storage Config Cleanup (After Update)

If you're updating from a version that had storage configuration issues (duplicate fields, `isEnabled` in wrong location), run the cleanup script:

```bash
# Make sure backend is built (it should be in the deployment package)
# Run the cleanup script
node scripts/cleanup-storage-configs.cjs

# Or using pnpm
pnpm run cleanup-storage-configs
```

This script will:
- Remove `isEnabled` from inside `config` objects (it should only be at root level)
- Remove duplicate top-level fields (`clientId`, `clientSecret`, etc.)
- Fix any data structure issues in your storage configurations

**When to run**: After updating to a version that includes the cleanup code, especially if you notice storage configs not displaying correctly in the admin panel.

### Quick Update Summary

For quick reference, here's the minimal update process:

```bash
# 1. Backup
pm2 stop all
cp backend/.env backend/.env.backup
cp frontend/.env.production frontend/.env.production.backup

# 2. Extract (deployment package includes pre-built files)
cd /opt/openshutter
unzip -o openshutter-deployment.zip
cd openshutter

# 3. Install dependencies (deployment package has built files, just need dependencies)
./build.sh  # Answer 'y' when asked "Is this an update?"

# 4. Restore config if needed (only if using manual install)
# cp backend/.env.backup backend/.env
# cp frontend/.env.production.backup frontend/.env.production

# 5. Restart
pm2 restart all
```

**Key Points**:
- Deployment package includes **pre-built** `backend/dist/` and `frontend/build/` directories
- You only need to **install dependencies** with `pnpm install --prod --frozen-lockfile`
- **No rebuild needed** unless updating from source code
- `build.sh` installs dependencies and configures environment (doesn't rebuild code)

### Troubleshooting Updates

**If services won't start after update:**

1. **Check environment variables are correct:**
   ```bash
   cat backend/.env | grep -E "PORT|MONGODB_URI"
   cat frontend/.env.production | grep -E "PORT|BACKEND_URL"
   ```

2. **Check PM2 processes:**
   ```bash
   pm2 list
   pm2 logs --err
   ```

3. **Verify build directories exist:**
   ```bash
   ls -la backend/dist/main.js
   ls -la frontend/build/index.js
   ```

4. **If build directories are missing, rebuild:**
   ```bash
   cd backend && pnpm build && cd ..
   cd frontend && pnpm build && cd ..
   ```

5. **Restore from backup if needed:**
   ```bash
   pm2 stop all
   cp backend/.env.backup backend/.env
   cp frontend/.env.production.backup frontend/.env.production
   pm2 restart all
   ```

### Backup
```bash
# Backup MongoDB
mongodump --uri="mongodb://localhost:27017/openshutter" --out=/backup/openshutter-$(date +%Y%m%d)

# Backup storage files
tar -czf /backup/storage-$(date +%Y%m%d).tar.gz /opt/openshutter/storage
```

## Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs
pm2 logs openshutter-backend
pm2 logs openshutter-frontend

# Check environment variables
cat frontend/.env.production
cat backend/.env

# Check MongoDB connection
mongosh "mongodb://localhost:27017/openshutter"

# Check port availability
netstat -tulpn | grep :4000
netstat -tulpn | grep :5000

# Check PM2 status
pm2 status
pm2 info openshutter-backend
pm2 info openshutter-frontend
```

### MongoDB Authentication Error: "Command find requires authentication"

This error means MongoDB requires authentication but your connection string doesn't include credentials.

**Solution 1: Add credentials to MONGODB_URI**
```bash
# Copy and edit frontend .env.production
cd frontend
cp env.production.example .env.production
nano .env.production
cd ..

# Copy and edit backend .env
cd backend
cp env.example .env
nano .env
cd ..

# Update MONGODB_URI to include username:password in backend/.env
# ⚠️ If password contains special characters (!, @, #, etc.), URL-encode them:
#    ! = %21, @ = %40, # = %23, $ = %24, % = %25, & = %26
# Example: password "mypass!123" becomes "mypass%21123"
MONGODB_URI=mongodb://username:password@localhost:27017/openshutter?authSource=admin

# Restart application
pm2 restart all
```

**Solution 2: Create MongoDB user (if user doesn't exist)**
```bash
# Connect to MongoDB
mongosh "mongodb://localhost:27017/admin"

# In MongoDB shell:
use openshutter
db.createUser({
  user: "openshutter_user",
  pwd: "your_secure_password",
  roles: [{ role: "readWrite", db: "openshutter" }]
})
```

**Solution 3: Verify user permissions**
```bash
# Connect with credentials
mongosh "mongodb://username:password@localhost:27017/openshutter?authSource=admin"

# Test query
use openshutter
db.albums.find().limit(1)

# If this works, the credentials are correct
```

**Solution 4: Check MongoDB authentication status**
```bash
# Check if authentication is enabled
sudo cat /etc/mongod.conf | grep -A 2 "security:"

# If you see "authorization: enabled", authentication is required
```

### Permission Issues
```bash
# Fix storage directory permissions
sudo chown -R $USER:$USER /opt/openshutter/storage
chmod -R 755 /opt/openshutter/storage
```

### Port Already in Use
```bash
# Find process using port
sudo lsof -i :4000
sudo lsof -i :5000

# Kill process (replace PID)
kill -9 <PID>
```

## Quick Reference

```bash
# Complete deployment sequence
cd /opt/openshutter
unzip -o openshutter-deployment.zip
cd openshutter
# Configure environment files
cd frontend && cp env.production.example .env.production && nano .env.production && cd ..
cd backend && cp env.example .env && nano .env && cd ..
chmod +x build.sh start.sh
./build.sh  # Install dependencies
pm2 start backend/dist/main.js --name openshutter-backend
cd frontend && PORT=4000 pm2 start build/index.js --name openshutter-frontend --env production --update-env && cd ..
pm2 save
pm2 startup  # Follow instructions
```
