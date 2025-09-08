## Deployment Process - OpenShutter

This guide describes a minimal-on-server deployment using GitHub Actions and a standalone Next.js build.

### Environments
- Production server (no Docker in prod per project notes)
- Local dev via `pnpm dev` or Docker Compose if needed (internal APIs proxied to localhost)
- Docker options available (see [Docker Guide](docker.md))

### Prerequisites
- Node 20+
- Systemd available
- MongoDB connection string configured in environment
- Required env vars on server: `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, storage provider vars

### CI-driven Deployment (recommended)
We ship a workflow at `.github/workflows/deploy.yml` that:
1. Installs deps with pnpm
2. Builds Next.js with `output: 'standalone'`
3. Packages the build into `release.tgz`
4. Uploads it via SSH/SCP to the server
5. Extracts into `~/apps/openshutter` and restarts `systemd` service `openshutter`

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

After the first successful deploy, subsequent pushes to `main` will update and restart the service automatically.
