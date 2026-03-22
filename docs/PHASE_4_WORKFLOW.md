# Phase 4 Workflow

**Branch:** `phase-4`  
**Horizon:** Next 18 months  
**Status:** Stages 1–3 **complete** (March 2026): white-label, marketplace expansion, collaboration MVP (album comments). Phase 4 stages 4+ not started.

This document defines the workflow and scope for Phase 4 of the OpenShutter roadmap. Each initiative includes goals, scope, and suggested deliverables.

---

## Overview


| #   | Initiative                                                   | Priority | Dependencies                          |
| --- | ------------------------------------------------------------ | -------- | ------------------------------------- |
| 1   | White-label solutions                                        | High     | Site config, themes                   |
| 2   | Integration marketplace                                      | High     | API marketplace (Phase 3), public API |
| 3   | Advanced collaboration features                              | Medium   | Roles, albums, API                    |
| 4   | Machine learning for tag optimization                        | Medium   | AI tagging (Phase 3), analytics       |
| 5   | Mobile app development                                       | Medium   | Public API, auth                      |
| 6   | Video support                                                | Medium   | Storage, media pipeline               |
| 7   | Enterprise features (SSO, audit logs, quotas, multi-tenancy) | Medium   | Auth system, Admin                    |


---

## 1. White-label solutions

**Goal:** Support two distinct white-label modes: (1) a single branded installation with no OpenShutter branding visible, and (2) per-owner custom domains where visitors see only that owner's content and admin is done at `<domain>/admin`.

---

### 1.1 Solution 1: Clean white-label installation

One deployment that appears as a completely separate product. No mention of OpenShutter for end users.

**Scope:**

- **Branding (global):**
  - Site name (product name in header, login, emails).
  - Logo (light/dark), favicon.
  - Primary/secondary colors (Theme Builder / site config already support this).
  - Login and register pages use the same branding.
- **Removal of upstream branding:**
  - Config flag (e.g. `hideOpenShutterBranding`) to remove "OpenShutter" from footer, header, login, and all emails.
  - Replace with the configured white-label name.
- **Where it applies:** Login/register, footer/header, email templates (welcome, password reset, notifications), admin shell (logo + name).
- **Legal/terms:** Configurable terms of service, privacy policy URLs (or inline text) in site config.
- **Domain:** One canonical base URL for the install (existing `FRONTEND_URL` / `EMAIL_BASE_URL`). Documentation/runbook for deploying a white-label instance (DNS, TLS, config).

**Deliverables:** Design doc (config schema, override points); site config UI for white-label options (name, logo, emails, legal URLs, "hide branding"); email and login templates parameterized by branding; runbook for white-label deploy.

---

### 1.2 Solution 2: Per-owner custom domains ("mini-sites")

**Implementation status (March 2026):**

- `owner_domains` collection, admin CRUD (`/api/admin/owner-domains`), and Users admin UI (Owner Domains section) are implemented.
- Host-based `SiteContextMiddleware` resolves `siteContext = { type: 'owner-site', ownerId }` from `Host` / `X-Forwarded-Host`.
- Public site config (`GET /api/site-config`) merges `owner_site_settings` for owner domains (title, description, logo, favicon, SEO, header/menu overrides).
- SvelteKit `hooks.server.ts` resolves `locals.siteContext` once per request via `GET /api/site-context`, forwarding the visitor `Host` (and `backendRequest` auto-forwards `Host` for all server-proxied API calls so the backend sees the same context).
- **Owner-domain `/admin` and `/owner`:** system **admins** are redirected to `/` on an owner custom domain (use the main site for full admin). **Owners** must match `siteContext.ownerId`; otherwise the session cookie is cleared and the user is sent to login. `admin/+layout.server.ts` repeats the same checks as a safeguard.
- **Public photos API** (`GET /api/photos`, `gallery-leading`, `:id`) is scoped by `createdBy` album ownership when `siteContext` is owner-site (prevents cross-owner photo ID leaks).
- **Public pages and blog:** `GET /api/pages/:slug` and `GET /api/v1/pages` (list + by slug/alias) filter by page `createdBy` when on an owner domain. **Blog:** `GET /api/blog`, `GET /api/blog/:slug`, and `GET /api/v1/blog` filter published articles by `authorId`. SvelteKit proxies `/api/blog` and `/api/blog/[slug]` forward `Host` like other public API routes.
- **Per-owner storage:** Global/site storage is configured under **`/admin/storage`** (`storage_configs`). Owners normally use the shared profile field **`storageConfig`** on **`/owner/storage`**. When an admin enables **`useDedicatedStorage`** for an owner (Admin → Users), that owner’s uploads and reads use rows in **`owner_storage_configs`** (managed on **`/owner/storage`** with per-provider credentials). **Stage 1 is complete** for this area; optional hardening (storage off the user document, stricter “no global fallback” docs) is **deferred, low priority** — see §1.2.6.

An **owner** user can have their own **public site at a custom domain**. Visitors on that domain see **only that owner's albums** (and blog, if applicable). Admin for that site is at `**<owner-domain>/admin`**. If no custom domain is configured for an owner, behaviour stays as today (shared domain, shared browse).

#### 1.2.1 Data model

- **Domain → owner mapping:** Add a way to resolve hostname to owner.
  - **Option A – separate mapping:** New collection/table `OwnerDomain` (or equivalent):
    - `hostname` (string, unique; e.g. `photos.alice.com`).
    - `ownerId` (ref to user with role `owner`).
    - `isPrimary` (optional; for multiple domains per owner).
    - `active` (boolean).
  - **Option B – on user:** Add `customDomain?: string` on the User (one domain per owner).
  - Recommendation: separate mapping for flexibility and future multi-domain per owner.
- **Storage config per owner/domain:** Storage configuration (providers, default storage, credentials, buckets/paths) is **per owner** (or per domain when domains have different storage). Each owner's uploads and assets use only that owner's storage config; global/site-wide storage config does not apply to owner-site content. Admin configures storage when creating/editing an owner (or when assigning a domain); owner sees only their storage settings in `<domain>/admin`.

#### 1.2.2 Request routing and context

- **Resolve site by host:** On each request, read `Host` (or `X-Forwarded-Host` behind proxy). Look up domain in `OwnerDomain`. If found → `siteContext = { type: 'owner-site', ownerId }`; if not found → `siteContext = { type: 'global' }` (current behaviour).
- **Frontend:** In root layout (e.g. `+layout.server.ts`), resolve `siteContext` (e.g. from backend or server-side host lookup) and inject into `locals`. Public routes (`/`, `/albums`, album view, etc.): when `siteContext.type === 'owner-site'`, filter all content by `ownerId` (e.g. only albums where `createdBy === ownerId`); hide global "all albums" browse. When `global`, keep current behaviour.
- **Backend:** Middleware or guard that sets `siteContext` from host. For public album/photo APIs, when in owner-site context, add `ownerId` filter so responses never include another owner's content.

#### 1.2.3 Ownership and content scoping

- Albums (and photos via album) must be owner-scoped (e.g. `createdBy` or explicit `ownerId`). When in owner-site context, all read/write for public content is scoped to that `ownerId`.
- Examples: `GET /api/albums` on `alicephotos.com` → only albums for that owner; search and blog (if present) similarly scoped.

#### 1.2.4 Admin at `<domain>/admin`

- On the **owner's domain:** `/admin` is the **owner admin** for that site only (their albums/photos/blog). Same UI as current owner/admin, but automatically scoped via `siteContext.ownerId`. Login at `<owner-domain>/login` (or redirect to shared auth that respects host) → after login, redirect to `<owner-domain>/admin`.
- On the **global/admin domain:** `/admin` remains the full system admin (all users, all content). Global admin can manage owners and their domains.

Implementation: when `siteContext.type === 'owner-site'`, guards for `/admin` allow only the owner whose `ownerId` matches the resolved context; admin UI filters to that owner. Full system admin is restricted to the global domain (or a dedicated admin host).

#### 1.2.5 Owner creation flow

- When an admin creates an **owner** user, optional step: **assign custom domain**.
  - If domain is set: validate uniqueness, show DNS instructions (CNAME/A, TLS), create `OwnerDomain` record. Owner can then use their domain for public site + `/admin`.
  - If no domain: owner behaves as today (uses default domain; no separate public "site" at its own host).

#### 1.2.6 Storage config per owner/domain

- **Per-owner storage (design):** Each owner (and thus each owner domain) should have a clear storage story: which providers are allowed, credentials, default provider for uploads, and serving paths. Content for that owner should resolve to the correct backend without leaking another owner’s assets.
- **Current implementation:** **Global** storage lives in **`storage_configs`** (Admin → **Storage**). **Owners** use **`/owner/storage`**, backed by profile **`storageConfig`** for the default path. **Dedicated per-owner storage:** when **`User.useDedicatedStorage`** is `true`, the backend uses **`owner_storage_configs`** (per provider) and **`StorageManager`** resolves owner context for uploads/serve; admins set the flag and allowed providers in **Admin → Users**; owners manage credentials on **`/owner/storage`**. This is tied to the user record today (flag + profile), not a standalone “storage tenant” entity.
- **Deferred (low priority):** Stricter policy docs if the product must **never** fall back to global when dedicated is enabled; optional wizard vs edit-after-create for storage; any future split if storage settings should live off the `User` document entirely. (Post–Stage 1 UX for domains/storage is already in Admin → Users.)

#### 1.2.7 Edge cases and notes

- **Multiple domains per owner:** Supported if using a mapping table; one can be marked primary for canonical URLs.
- **SEO:** Canonical **`og:url`** use the request host (root layout). **Deferred (low priority):** per-host sitemaps; optional canonical override to **`owner_domains.isPrimary`** when multiple domains serve the same site.
- **SSO (Phase 4 Enterprise):** When adding SSO, auth can be tied to `siteContext` so org-specific IdP can be used per domain/tenant later.

**Deliverables:** Design doc (domain mapping, host resolution, security, per-owner storage); backend: `owner_domains` + host-resolution middleware + **owner storage resolution** (`useDedicatedStorage`, `owner_storage_configs`); frontend: `siteContext`, owner-scoped public routes and `/admin`; admin UI for owner domains and per-owner storage (flag + **`/owner/storage`**); DNS/TLS runbook (**`docs/WHITE_LABEL_DEPLOY.md`** for Solution 1 + owner-domain notes).

---

### 1.x Cross-cutting considerations

- **Licensing**
  - The monorepo **`package.json`** files currently declare **MIT** (see repository root). **There is no separate “white-label license”** in code: white-label is **configuration** (site config, themes, optional owner domains). Whether you **sell** hosting, support, or a branded product is a **business and legal** choice outside this repo.
  - **Dependencies** (NestJS, SvelteKit, MongoDB drivers, cloud SDKs, etc.) have their own licenses; production deployments must **comply with all of them**. If you **relicense** the project (e.g. AGPL for network copyleft), update **`LICENSE`**, **`package.json`**, contributor agreements, and this section consistently.
  - A root **`LICENSE`** file should **mirror** the SPDX license in **`package.json`** so forks and CI know the terms at a glance.

- **Updates and upgrades**
  - **Site config** (`site_config` / Admin → Site config): merged on read with defaults; nested blocks (**`whiteLabel`**, **`contact.socialMedia`**, etc.) are deep-merged where implemented so partial documents survive upgrades.
  - **Theme Builder / template JSON** lives in site config; back up before major upgrades if you rely on custom layouts.
  - **Owner domains** (`owner_domains`), **dedicated storage** rows (`owner_storage_configs`), and **album/photo** data are ordinary MongoDB collections—plan migrations and backups per **`docs/SERVER_DEPLOYMENT.md`**.
  - **Override points** for branding: **`docs/WHITE_LABEL_DESIGN.md`**, **`docs/WHITE_LABEL_DEPLOY.md`**, and **`CHANGELOG.md`** for release-to-release behavior changes.

- **Summary:** Solution 1 = one brand per install, no OpenShutter visible (optional separate public logo/favicon under **`whiteLabel`**). Solution 2 = per-owner domain and content isolation with admin at `<domain>/admin`; optional at owner creation.

---

## 2. Integration marketplace

**Goal:** Expand the Phase 3 API marketplace into a richer directory of integrations (plugins, scripts, apps) with discovery, reviews, and lifecycle.

### 2.1 Scope (beyond Phase 3)

- **Listing richness:** Categories, tags, screenshots, docs links, version history; optional ratings/reviews.
- **Discovery:** Search, filters (category, compatibility), featured/popular; optional "verified" or "official" badges.
- **Lifecycle:** Submission → review → approve/reject; optional deprecation and removal; versioning (e.g. "works with API v1").
- **Integration types:** Scripts (e.g. CLI), webhooks, OAuth apps, optional in-app "connectors" that use the API.

### 2.2 Considerations

- **Moderation:** Admin approval; optional reporting/flagging; policy for removal.
- **Trust:** Optional code signing or security review for listed items; link to source/docs only vs hosting binaries.

### 2.3 Deliverables

- Marketplace expansion design (schema, workflows, UI).
- Backend: extended listing model, versioning, ratings/reviews if desired; moderation APIs.
- Frontend: improved marketplace UI (categories, search, detail page with versions/reviews); submit/update flow; admin moderation UI.

**Implementation status (March 2026 – Stage 2 scope per [`MARKETPLACE_EXPANSION_PHASE4.md`](./MARKETPLACE_EXPANSION_PHASE4.md)):**

- **Done:** `tags` and `featured` on listings; public **`GET /api/marketplace`** with `category`, `featured`, `q`, **`limit`/`offset`**; marketplace home search, category chips, featured section; listing detail shows tags, featured badge, **screenshots**; submit form tags; admin approve/unapprove, featured toggle, **tag editing**, delete.
- **Deferred (low priority, full §2.1):** Version history on detail, ratings/reviews, verified badges, popularity metrics, reporting, OAuth/webhook integration types.

---

## 3. Advanced collaboration features

**Goal:** Improve how teams work together on albums and photos (comments, tasks, approvals, activity feed).

### 3.1 Possible features

- **Comments:** Per-photo or per-album comments; threading; notify mentioned users; moderation (hide/delete).
- **Tasks / assignments:** Assign "review" or "edit" tasks to users/groups; due dates; status (open/done).
- **Approval workflow:** Draft → submit for review → approve/reject; optional multi-step (e.g. reviewer then publisher).
- **Activity feed:** Timeline of recent changes (uploads, tags, comments, approvals) per album or per user; filterable.

### 3.2 Considerations

- **Permissions:** Who can comment, assign, approve (roles/groups); align with existing album `allowedUsers` / `allowedGroups`.
- **Notifications:** In-app and/or email for comments, assignments, approvals.
- **API:** Expose comments, tasks, approvals via public API for integrations.

### 3.3 Deliverables

- Collaboration design doc (data model, permissions, notifications).
- Backend: comments, tasks, approval state machine, activity events.
- Frontend: comment UI, task list/assignment UI, approval actions, activity feed.
- API endpoints for collaboration entities.

---

## 4. Machine learning for tag optimization

**Goal:** Use ML to improve tag quality and discovery (auto-tag refinement, related tags, search relevance).

### 4.1 Scope

- **Tag refinement:** Learn from user accept/reject of AI suggestions (Phase 3); retrain or tune models; suggest better mappings (e.g. "golden retriever" vs "dog").
- **Related tags / discovery:** "Tags often used together"; "similar tags"; "photos like this" using embedding or tag vectors.
- **Search relevance:** Use tag and metadata signals to rank search results; optional learning-to-rank or embedding search.

### 4.2 Considerations

- **Data:** Privacy (train on aggregate or anonymized); storage for feedback events and model artifacts.
- **Stack:** May extend Phase 3 local AI or use external ML service; balance cost vs quality.

### 4.3 Deliverables

- ML design doc (use cases, data pipeline, model strategy, privacy).
- Backend: feedback collection from Phase 3 flows; related-tags or similarity API; optional search relevance tuning.
- Frontend: "Related tags", "Similar photos" or "Refine tags" UX where applicable.

---

## 5. Mobile app development

**Goal:** Provide a native or cross-platform mobile app for browsing, uploading, and managing albums/photos.

### 5.1 Scope

- **Platforms:** iOS and Android (native or React Native / Flutter / Capacitor, etc.).
- **Features:** Login (and SSO when available); list albums; view album and photo; upload photos (and video when supported); basic edit (caption, tags); optional offline cache.
- **API:** Use existing public API (`/api/v1/`) and API keys or OAuth; respect rate limits and scopes.

### 5.2 Considerations

- **Auth:** Token-based (JWT or session); secure storage of tokens; optional biometric.
- **Upload:** Chunked or resumable upload for large files; background upload queue.
- **Offline:** Optional offline album/photo cache; sync when back online.

### 5.3 Deliverables

- Mobile app design doc (architecture, auth, API usage, offline strategy).
- App implementation (chosen stack); app store listings and release process.
- Backend: no strict requirement beyond existing API; optional push notifications endpoint later.

---

## 6. Video support

**Goal:** Store, manage, and present video assets alongside photos (metadata, thumbnails, playback, search).

### 6.1 Scope

- **Storage:** Videos as first-class assets in the same storage backends as photos (local, S3, Google Drive, etc.); optional transcoding for streaming (e.g. H.264/WebM).
- **Metadata:** Duration, codec, resolution; EXIF-like metadata where available; optional transcription/captions for search.
- **Organization:** Videos can live in albums (with or without photos); same access control (public/private, groups).
- **Playback:** In-gallery playback (HTML5 player); optional adaptive streaming or thumbnails/scenes.
- **Search & discovery:** Filter by "photo vs video"; optional full-text on title/description/captions.

### 6.2 Considerations

- **Upload & processing:** Large file handling; background jobs for transcoding/thumbnail generation; virus scan if required.
- **Quotas:** Count video storage (and duration) in storage quotas.
- **UI:** Album view and lightbox/grid that support both images and videos; upload flow for video files.

### 6.3 Deliverables

- Design doc (video model, storage layout, transcoding strategy, API).
- Backend: video entity, storage integration, metadata extraction, optional transcoding pipeline.
- Frontend: upload, album/lightbox playback, filters.
- Migration path for existing deployments (no videos → schema compatible).

---

## 7. Enterprise features (SSO, audit logs, quotas, multi-tenancy)

**Goal:** Make OpenShutter suitable for organizations: centralized login, accountability, resource limits, and multiple isolated tenants.

### 7.1 SSO (Single Sign-On)

- **Scope:** Allow users to sign in via an identity provider (IdP) instead of or in addition to local passwords.
- **Typical options:** SAML 2.0, OpenID Connect (OIDC), or both.
- **Considerations:**
  - Admin-configurable IdP (metadata URL, entity ID, certs).
  - Attribute mapping (e.g. email, name, groups from IdP → OpenShutter user/role/groupAliases).
  - Optional: "SSO only" mode vs "SSO + local login".
  - First-time SSO login: auto-provision user or require admin pre-creation.
- **Deliverables:** Design doc (auth flow, config schema, attribute mapping); backend IdP integration; admin UI for SSO config; optional frontend "Sign in with SSO" entry point.

### 7.2 Audit logs

- **Scope:** Persist a tamper-evident record of who did what, when, for security and compliance.
- **Considerations:**
  - Events: login/logout, user/role/group changes, album/photo create/update/delete, config changes, API key create/revoke, export/import, storage migration, etc.
  - Fields: timestamp, actor (user id or "system"), action, resource type/id, optional old/new value or diff, IP, user agent.
  - Retention policy (e.g. 90 days, 1 year) and storage (DB table or dedicated store).
  - Access: admin-only; optional export (CSV/JSON) for compliance.
- **Deliverables:** Audit event schema and service; instrumentation in key controllers/services; admin UI to view and filter audit log; retention/cleanup job; design doc.

### 7.3 Quotas

- **Scope:** Enforce limits per user, per group, or per tenant (e.g. max storage, max albums, max photos, max API calls).
- **Considerations:**
  - Where to define quotas: site-wide defaults, per-user overrides, per-group or per-tenant.
  - Enforcement points: upload (storage/photo count), album creation, API rate limits (already exist; may align with quota).
  - Soft vs hard limits; optional "quota warning" at 80% and blocking at 100%.
  - Admin UI: view usage vs quota, adjust quotas.
- **Deliverables:** Quota model (config + DB); checks in upload/album/create and API; admin quota/usage UI; design doc.

### 7.4 Multi-tenancy

- **Scope:** Run multiple isolated "tenants" (e.g. organizations) in one deployment; data and identity scoped by tenant.
- **Considerations:**
  - Tenant identity: subdomain (e.g. `org1.openshutter.org`), path prefix, or header.
  - Data isolation: all key entities (users, albums, photos, storage refs, API keys, etc.) scoped by `tenantId`; all queries filtered by tenant.
  - Auth: tenant resolved before login; SSO may be per-tenant.
  - Admin: super-admin vs tenant-admin; tenant creation and lifecycle.
- **Deliverables:** Multi-tenancy design doc (tenant resolution, schema changes, migration path); schema and code changes for tenant scoping; tenant management API and UI; runbook for tenant onboarding.

---

## Phase 4 Checklist

- [x] Branch `phase-4` created
- [x] Prioritize and sequence initiatives (e.g. 1 → 2 → 3)
- [x] Stage 1 (White-label solutions): design and implementation
- [x] Stage 2 (Integration marketplace): design and implementation
- [x] Stage 3 (Advanced collaboration): design and implementation (MVP: album comments)
- Stage 4 (Machine learning for tag optimization): design and implementation
- Stage 5 (Mobile app): design and implementation
- Stage 6 (Video support): design and implementation
- Stage 7 (Enterprise features): design docs and implementation
- README and SYSTEM_PRD updated with Phase 4 progress
- CHANGELOG updated for Phase 4 releases

---

## References

- [SYSTEM_PRD.md](./SYSTEM_PRD.md) – Phase 4 roadmap
- [README.md](../README.md) – Roadmap section
- [PHASE_3_WORKFLOW.md](./PHASE_3_WORKFLOW.md) – Phase 3 (complete); Stage 5 Enterprise moved here

