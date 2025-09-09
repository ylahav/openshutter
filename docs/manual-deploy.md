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
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# GOOGLE_REFRESH_TOKEN=your-google-refresh-token
# GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id

# Build the application
pnpm build
```

#### Package for Deployment
```bash
# Create deployment package
tar -czf openshutter-release.tar.gz \
  .next/standalone \
  .next/static \
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

# Install Watt3
curl -fsSL https://watt3.dev/install.sh | sudo bash

# Install nginx
sudo apt install nginx -y

# Create application directory
sudo mkdir -p /var/www/yairl.com
sudo chown $USER:$USER /var/www/yairl.com
```

#### Upload and Extract Application
```bash
# From your local machine, upload the package
scp openshutter-release.tar.gz user@your-server-ip:/tmp/

# On the server, extract the application
cd /var/www/yairl.com
tar -xzf /tmp/openshutter-release.tar.gz
rm /tmp/openshutter-release.tar.gz

# Install production dependencies
pnpm install --production --frozen-lockfile
```

### 3. Configure Watt3

#### Create Watt3 Configuration File
```bash
# Create Watt3 configuration
cat > /var/www/yairl.com/watt3.toml << 'EOF'
[processes.openshutter]
command = "node .next/standalone/server.js"
cwd = "/var/www/yairl.com"
env = { NODE_ENV = "production", PORT = "4000" }
env_file = "/var/www/yairl.com/.env"
restart = "always"
restart_delay = "4s"
max_restarts = 10
min_uptime = "10s"
max_memory = "1G"

[processes.openshutter.logging]
stdout = "/var/www/yairl.com/logs/out.log"
stderr = "/var/www/yairl.com/logs/error.log"
combined = "/var/www/yairl.com/logs/combined.log"
max_size = "10MB"
max_files = 5
EOF

# Create logs directory
mkdir -p /var/www/yairl.com/logs

# Start the application
watt3 start /var/www/yairl.com/watt3.toml

# Save Watt3 configuration
watt3 save
```

### 4. Configure Nginx

#### Create Nginx Site Configuration
```bash
# Create nginx site configuration
sudo nano /etc/nginx/sites-available/yairl.com
```

Add this configuration:
```nginx
server {
    server_name yairl.com www.yairl.com;
    root /var/www/yairl.com;
    index index.html;

    # Handle Next.js static files directly
    location /_next/static/ {
        alias /var/www/yairl.com/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Handle public static files
    location /static/ {
        alias /var/www/yairl.com/public/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Handle favicon and other public files
    location /favicon.ico {
        alias /var/www/yairl.com/public/favicon.ico;
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
sudo ln -s /etc/nginx/sites-available/yairl.com /etc/nginx/sites-enabled/

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
sudo certbot --nginx -d yairl.com -d www.yairl.com

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

### Watt3 Commands
```bash
# Check application status
watt3 status

# View logs
watt3 logs openshutter

# Restart application
watt3 restart openshutter

# Stop application
watt3 stop openshutter

# Start application
watt3 start openshutter

# Monitor in real-time
watt3 monit

# Save current Watt3 processes
watt3 save

# Remove process
watt3 remove openshutter
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
tar -czf openshutter-release.tar.gz .next/standalone .next/static public next.config.js package.json pnpm-lock.yaml .env

# 2. Upload to server
scp openshutter-release.tar.gz user@your-server-ip:/tmp/

# 3. On server, update application
cd /var/www/yairl.com
watt3 stop openshutter
tar -xzf /tmp/openshutter-release.tar.gz
pnpm install --production --frozen-lockfile
watt3 start openshutter
rm /tmp/openshutter-release.tar.gz
```

## Troubleshooting

### Check Application Logs
```bash
watt3 logs openshutter --lines 50
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
NEXTAUTH_URL=https://yairl.com

# Google Drive Integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_DRIVE_FOLDER_ID=your-google-drive-folder-id
```

This manual deployment process gives you full control over the deployment without relying on GitHub Actions.
