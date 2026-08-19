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

### Videos

Videos are a separate collection from photos (`backend/src/videos/`, model `Video.ts`). V1 accepts **MP4 only** (H.264/AAC), up to **500MB**, no server-side transcoding.

**Uploads** use a **direct-to-storage presigned flow** to bypass Cloudflare's 100MB body limit and nginx/SvelteKit body limits: `POST /api/videos/upload-init` mints a presigned S3-compatible PUT URL, the browser PUTs the file straight to storage, then `POST /api/videos/upload-finalize` verifies via HEAD and inserts the doc. Only providers that implement `IStorageService.getPresignedUploadUrl` support this — all three S3-compatible providers (Backblaze, AWS S3, Wasabi) do; Google Drive and local do not. A buffered `POST /api/videos/upload` still exists as a fallback for small files or providers without presign. The bucket needs CORS allowing `s3_put` from the browser origin (B2 UI presets cover only downloads — use CLI or API for `s3_put`).

**Uploads share the photos upload page**: `/admin/photos/upload` (single unified media upload) detects MP4 and delegates to the video path. Standalone `/admin/videos/upload` redirects there.

**Posters**: the video edit page (`/admin/videos/[id]/edit`) can capture the current frame as a poster via a hidden `<video crossorigin="anonymous">` + canvas.drawImage + `POST /api/videos/[id]/poster`. Requires CORS on the video's read URL — if `publicBaseUrl` points at a Cloudflare Worker, the Worker must set `Access-Control-Allow-Origin`. Poster URL surfaces in visitor cards (grid + lightbox `poster=""`) and admin album detail thumbnails. Admin edit UI mirrors photo edit: `MultiLangInput` for title, `MultiLangHTMLEditor` for description.

Album pages return both `photos` and `videos` from `GET /api/albums/:idOrAlias/data`; the visitor `AlbumGallery` folds videos into the photo-card grid with `mediaType: 'video'`, `coverUrl = poster.url`, and a play-icon overlay + duration badge sits on top of the poster.

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
| `BODY_SIZE_LIMIT` | frontend (prod) | `500M` for MP4 uploads (100M is fine if only photos). Video uploads bypass this via the direct-to-storage presigned flow, but the buffered `/api/videos/upload` fallback still respects it. |

Google Maps, email (SMTP), and Google OAuth callback URL are optional backend vars — see `backend/env.example`.

## Roles

Three roles with escalating capabilities: **Guest** (viewer, `/member`) → **Owner** (Editor, lands on `/admin`) → **Admin** (`/admin` + system management). "Owner" is the backend role name; the UI label is "Editor" (`frontend/src/lib/constants/roles.ts`). Editor manages content (albums, photos, videos, tags/people/locations for their own creations, pages, blog, analytics, templates, theme, storage, profile, per-owner site settings) but not system-level pages (users, groups, site-config, backup-restore, audit-logs, marketplace, modules, translations, import-sync, docs). The legacy `/owner/*` tree was folded into `/admin/*` — `hooks.server.ts` redirects any residual `/owner/*` URL to its `/admin/*` counterpart. All frontend role logic lives in `frontend/src/lib/server/admin-access.ts`: `ownerCanAccessAdminPath` (the page allowlist, consumed by both `hooks.server.ts` and `frontend/src/routes/admin/+layout.server.ts`) and the `isAdmin` / `isAdminOrOwner` / `isOwner` predicates plus `requireAdmin` / `requireAdminOrOwner` gates used by every `/api` proxy route. Each proxy's gate must mirror the `@UseGuards` on the NestJS controller it forwards to — never stricter, or the endpoint becomes unreachable for a role the backend serves. Covered by `admin-access.test.ts`. Sidebar filtering is keyed by `adminOnly` per item in `frontend/src/lib/admin/admin-nav-sections.ts`. Backend guards enforce ownership on writes for tags/people/locations (owner can create, but only edit/delete items they created). Detailed permission matrix: `docs/guides/access-control.md`.
