## Deployment Process - OpenShutter

### Environments
- Production server (no Docker in prod per project notes)
- Local dev via `pnpm dev` or Docker Compose if needed (internal APIs proxied to localhost)
- Docker deployment options available (see [Docker Guide](docker.md))

### Prerequisites
- Node 18+
- pnpm installed
- MongoDB connection string configured in environment
- Required env vars: `JWT_SECRET`, `NEXTAUTH_URL`, MongoDB URL, any storage provider vars

### Build
1. Update `next.config.js` as required by the project
2. Install deps: `pnpm install`
3. Build: `pnpm build`
4. Start: `pnpm start`

### Initial Admin
- If no admin exists, the app creates one automatically on first auth path hit
- Default created admin is not blocked

### Deployment (CLI-based)
1. Ensure `.env` is configured on the server
2. Upload source or pull from your repo
3. Run:
   - `pnpm install`
   - `pnpm build`
   - `pnpm start` (or your process manager, e.g., `pm2 start pnpm -- start`)

### Notes
- On backend start, existing sessions are cleared
- Docker-based flows are supported locally but not used in production
- LanguageSelector hidden if only one active language configured
