## Deployment - ZIP-based (build-for-deployment.js)

This guide covers manual deployment using the ZIP produced by `scripts/build-for-deployment.js`.

### Overview
- Two modes controlled by `STANDALONE=true`:
  - Non-standalone (default): bundles full `.next` and `src/`
  - Standalone: bundles `.next/standalone` + `.next/static`

### Produce the ZIP locally
```bash
# Non-standalone (default)
pnpm run build:deploy

# Standalone
STANDALONE=true pnpm run build:deploy
```

You will get `openshutter-deployment.zip` in the project root.

### ZIP contents
- Non-standalone ZIP:
  - `.next`, `public`, `src`, `package.json`, `pnpm-lock.yaml`, `next.config.js`, `tsconfig.json`, `postcss.config.js`, `tailwind.config.js`, `ecosystem.config.js`
- Standalone ZIP:
  - `.next/standalone`, `.next/static`, `public`, `package.json`, `pnpm-lock.yaml`, `next.config.js`, `tsconfig.json`, `postcss.config.js`, `tailwind.config.js`, `ecosystem.config.js`

### Server prerequisites
- Node.js 20+
- pnpm
- PM2 (`npm i -g pm2`) optional
- `.env` with `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, etc.

### Deploy: Non-standalone ZIP
```bash
# Upload
scp openshutter-deployment.zip user@server:/tmp/

# On server
ssh user@server
sudo mkdir -p /var/www/yourdomain.com
sudo chown $USER:$USER /var/www/yourdomain.com
cd /var/www/yourdomain.com
unzip -o /tmp/openshutter-deployment.zip

# Install all deps (no --prod)
pnpm install --frozen-lockfile

# Start
PORT=4000 pnpm start

# PM2 (optional)
pm2 start "pnpm start" --name openshutter -- start -p 4000
pm2 save
```

Notes:
- If you do `pnpm install --prod` and then try to build, CSS tooling may be missing.

### Deploy: Standalone ZIP
```bash
# Upload
scp openshutter-deployment.zip user@server:/tmp/

# On server
ssh user@server
sudo mkdir -p /var/www/yourdomain.com
sudo chown $USER:$USER /var/www/yourdomain.com
cd /var/www/yourdomain.com
unzip -o /tmp/openshutter-deployment.zip

# Optional: install prod deps
pnpm install --prod --frozen-lockfile || true

# Start standalone server
PORT=4000 node .next/standalone/server.js

# PM2 (optional)
pm2 start .next/standalone/server.js --name openshutter --update-env --env production
pm2 save
```

### Troubleshooting
- "Couldn't find any `pages` or `app` directory": ensure `src/` exists in the non-standalone ZIP.
- Missing CSS: install all deps for non-standalone or use standalone ZIP.
- Module not found (`class-variance-authority`, `clsx`, `tailwind-merge`): ensure they are in `dependencies` and repackage.

For nginx and advanced PM2 usage, see [./pm2-deployment.md](./pm2-deployment.md).
