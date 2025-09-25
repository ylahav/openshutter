# PM2 Deployment Guide - OpenShutter

This guide covers deploying OpenShutter using PM2 process manager, following your manual deployment procedure.

## Overview

The PM2 deployment process consists of two main steps:
1. **Local Development**: Build and package the application
2. **Server Deployment**: Deploy and manage with PM2

## Prerequisites

### Local Machine
- Node.js 20+
- pnpm package manager
- Git

### Remote Server
- Ubuntu/Debian server
- Node.js 20+
- pnpm
- PM2 (`npm install -g pm2`)
- nginx (for reverse proxy)
- MongoDB (or MongoDB Atlas connection)

## Quick Start

### 1. Local Build & Package (ZIP-based)

```bash
# Non-standalone ZIP (default)
pnpm run build:deploy

# Standalone ZIP
STANDALONE=true pnpm run build:deploy
```

This creates `openshutter-deployment.zip` aligned with `scripts/build-for-deployment.js`:
- Non-standalone: `.next`, `public`, `src`, `package.json`, `pnpm-lock.yaml`, `next.config.js`, `tsconfig.json`, `postcss.config.js`, `tailwind.config.js`, `ecosystem.config.js`
- Standalone: `.next/standalone`, `.next/static`, `public`, `package.json`, `pnpm-lock.yaml`, `next.config.js`, `tsconfig.json`, `postcss.config.js`, `tailwind.config.js`, `ecosystem.config.js`

### 2. Server Deployment

```bash
# Upload the package to your server
scp openshutter-deployment.zip user@your-server-ip:/tmp/

# SSH to your server
ssh user@your-server-ip

# Run the deployment script
cd /tmp
chmod +x /path/to/deploy-to-server.sh
./deploy-to-server.sh
```

## Detailed Deployment Process

### Step 1: Local Build Process

#### Manual Build (Alternative to script)
```bash
# Build the application
pnpm build

# Create deployment package manually
zip -r openshutter-deployment.zip \
  .next \
  public \
  package.json \
  pnpm-lock.yaml \
  next.config.js \
  ecosystem.config.js
```

#### Verify Package Contents
```bash
# Check what's in the package
unzip -l openshutter-deployment.zip
```

### Step 2: Server Setup

#### Initial Server Configuration
```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
sudo npm install -g pnpm

# Install PM2
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/yourdomain.com
sudo chown $USER:$USER /var/www/yourdomain.com
```

#### Deploy Application
```bash
# Navigate to project root
cd /var/www/yourdomain.com

# Extract deployment package
unzip /tmp/openshutter-deployment.zip

# Non-standalone: install all deps (no --prod)
pnpm install --frozen-lockfile

# Create logs directory
mkdir -p logs

# Start with PM2 (non-standalone)
pm2 start "pnpm start" --name openshutter -- start -p 4000

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

## PM2 Management Commands

### Application Control
```bash
# Start application
pm2 start ecosystem.config.js

# Stop application
pm2 stop openshutter

# Restart application
pm2 restart openshutter

# Reload application (zero-downtime)
pm2 reload openshutter

# Delete application
pm2 delete openshutter
```

### Monitoring & Logs
```bash
# Check status
pm2 status

# View logs
pm2 logs openshutter

# Monitor in real-time
pm2 monit

# View specific number of log lines
pm2 logs openshutter --lines 50

# Follow logs in real-time
pm2 logs openshutter --follow
```

### Process Management
```bash
# Save current PM2 processes
pm2 save

# Resurrect saved processes
pm2 resurrect

# Show process information
pm2 show openshutter

# Reset restart counter
pm2 reset openshutter
```

## Configuration Files

### ecosystem.config.js
```javascript
module.exports = {
    apps: [{
      name: 'openshutter',
      script: 'node_modules/.bin/next',
      args: 'start -p 4000',
      cwd: '/var/www/yourdomain.com',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      env_file: '/var/www/yourdomain.com/.env',
      
      // Logging
      log_file: '/var/www/yourdomain.com/logs/combined.log',
      out_file: '/var/www/yourdomain.com/logs/out.log',
      error_file: '/var/www/yourdomain.com/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
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
      listen_timeout: 10000
    }]
  }
```

#### Standalone (alternative without ecosystem file)
```bash
# Start the standalone server directly
PORT=4000 node .next/standalone/server.js

# Or with PM2
pm2 start .next/standalone/server.js --name openshutter --update-env --env production
pm2 save
```

## Nginx Configuration

### Basic Nginx Setup
```nginx
server {
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/yourdomain.com;
    index index.html;

    # Handle Next.js static files directly
    location /_next/static/ {
        alias /var/www/yourdomain.com/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Handle public static files
    location /static/ {
        alias /var/www/yourdomain.com/public/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Handle favicon and other public files
    location /favicon.ico {
        alias /var/www/yourdomain.com/public/favicon.ico;
        expires 1y;
        access_log off;
    }

    # Proxy everything else to Next.js server
    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
```

## Environment Variables

Create `.env` file in `/var/www/yourdomain.com/`:

```bash
# Server Configuration
PORT=4000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/openshutter

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://yourdomain.com

# Storage Configuration
DEFAULT_STORAGE_PROVIDER=google-drive

# Application Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Storage Provider Configuration

**Important**: All storage provider configurations (Google Drive, AWS S3, Local Storage) are managed through the admin interface, not environment variables. After deployment:

1. Access the admin panel at `https://yourdomain.com/admin/storage`
2. Configure your storage providers through the web interface
3. Google Drive credentials are stored securely in the database
4. AWS S3 credentials are stored securely in the database
5. Local storage settings (path, max file size) are stored securely in the database

The storage configuration is managed via the `/admin/storage` page in the application.

## Update Process

### Automated Update
```bash
# 1. Build new version locally
pnpm run build:deploy

# 2. Upload to server
scp openshutter-deployment.zip user@your-server-ip:/tmp/

# 3. Deploy on server
ssh user@your-server-ip
cd /var/www/yourdomain.com
pm2 stop openshutter
unzip -o /tmp/openshutter-deployment.zip
pnpm install --production --frozen-lockfile
pm2 start openshutter
rm /tmp/openshutter-deployment.zip
```

### Manual Update
```bash
# 1. Build locally
pnpm build

# 2. Create package manually
zip -r openshutter-deployment.zip .next public package.json pnpm-lock.yaml next.config.js ecosystem.config.js

# 3. Upload and deploy (same as automated)
```

## Troubleshooting

### Check Application Status
```bash
# PM2 status
pm2 status

# Application logs
pm2 logs openshutter --lines 50

# System resources
pm2 monit
```

### Check Port Usage
```bash
# Check if port 4000 is in use
sudo netstat -tlnp | grep :4000

# Check what's using the port
sudo lsof -i :4000
```

### Check Logs
```bash
# PM2 logs
pm2 logs openshutter

# System logs
sudo journalctl -u nginx
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart PM2 application
pm2 restart openshutter

# Restart nginx
sudo systemctl restart nginx

# Restart PM2 daemon
pm2 kill
pm2 resurrect
```

## Performance Monitoring

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# Process information
pm2 show openshutter

# Memory usage
pm2 list
```

### System Monitoring
```bash
# System resources
htop
# or
top

# Disk usage
df -h

# Memory usage
free -h
```

## Backup and Recovery

### Create Backup
```bash
# Backup application files
tar -czf openshutter-backup-$(date +%Y%m%d).tar.gz /var/www/yourdomain.com

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 /var/www/backups/
```

### Restore from Backup
```bash
# Restore application files
tar -xzf openshutter-backup-YYYYMMDD.tar.gz -C /

# Restore PM2 configuration
pm2 resurrect
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **File Permissions**: Ensure proper file ownership and permissions
3. **Firewall**: Configure UFW or iptables to restrict access
4. **SSL**: Use Let's Encrypt for HTTPS
5. **Updates**: Keep system and dependencies updated

## Best Practices

1. **Always test locally** before deploying
2. **Create backups** before major updates
3. **Monitor logs** regularly
4. **Use PM2 ecosystem file** for configuration
5. **Set up log rotation** for production
6. **Monitor system resources** regularly

This PM2 deployment setup provides a robust, production-ready solution for managing your OpenShutter application.
