#!/usr/bin/env node
// Build OpenShutter monorepo for production deployment (cross-platform).
// Produces openshutter-deployment.tar.gz containing dist/, build/, and the
// build.sh / start.sh installers the server runs after extracting.

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(PROJECT_ROOT);

const c = {
	blue: (s) => `\x1b[34m${s}\x1b[0m`,
	green: (s) => `\x1b[32m${s}\x1b[0m`,
	yellow: (s) => `\x1b[33m${s}\x1b[0m`,
	red: (s) => `\x1b[31m${s}\x1b[0m`,
};
const step = (msg) => console.log(c.blue(msg));
const ok = (msg) => console.log(c.green(msg));
const warn = (msg) => console.log(c.yellow(msg));
const die = (msg) => {
	console.error(c.red(`ERROR: ${msg}`));
	process.exit(1);
};

const isWindows = process.platform === 'win32';
const pnpmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';

function run(cmd, args, opts = {}) {
	// Node blocks spawning .cmd/.bat on Windows without shell:true (CVE-2024-27980).
	// Default to shell:true on Windows so pnpm.cmd et al. work; args here contain no
	// shell metacharacters, so no quoting hazard.
	const res = spawnSync(cmd, args, { stdio: 'inherit', shell: isWindows, ...opts });
	if (res.error) die(`${cmd} ${args.join(' ')}: ${res.error.message}`);
	return res.status ?? 0;
}

function which(cmd) {
	const probe = spawnSync(isWindows ? 'where' : 'which', [cmd], { stdio: 'ignore', shell: false });
	return probe.status === 0;
}

function rmrf(target) {
	// force:true swallows lock errors silently, which on Windows can leave a
	// half-deleted directory that later trips downstream file writes. Retry
	// aggressively; only tolerate ENOENT.
	try {
		fs.rmSync(target, { recursive: true, force: false, maxRetries: 20, retryDelay: 250 });
	} catch (err) {
		if (err.code !== 'ENOENT') throw new Error(`Failed to remove ${target}: ${err.message}`);
	}
}

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
	ensureDir(path.dirname(dest));
	fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
	fs.cpSync(src, dest, { recursive: true });
}

function writeLF(file, contents) {
	fs.writeFileSync(file, contents.replace(/\r\n/g, '\n'), { encoding: 'utf8' });
}

step('Building OpenShutter for Production');
console.log('');

// --- Preconditions ---
if (!which('pnpm')) die('pnpm is not installed. Please install pnpm first.');

// --- Install dependencies ---
step('Installing dependencies...');
if (run(pnpmCmd, ['install', '--frozen-lockfile']) !== 0) {
	warn('Lockfile outdated, updating...');
	if (run(pnpmCmd, ['install']) !== 0) die('Failed to install dependencies');
}

// --- Clean previous builds ---
// Leave frontend/.svelte-kit alone — SvelteKit's vite plugin buildStart hook
// rimrafs and recreates .svelte-kit/output/ itself every build. Pre-cleaning
// it here races with Vite 8/rolldown's outDir creation and causes ENOENT in
// vite-plugin-sveltekit-compile's writeBundle.
step('Cleaning previous builds...');
for (const p of ['backend/dist', 'frontend/build', 'frontend/node_modules/.vite']) {
	rmrf(path.join(PROJECT_ROOT, p));
}

// --- Build backend ---
// Run pnpm from inside the package dir instead of `pnpm --filter` from root.
// pnpm's filter mode wraps child stdio with its own line-collapsing prefix,
// which on Windows can race Vite 8/rolldown writes inside the SvelteKit
// compile plugin (ENOENT on .svelte-kit/output/server/manifest-full.js).
step('Building backend...');
if (run(pnpmCmd, ['build'], { cwd: path.join(PROJECT_ROOT, 'backend') }) !== 0) die('Backend build failed');
if (!fs.existsSync(path.join(PROJECT_ROOT, 'backend/dist'))) die('Backend dist directory was not created');
ok('Backend built successfully');

// --- Build frontend ---
step('Building frontend...');
if (run(pnpmCmd, ['build'], { cwd: path.join(PROJECT_ROOT, 'frontend') }) !== 0) die('Frontend build failed');
if (
	!fs.existsSync(path.join(PROJECT_ROOT, 'frontend/build')) &&
	!fs.existsSync(path.join(PROJECT_ROOT, 'frontend/.svelte-kit/output'))
) {
	die('Frontend build directory was not created');
}
ok('Frontend built successfully');

// --- Clean up old deployment archives ---
step('Cleaning up old build files...');
for (const f of ['openshutter-deployment.tar.gz', 'openshutter-deployment.zip', 'openshutter-image.tar']) {
	rmrf(path.join(PROJECT_ROOT, f));
}

// --- Create deployment package ---
step('Creating deployment package...');
const TEMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'openshutter-'));
const DEPLOY_DIR = path.join(TEMP_DIR, 'openshutter');
ensureDir(DEPLOY_DIR);

// Backend files
step('  Copying backend files...');
copyDir('backend/dist', path.join(DEPLOY_DIR, 'backend/dist'));
copyFile('backend/package.json', path.join(DEPLOY_DIR, 'backend/package.json'));
if (fs.existsSync('backend/tsconfig.json')) {
	copyFile('backend/tsconfig.json', path.join(DEPLOY_DIR, 'backend/tsconfig.json'));
}
// i18n translations for backend TranslationsService (cwd=backend, looks for ./i18n)
if (fs.existsSync('frontend/src/i18n')) {
	ensureDir(path.join(DEPLOY_DIR, 'backend/i18n'));
	for (const f of fs.readdirSync('frontend/src/i18n')) {
		if (f.endsWith('.json')) {
			copyFile(path.join('frontend/src/i18n', f), path.join(DEPLOY_DIR, 'backend/i18n', f));
		}
	}
	ok('    Copied frontend/src/i18n to backend/i18n');
}

// Frontend files
step('  Copying frontend files...');
if (fs.existsSync('frontend/build')) {
	copyDir('frontend/build', path.join(DEPLOY_DIR, 'frontend/build'));
	ok('    Copied frontend/build directory');
} else if (fs.existsSync('frontend/.svelte-kit/output')) {
	copyDir('frontend/.svelte-kit/output', path.join(DEPLOY_DIR, 'frontend/.svelte-kit/output'));
	warn('    Copied frontend/.svelte-kit/output directory (fallback)');
} else {
	die('Frontend build directory not found (expected frontend/build or frontend/.svelte-kit/output)');
}
copyFile('frontend/package.json', path.join(DEPLOY_DIR, 'frontend/package.json'));
if (fs.existsSync('frontend/svelte.config.js')) copyFile('frontend/svelte.config.js', path.join(DEPLOY_DIR, 'frontend/svelte.config.js'));
if (fs.existsSync('frontend/vite.config.ts')) copyFile('frontend/vite.config.ts', path.join(DEPLOY_DIR, 'frontend/vite.config.ts'));

// Root config files
step('  Copying configuration files...');
copyFile('package.json', path.join(DEPLOY_DIR, 'package.json'));
if (fs.existsSync('pnpm-workspace.yaml')) copyFile('pnpm-workspace.yaml', path.join(DEPLOY_DIR, 'pnpm-workspace.yaml'));
if (fs.existsSync('pnpm-lock.yaml')) copyFile('pnpm-lock.yaml', path.join(DEPLOY_DIR, 'pnpm-lock.yaml'));

// Env example files
step('  Copying environment example files...');
if (fs.existsSync('frontend/env.production.example')) copyFile('frontend/env.production.example', path.join(DEPLOY_DIR, 'frontend/env.production.example'));
if (fs.existsSync('frontend/ecosystem.config.js.example')) copyFile('frontend/ecosystem.config.js.example', path.join(DEPLOY_DIR, 'frontend/ecosystem.config.js.example'));
if (fs.existsSync('backend/env.example')) copyFile('backend/env.example', path.join(DEPLOY_DIR, 'backend/env.example'));

// Deployment docs
if (fs.existsSync('docs/DEPLOYMENT.md')) copyFile('docs/DEPLOYMENT.md', path.join(DEPLOY_DIR, 'docs/DEPLOYMENT.md'));

// Utility scripts
step('  Copying utility scripts...');
ensureDir(path.join(DEPLOY_DIR, 'scripts'));
for (const f of ['scripts/cleanup-storage-configs.cjs', 'scripts/cleanup-storage-configs.sh']) {
	if (fs.existsSync(f)) copyFile(f, path.join(DEPLOY_DIR, f));
}

// --- Generate build.sh (target: Linux server) ---
const BUILD_SCRIPT = `#!/bin/bash
# Production build script for OpenShutter
# This script installs all production dependencies and configures environment variables

set -e

echo "=========================================="
echo "OpenShutter Production Setup"
echo "=========================================="
echo ""

# Ask if this is an update or first installation
read -p "Is this an update to an existing installation? (y/n) [n]: " IS_UPDATE
IS_UPDATE=\${IS_UPDATE:-n}

if [[ "\$IS_UPDATE" =~ ^[Yy]\$ ]]; then
    echo ""
    echo "=========================================="
    echo "Update Mode: Installing dependencies only"
    echo "=========================================="
    echo ""
    echo "Existing configuration files will be preserved."
    echo ""

    echo "Installing root dependencies..."
    pnpm install --prod --frozen-lockfile

    echo "Installing backend dependencies..."
    cd backend
    pnpm install --prod --frozen-lockfile
    cd ..

    echo "Installing frontend dependencies..."
    cd frontend
    pnpm install --prod --frozen-lockfile
    cd ..

    echo ""
    echo "=========================================="
    echo "Update completed successfully!"
    echo "=========================================="
    echo ""
    echo "Dependencies have been updated."
    echo "Your existing configuration files (.env, ecosystem.config.js) have been preserved."
    echo ""
    echo "Next steps:"
    echo "  1. Restart services: pm2 restart all"
    echo "  2. Verify: pm2 status"
    echo ""
    exit 0
fi

# First installation - prompt for configuration
echo "First Installation Mode: Full setup"
echo ""
echo "Please provide the following configuration:"
echo ""

read -p "Backend port [5000]: " BACKEND_PORT
BACKEND_PORT=\${BACKEND_PORT:-5000}

read -p "Frontend port [4000]: " FRONTEND_PORT
FRONTEND_PORT=\${FRONTEND_PORT:-4000}

echo ""
echo "MongoDB Configuration:"
read -p "MongoDB host [localhost:27017]: " MONGODB_HOST
MONGODB_HOST=\${MONGODB_HOST:-localhost:27017}

read -p "Database name [openshutter]: " MONGODB_DB
MONGODB_DB=\${MONGODB_DB:-openshutter}

read -p "Does MongoDB require authentication? (y/n) [n]: " MONGODB_AUTH_REQUIRED
MONGODB_AUTH_REQUIRED=\${MONGODB_AUTH_REQUIRED:-n}

MONGODB_USER=""
MONGODB_PASSWORD=""
MONGODB_AUTH_SOURCE="admin"

if [[ "\$MONGODB_AUTH_REQUIRED" =~ ^[Yy]\$ ]]; then
    read -p "MongoDB username: " MONGODB_USER
    read -sp "MongoDB password: " MONGODB_PASSWORD
    echo ""
    read -p "MongoDB auth source [admin]: " MONGODB_AUTH_SOURCE
    MONGODB_AUTH_SOURCE=\${MONGODB_AUTH_SOURCE:-admin}
fi

if [[ "\$MONGODB_AUTH_REQUIRED" =~ ^[Yy]\$ ]]; then
    MONGODB_PASSWORD_ENCODED=\$(echo -n "\$MONGODB_PASSWORD" | sed 's/!/%21/g; s/@/%40/g; s/#/%23/g; s/\\\$/%24/g; s/%/%25/g; s/&/%26/g; s/\\//%2F/g; s/:/%3A/g')
    MONGODB_URI="mongodb://\${MONGODB_USER}:\${MONGODB_PASSWORD_ENCODED}@\${MONGODB_HOST}/\${MONGODB_DB}?authSource=\${MONGODB_AUTH_SOURCE}"
else
    MONGODB_URI="mongodb://\${MONGODB_HOST}/\${MONGODB_DB}"
fi

echo ""
echo "=========================================="
echo "Installing dependencies..."
echo "=========================================="

echo "Installing root dependencies..."
pnpm install --prod --frozen-lockfile

echo "Installing backend dependencies..."
cd backend
pnpm install --prod --frozen-lockfile
cd ..

echo "Installing frontend dependencies..."
cd frontend
pnpm install --prod --frozen-lockfile
cd ..

echo ""
echo "=========================================="
echo "Creating environment files..."
echo "=========================================="

JWT_SECRET=\$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)

echo "Creating backend/.env..."
cat > backend/.env << EOF
# MongoDB Configuration
MONGODB_URI=\${MONGODB_URI}
MONGODB_DB=\${MONGODB_DB}

# Authentication Configuration
AUTH_JWT_SECRET=\${JWT_SECRET}

# Application Configuration
NODE_ENV=production
PORT=\${BACKEND_PORT}

# CORS Configuration
FRONTEND_URL=http://localhost:\${FRONTEND_PORT}
EOF

echo "Creating frontend/.env.production..."
cat > frontend/.env.production << EOF
# Authentication Configuration (SvelteKit)
AUTH_JWT_SECRET=\${JWT_SECRET}

# Application Configuration
NODE_ENV=production
BACKEND_URL=http://localhost:\${BACKEND_PORT}
PORT=\${FRONTEND_PORT}
EOF

echo ""
echo "=========================================="
echo "Setup completed successfully!"
echo "=========================================="
echo ""
echo "Configuration summary:"
echo "  Backend port: \${BACKEND_PORT}"
echo "  Frontend port: \${FRONTEND_PORT}"
echo "  MongoDB URI: \${MONGODB_URI}"
echo ""
echo "Environment files created:"
echo "  - backend/.env"
echo "  - frontend/.env.production"
echo ""

echo "Creating frontend/ecosystem.config.js..."
cat > frontend/ecosystem.config.js << ECFGEOF
// PM2 Ecosystem Configuration for OpenShutter Frontend
// Auto-generated by build.sh - do not edit manually

const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.production');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\\\\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

module.exports = {
  apps: [{
    name: 'openshutter-frontend',
    script: 'build/index.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: \${FRONTEND_PORT},
      BACKEND_URL: 'http://localhost:\${BACKEND_PORT}',
      AUTH_JWT_SECRET: '\${JWT_SECRET}',
      ...envVars
    },
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    min_uptime: '10s',
    max_restarts: 10,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
ECFGEOF

echo "  - frontend/ecosystem.config.js"
echo ""
echo "IMPORTANT: The AUTH_JWT_SECRET has been set to the same value in both files."
echo ""
`;

// --- Generate start.sh (target: Linux server) ---
const START_SCRIPT = `#!/bin/bash
# Production start script for OpenShutter
# Each service is launched in its own subshell so its .env file is sourced
# into a clean environment (no cross-pollution between backend and frontend).

set -e

trap 'kill -TERM \$BACKEND_PID \$FRONTEND_PID 2>/dev/null' TERM INT

echo "Starting OpenShutter services..."

# --- Backend ---
(
    cd backend
    if [ -f .env ]; then
        set -a; . ./.env; set +a
        echo "Loaded backend/.env"
    else
        echo "backend/.env not found"
    fi
    : "\${PORT:=5000}"
    echo "Starting backend on port \${PORT}..."
    exec node dist/main.js
) &
BACKEND_PID=\$!

# Give the backend a moment to bind before the frontend starts proxying
sleep 3

# --- Frontend (SvelteKit / adapter-node) ---
(
    cd frontend
    if [ -f .env.production ]; then
        set -a; . ./.env.production; set +a
        echo "Loaded frontend/.env.production"
    else
        echo "frontend/.env.production not found"
    fi
    : "\${PORT:=4000}"
    echo "Starting frontend on port \${PORT}..."
    exec node build/index.js
) &
FRONTEND_PID=\$!

wait \$BACKEND_PID \$FRONTEND_PID
`;

writeLF(path.join(DEPLOY_DIR, 'build.sh'), BUILD_SCRIPT);
writeLF(path.join(DEPLOY_DIR, 'start.sh'), START_SCRIPT);

// --- Archive: prefer tar (universally available on Win10+, macOS, Linux) ---
step('  Creating archive...');
const TAR_PATH = path.join(PROJECT_ROOT, 'openshutter-deployment.tar.gz');
if (!which('tar')) die('tar not found. Install tar (Windows 10+ ships it as C:\\\\Windows\\\\System32\\\\tar.exe).');
// Archive the contents of DEPLOY_DIR (backend/, frontend/, build.sh, ...) directly
// at the tarball root — no leading `openshutter/` wrapper. `tar xzf` at the deploy
// dir (e.g. /var/www/yairl.com) drops files straight into place.
const tarRes = spawnSync('tar', ['-czf', TAR_PATH, '-C', DEPLOY_DIR, '.'], { stdio: 'inherit', shell: false });
if (tarRes.status !== 0) die(`tar failed with exit code ${tarRes.status}`);
if (!fs.existsSync(TAR_PATH)) die('Deployment package was not created');

const sizeMB = (fs.statSync(TAR_PATH).size / 1024 / 1024).toFixed(2);
ok(`  TAR archive created: openshutter-deployment.tar.gz (${sizeMB} MB)`);

// --- Cleanup ---
rmrf(TEMP_DIR);

// --- Summary ---
console.log('');
ok('Production build completed successfully!');
console.log('');
step('Files created:');
console.log(`  ${c.yellow('openshutter-deployment.tar.gz')} - Complete deployment package (${sizeMB} MB)`);
console.log('');
step('Next steps:');
console.log('  1. Copy openshutter-deployment.tar.gz to your deploy dir on the server');
console.log('     (e.g. /var/www/yairl.com)');
console.log('  2. Extract in place: tar -xzf openshutter-deployment.tar.gz');
console.log('  3. Configure .env.production with your MongoDB URI (external MongoDB required)');
console.log('     Example: MONGODB_URI=mongodb://your-mongodb-host:27017/openshutter');
console.log('  4. Install dependencies: chmod +x build.sh && ./build.sh');
console.log('  5. Start application: chmod +x start.sh && ./start.sh');
console.log('     Or use PM2 (recommended): See docs/SERVER_DEPLOYMENT.md');
console.log('');
