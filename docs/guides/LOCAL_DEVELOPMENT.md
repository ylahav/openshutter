# Local development

How to run OpenShutter on your machine for day-to-day development.

## Prerequisites

- **Node.js** 18+ and **pnpm** (see root [README.md](../../README.md)).
- **MongoDB** reachable at the URI you configure (default `mongodb://localhost:27017/openshutter`). The Nest backend connects at startup; without a running database, most API routes fail.
- Optional: Google/AWS credentials only if you exercise those integrations locally.

## Recommended: full stack from the repo root

From the repository root:

```bash
pnpm install
pnpm dev
```

This starts **both** the Nest API (default port **5000**) and the SvelteKit app (default port **4000**), with the frontend delayed slightly so the backend can bind first.

Do **not** rely on running only `pnpm dev` inside `frontend/` unless you also start the backend separately—otherwise the UI will show errors such as “could not reach the gallery server”, an empty admin dashboard, or failed CMS home page loads, because SvelteKit proxies server routes to `BACKEND_URL`.

## Environment variables

### Backend (`backend/.env`)

Copy from `backend/env.example` if needed. Important keys:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string (default `mongodb://localhost:27017/openshutter`) |
| `PORT` | Nest listen port (default `5000`) |
| `AUTH_JWT_SECRET` | Shared secret for JWT (must match frontend where applicable) |
| `FRONTEND_URL` | Browser origin(s) for CORS (e.g. `http://localhost:4000`) |

### Frontend (`frontend/.env.development` or equivalent)

| Variable | Purpose |
|----------|---------|
| `BACKEND_URL` | Base URL of the Nest API for server-side proxying (default `http://localhost:5000`) |

After changing env files, restart the affected process.

## Running apps separately

```bash
# Terminal 1 — API
pnpm dev:backend

# Terminal 2 — UI
pnpm dev:frontend
```

Ensure MongoDB is already running before starting the backend.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Admin dashboard: “Could not load dashboard data” / hint about reaching the API | Backend not running, wrong `BACKEND_URL`, or MongoDB unavailable so dashboard summary fails |
| Home page: “Could not reach the gallery server” | Same: frontend cannot proxy to Nest (backend down, wrong port, or firewall) |
| Nest logs: Mongo connection / timeout errors | MongoDB not started or `MONGODB_URI` wrong |
| Only UI running | Start backend (`pnpm dev:backend` or use root `pnpm dev`) |
| Homepage stuck on “Loading galleries…” | Check browser console for `effect_update_depth_exceeded` or `ReferenceError` (common after Svelte 5 migration: broken `$props()` destructuring like `packId: string` instead of `packId`, or `$effect` loops that write reactive state). Rebuild frontend after fixes (`pnpm --filter openshutter build`) |
| Admin page URL changes but content does not | Svelte 5 client routing can leave stale views; admin uses `data-sveltekit-reload` on sidebar links and `frontend/src/hooks.client.ts` full-navigation fallback for `/admin` anchors. Programmatic navigation: `adminNavigate()` from `$lib/admin/adminNavigation` |
| Admin list pages empty after navigation | Prefer SSR `+page.server.ts` load data and `$derived(data.*)` (or `routePageData()` from `$lib/admin/routePageData`) instead of copying load data into `$state` inside `$effect` |

Verify MongoDB:

```bash
# Example: mongosh
mongosh "mongodb://localhost:27017/openshutter" --eval "db.runCommand({ ping: 1 })"
```

## Related docs

- First-time admin: [ADMIN_SETUP.md](./ADMIN_SETUP.md)
- Production deployment: [SERVER_DEPLOYMENT.md](./SERVER_DEPLOYMENT.md)
- Root install overview: [README.md](../../README.md)
