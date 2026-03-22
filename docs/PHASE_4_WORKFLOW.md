# Phase 4 Workflow

**Branch:** `phase-4`  
**Horizon:** Next 18 months  
**Status:** Stage 1 – White-label solutions (in progress)

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
- Per-owner storage is still handled via user `storageConfig` and `/owner/storage`; a dedicated per-owner storage model (independent of user profile) remains future work.

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

- **Per-owner storage (design):** Each owner (and thus each owner domain) has its **own storage configuration**. This includes: which storage providers are enabled (local, S3, Google Drive, etc.), default provider for new uploads, and provider-specific settings (bucket, path, credentials). Photos and assets for that owner are stored and served only from that owner's configured storage.
- **Current implementation:** Owners configure their effective storage via the existing `storageConfig` on their user profile and `/owner/storage`; global admin configures main storage via `/admin/storage`. A separate per-owner storage config model (independent of user profile) and strict “no shared default” enforcement are still to be implemented.
- **Admin UI (future):** Global admin sets or edits per-owner storage when creating/editing the owner (or in a dedicated storage section per owner). When the owner uses `<domain>/admin`, they see and manage only their own storage settings (e.g. which provider is default, reconnect OAuth); they cannot see or change other owners' storage.

#### 1.2.7 Edge cases and notes

- **Multiple domains per owner:** Supported if using a mapping table; one can be marked primary for canonical URLs.
- **SEO:** Canonical URLs should use the owner's domain when in owner context.
- **SSO (Phase 4 Enterprise):** When adding SSO, auth can be tied to `siteContext` so org-specific IdP can be used per domain/tenant later.

**Deliverables:** Design doc (domain mapping, host resolution, security, **per-owner storage config**); backend: `OwnerDomain` (or equivalent) + host-resolution middleware + **per-owner storage config model and resolution**; frontend: `siteContext` in layout, owner-scoped public routes and `/admin`; admin UI to assign/remove owner domains and **configure storage per owner** at owner creation/edit; DNS/TLS runbook for owner domains.

---

### 1.x Cross-cutting considerations

- **Licensing:** Clarify license (e.g. AGPL) and whether white-label is a commercial offering or configuration-only.
- **Updates:** Theme and config overrides survive upgrades; document override points.
- **Summary:** Solution 1 = one brand per install, no OpenShutter visible. Solution 2 = per-owner domain and content isolation with admin at `<domain>/admin`; optional at owner creation.

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
- Stage 1 (White-label solutions): design and implementation
- Stage 2 (Integration marketplace): design and implementation
- Stage 3 (Advanced collaboration): design and implementation
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

