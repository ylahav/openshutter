# Manual Deployment Guide - OpenShutter

This guide covers deploying OpenShutter manually without GitHub Actions, both locally and on a remote server.

## Prerequisites

### Local Machine
- Node.js 20+
- pnpm package manager
- Git
- Access to your server (SSH)

### Remote Server
- Ubuntu/Debian server
- Node.js 20+
- pnpm
- nginx
- MongoDB (or MongoDB Atlas connection)
- SSL certificate (Let's Encrypt recommended)

## Step-by-Step Deployment

### 1. Local Preparation

#### Build the Application
```bash
# Clone and navigate to project
git clone https://github.com/ylahav/openshutter.git
cd openshutter

# Install dependencies
pnpm install

# Create production environment file
cp env.example .env
# Edit .env with your production values:
# PORT=4000
# MONGODB_URI=your-mongodb-connection-string
# NEXTAUTH_SECRET=your-secret-key
# NEXTAUTH_URL=https://yourdomain.com
# DEFAULT_STORAGE_PROVIDER=google-drive
# NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Build the application
pnpm build
```

#### Package for Deployment
```bash
# Create deployment package
tar -czf openshutter-release.tar.gz \
  .next \
  public \
  next.config.js \
  package.json \
  pnpm-lock.yaml \
  .env

# Verify package contents
tar -tzf openshutter-release.tar.gz | head -20
```

### 2. Server Setup

#### Initial Server Configuration
```bash
# Connect to your server
ssh user@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
sudo npm install -g pnpm

# Install PM2
sudo npm install -g pm2

# Install nginx
sudo apt install nginx -y

# Create application directory
sudo mkdir -p /var/www/yourdomain.com
sudo chown $USER:$USER /var/www/yourdomain.com
```

#### Upload and Extract Application
```bash
# From your local machine, upload the package
scp openshutter-release.tar.gz user@your-server-ip:/tmp/

# On the server, extract the application
cd /var/www/yourdomain.com
tar -xzf /tmp/openshutter-release.tar.gz
rm /tmp/openshutter-release.tar.gz

# Install production dependencies
pnpm install --production --frozen-lockfile
```

### 3. Configure PM2

#### Create PM2 Ecosystem File
```bash
# Create PM2 configuration
cat > /var/www/yourdomain.com/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'openshutter',
    script: 'pnpm start',
    cwd: '/var/www/yourdomain.com',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    env_file: '/var/www/yourdomain.com/.env',
    log_file: '/var/www/yourdomain.com/logs/combined.log',
    out_file: '/var/www/yourdomain.com/logs/out.log',
    error_file: '/var/www/yourdomain.com/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
EOF

# Create logs directory
mkdir -p /var/www/yourdomain.com/logs

# Start the application
pm2 start /var/www/yourdomain.com/ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

### 4. Configure Nginx

#### Create Nginx Site Configuration
```bash
# Create nginx site configuration
sudo nano /etc/nginx/sites-available/yourdomain.com
```

Add this configuration:
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

#### Enable the Site
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 6. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Management Commands

### PM2 Commands
```bash
# Check application status
pm2 status

# View logs
pm2 logs openshutter

# Restart application
pm2 restart openshutter

# Stop application
pm2 stop openshutter

# Start application
pm2 start openshutter

# Monitor in real-time
pm2 monit

# Save current PM2 processes
pm2 save

# Remove process
pm2 delete openshutter
```

### Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# Check nginx status
sudo systemctl status nginx
```

### Application Updates
```bash
# 1. Build new version locally
pnpm build
tar -czf openshutter-release.tar.gz .next public next.config.js package.json pnpm-lock.yaml .env

# 2. Upload to server
scp openshutter-release.tar.gz user@your-server-ip:/tmp/

# 3. On server, update application
cd /var/www/yourdomain.com
pm2 stop openshutter
tar -xzf /tmp/openshutter-release.tar.gz
pnpm install --production --frozen-lockfile
pm2 start openshutter
rm /tmp/openshutter-release.tar.gz
```

## Troubleshooting

### Check Application Logs
```bash
pm2 logs openshutter --lines 50
```

### Check Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Test Static Files
```bash
curl -I http://localhost:4000/_next/static/chunks/webpack-*.js
```

### Check Port Usage
```bash
sudo netstat -tlnp | grep :4000
```

## Environment Variables Reference

Create `.env` file with these variables:

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

This manual deployment process gives you full control over the deployment without relying on GitHub Actions.
