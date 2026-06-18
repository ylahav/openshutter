# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

OpenShutter is a self-hosted photo gallery management system. The monorepo contains two packages:

- `frontend/` — SvelteKit 2 + Svelte 5 web app (port 4000)
- `backend/` — NestJS REST API (port 5000)

Database: MongoDB (default URI `mongodb://localhost:27017/openshutter`).

## Commands

Run from the repo root unless noted.

```bash
pnpm install            # install all workspace deps
pnpm dev                # start both backend and frontend (backend first, 3s delay)
pnpm dev:frontend       # frontend only
pnpm dev:backend        # backend only
pnpm build              # production build (backend then frontend)
pnpm lint               # ESLint both packages
pnpm type-check         # TypeScript check (frontend only)
pnpm test:e2e           # Playwright E2E (requires app running on :4000)
pnpm test:e2e:ui        # Playwright interactive UI mode
```

Frontend unit tests (run from `frontend/`):

```bash
pnpm vitest run         # single run
pnpm vitest             # watch mode
```

## Architecture

### Request flow

The frontend dev server proxies `/api/*` to the NestJS backend, with exceptions for routes that SvelteKit handles directly (auth login, storage admin, album creation, hierarchy). See `frontend/vite.config.ts` `proxy.bypass` for the full exclusion list. In production, a reverse proxy (e.g. Nginx) handles this split.

### Frontend path aliases

Defined in `frontend/svelte.config.js`:

| Alias | Resolves to |
|-------|-------------|
| `$components` | `src/lib/components` |
| `$stores` | `src/lib/stores` |
| `$types` | `src/lib/types` |
| `$utils` | `src/lib/utils` |
| `$pageBuilder` | `src/lib/page-builder` |
| `$templates` | `src/templates` |

### Multi-tenancy (owner domains)

The app supports multiple "owners", each with their own subdomain or custom domain. A NestJS middleware resolves the request host to a site context (owner + config) and attaches it to every request. The frontend reads this context via cookies/SSR. Owner-specific storage, settings, and domains all flow through this.

### Storage providers

Storage (Google Drive, AWS S3, Backblaze B2, Wasabi, local) is configured through the **admin panel UI**, not env vars — credentials are stored in the database. The `backend/src/storage/` module abstracts all providers behind a common interface.

### Templating system

Two separate surfaces (not the same code path):

1. **Visitor templates** — gallery/album presentation; template packs live in `frontend/src/templates/`, driven by `TEMPLATING.md` (the engineering north star)
2. **Page builder** — admin-authored custom pages; module system documented in `PAGE_BUILDER_MODULES.md`

### Face recognition

TensorFlow (`@tensorflow/tfjs-node`) + `face-api.js` run on the backend. Models are loaded at startup; detection and recognition live in `backend/src/face-detection/` and `backend/src/face-recognition/`. Setup: `docs/guides/FACE_RECOGNITION_SETUP.md`.

### Key documentation

| Path | Contents |
|------|----------|
| `docs/development/TEMPLATING.md` | Visitor templating north-star (engineering) |
| `docs/development/PAGE_BUILDER_MODULES.md` | Page builder module authoring |
| `docs/development/TYPE_SYSTEM.md` | Shared TypeScript type conventions |
| `docs/guides/LOCAL_DEVELOPMENT.md` | MongoDB setup, env vars, troubleshooting |
| `docs/guides/STORAGE.md` | Storage provider configuration |
| `docs/guides/WHITE_LABEL.md` | Multi-tenant / owner domain setup |
| `docs/guides/access-control.md` | Admin/Owner/Guest permission model |

## Environment Variables

Copy `backend/env.example` → `backend/.env` and `frontend/env.development.example` → `frontend/.env`.

Critical vars:

| Var | Where | Note |
|-----|-------|------|
| `MONGODB_URI` | backend | MongoDB connection string |
| `AUTH_JWT_SECRET` | backend **and** frontend | **Required** — both processes throw on startup if missing; must match |
| `NODE_ENV` | both | `development` or `production` |
| `ORIGIN` | frontend (prod only) | Required for CSRF protection in production |
| `BACKEND_URL` | frontend (prod) | Where the frontend server reaches the NestJS API |
| `BODY_SIZE_LIMIT` | frontend (prod) | Set to `100M` for large photo uploads |

Google Maps, email (SMTP), and Google OAuth callback URL are optional backend vars — see `backend/env.example`.

## Roles

Three roles with escalating capabilities: **Guest** (viewer) → **Owner** (manages their own albums/photos) → **Admin** (full system access). Detailed permission matrix: `docs/guides/access-control.md`.
