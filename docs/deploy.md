## Deployment Process - OpenShutter

This guide describes deployment options for OpenShutter using GitHub Actions and Next.js builds.

### Deployment Options
- **[GitHub Actions Deployment](#ci-driven-deployment-recommended)** - Automated deployment via GitHub Actions
- **[Manual Deployment](./manual-deploy.md)** - Step-by-step manual deployment without GitHub Actions

### Environments
- Production server (no Docker in prod per project notes)
- Local dev via `pnpm dev` or Docker Compose if needed (internal APIs proxied to localhost)
- Docker options available (see [Docker Guide](docker.md))

### Prerequisites
- Node 20+
- PM2 process manager (installed automatically)
- MongoDB connection string configured in environment
- Required env vars on server: `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, storage provider vars

### CI-driven Deployment (recommended)
We ship a workflow at `.github/workflows/deploy.yml` that:
1. Installs deps with pnpm
2. Builds Next.js application
3. Packages the build into `release.tgz`
4. Uploads it via SSH/SCP to the server
5. Extracts into `~/apps/openshutter` and manages with PM2 process manager

#### GitHub Secrets
Set these in repo settings:
- `SSH_HOST`: server IP or hostname
- `SSH_USER`: deploy user
- `SSH_KEY`: private key (PEM) of the deploy user
- `SSH_PORT`: optional (default 22)

#### One-time server prep
```bash
mkdir -p ~/apps/openshutter
cp /path/to/your/.env ~/apps/openshutter/.env  # create with required keys if missing
which node  # ensure /usr/bin/node and version >= 20
```

After the first successful deploy, subsequent pushes to `main` will update and restart the application automatically.

### PM2 Management Commands

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
