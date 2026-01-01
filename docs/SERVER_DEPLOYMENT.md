# Server Deployment Commands

This guide provides step-by-step commands to execute on your deployed server after extracting the deployment package.

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
MONGODB_URI=mongodb://openshutter_user:your_secure_password@localhost:27017/openshutter?authSource=admin

# For external MongoDB on different server with authentication:
# MONGODB_URI=mongodb://username:password@your-mongodb-host:27017/openshutter?authSource=admin

# For MongoDB Atlas (cloud):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/openshutter?retryWrites=true&w=majority

MONGODB_DB=openshutter

# Authentication Configuration
AUTH_JWT_SECRET=your-production-secret-key-change-this

# Application Configuration
NODE_ENV=production
PORT=5000

# CORS Configuration (optional)
# Comma-separated list of allowed frontend URLs
# FRONTEND_URL=http://localhost:4000,https://your-domain.com
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

## Step 3: Install Dependencies

### Install Production Dependencies
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
```

## Step 4: Start the Application

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
# IMPORTANT: PORT must be set as environment variable (adapter-node defaults to 3000 if not set)
# Use build/index.js (not just 'build') for ES module compatibility
# Option 1: Set PORT as environment variable before command
cd frontend
PORT=4000 pm2 start build/index.js --name openshutter-frontend --update-env
cd ..

# Option 2: Use ecosystem.config.js (recommended for production)
# cd frontend
# cp ecosystem.config.js.example ecosystem.config.js
# nano ecosystem.config.js  # Edit PORT if needed
# pm2 start ecosystem.config.js
# cd ..

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown (usually involves running a sudo command)
```

**⚠️ IMPORTANT - If frontend starts on port 3000 instead of 4000:**

PM2 may have cached the old environment. Delete and restart the process:
```bash
# Delete the existing process
pm2 delete openshutter-frontend

# Restart with PORT set correctly (remove --env production flag)
cd frontend
PORT=4000 pm2 start build/index.js --name openshutter-frontend --update-env
cd ..
pm2 save

# Verify it's running on port 4000
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

This script starts both services in the foreground. Use this for testing or development.

```bash
# Make script executable
chmod +x start.sh

# Start application (runs in foreground - use Ctrl+C to stop)
./start.sh
```

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
curl http://localhost:4000/api/health
curl http://localhost:5000/api/health

# Or check with PM2
pm2 status

# View logs
pm2 logs openshutter-backend
pm2 logs openshutter-frontend
```

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

### Update Application
```bash
# Stop services
pm2 stop all

# Extract new deployment package
cd /opt/openshutter
unzip -o openshutter-deployment.zip

# Install updated dependencies
cd openshutter
chmod +x build.sh
./build.sh

# Restart services
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
