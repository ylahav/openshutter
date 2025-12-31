# Server Deployment Commands

This guide provides step-by-step commands to execute on your deployed server after extracting the deployment package.

## Prerequisites

Before deploying, ensure your server has:
- **Node.js 18+** installed
- **pnpm** installed (`npm install -g pnpm`)
- **MongoDB** running (external instance or local)
- **Docker** and **Docker Compose** (optional, for containerized deployment)

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

### Create Production Environment File
```bash
# Create .env.production file
nano .env.production
```

### Required Environment Variables
```env
# MongoDB Configuration
# IMPORTANT: If MongoDB requires authentication, include username:password in URI
# Format: mongodb://username:password@host:port/database

# For MongoDB WITHOUT authentication (local development only):
# MONGODB_URI=mongodb://localhost:27017/openshutter

# For MongoDB WITH authentication (PRODUCTION - Recommended):
MONGODB_URI=mongodb://openshutter_user:your_secure_password@localhost:27017/openshutter?authSource=admin

# For external MongoDB on different server with authentication:
# MONGODB_URI=mongodb://username:password@your-mongodb-host:27017/openshutter?authSource=admin

# For MongoDB Atlas (cloud):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/openshutter?retryWrites=true&w=majority

MONGODB_DB=openshutter

# Authentication Configuration
JWT_SECRET=your-production-secret-key-change-this
NEXTAUTH_SECRET=your-nextauth-secret-change-this
NEXTAUTH_URL=https://your-domain.com

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
PORT=4000
BACKEND_PORT=5000

# Storage Configuration (if using local storage)
LOCAL_STORAGE_PATH=/opt/openshutter/storage
STORAGE_PROVIDER=local

# Google OAuth (if using Google Drive storage)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**⚠️ IMPORTANT**: 
- Change all secrets and configure MongoDB URI before starting!
- If MongoDB requires authentication, you MUST include username:password in MONGODB_URI
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

### Option A: Using Docker Compose (Recommended)

```bash
# If docker-compose.yml exists
docker-compose up -d

# Or with specific compose file
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Option B: Manual Start (Using PM2 - Recommended for Production)

```bash
# Install PM2 globally (if not installed)
npm install -g pm2

# Start backend
cd backend
pm2 start dist/main.js --name openshutter-backend --env production
cd ..

# Start frontend (SvelteKit adapter-node)
cd frontend
pm2 start build/index.js --name openshutter-frontend --env production
cd ..

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown
```

### Option C: Manual Start (Using start.sh script)

```bash
# Make script executable
chmod +x start.sh

# Start application
./start.sh
```

### Option D: Manual Start (Direct Node.js)

```bash
# Terminal 1: Start backend
cd backend
PORT=5000 node dist/main.js

# Terminal 2: Start frontend
cd frontend
PORT=4000 node build/index.js
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
# PM2 logs
pm2 logs

# Docker logs
docker-compose logs -f

# Application logs
tail -f /opt/openshutter/logs/*.log
```

### Restart Application
```bash
# PM2
pm2 restart openshutter-backend
pm2 restart openshutter-frontend

# Docker
docker-compose restart

# Manual
# Stop processes and restart using Step 4 commands
```

### Update Application
```bash
# Stop services
pm2 stop all
# Or: docker-compose down

# Extract new deployment package
cd /opt/openshutter
unzip -o openshutter-deployment.zip

# Install updated dependencies
cd openshutter
pnpm install --prod --frozen-lockfile

# Restart services
pm2 restart all
# Or: docker-compose up -d
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
# Or: docker-compose logs

# Check environment variables
cat .env.production

# Check MongoDB connection
mongosh "mongodb://localhost:27017/openshutter"

# Check port availability
netstat -tulpn | grep :4000
netstat -tulpn | grep :5000
```

### MongoDB Authentication Error: "Command find requires authentication"

This error means MongoDB requires authentication but your connection string doesn't include credentials.

**Solution 1: Add credentials to MONGODB_URI**
```bash
# Edit .env.production
nano .env.production

# Update MONGODB_URI to include username:password
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
nano .env.production  # Configure environment
pnpm install --prod --frozen-lockfile
cd backend && pnpm install --prod --frozen-lockfile && cd ..
cd frontend && pnpm install --prod --frozen-lockfile && cd ..
pm2 start backend/dist/main.js --name openshutter-backend
pm2 start frontend/build/index.js --name openshutter-frontend
pm2 save
pm2 startup  # Follow instructions
```
