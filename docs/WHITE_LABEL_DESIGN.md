## White-Label Solutions Design

**Phase:** 4 – Stage 1  
**Status:** Partially implemented (Option 1 & core of Option 2)  

This document describes the design and implementation plan for Phase 4 Stage 1: **White-label solutions**.

---

## 1. Goals

- **Clean white-label installation**: One deployment that looks like a completely separate product, with **no OpenShutter branding** visible to end users.
- **Per-owner custom domains ("mini-sites")**: Each owner can have a dedicated public site at a **custom domain**, where visitors see only that owner’s content and admin is at `<owner-domain>/admin`.
- **Config-driven**: All branding and domain behaviour is controlled through site config and per-owner settings; defaults preserve existing behaviour.
- **Safe upgrades**: White-label and domain overrides should survive upgrades and be easy to reason about.

---

## 2. Clean White-Label Installation

### 2.1 Config schema

Extend the existing **site config** (backend + frontend) with a `whiteLabel` section:

- `whiteLabel.enabled: boolean` – When `true`, the install is intended to be white-labeled.
- `whiteLabel.productName: MultiLangText` – Product/site name shown in header, login, admin shell, and emails.
- `whiteLabel.logoLightUrl: string | null` – URL (storage-backed) for light logo variant.
- `whiteLabel.logoDarkUrl: string | null` – URL (storage-backed) for dark logo variant.
- `whiteLabel.faviconUrl: string | null` – Custom favicon.
- `whiteLabel.hideOpenShutterBranding: boolean` – When `true`, hide all upstream “OpenShutter” labels and links from public + admin UI and emails.
- `whiteLabel.legal: { termsUrl?: string; privacyUrl?: string; termsText?: MultiLangText; privacyText?: MultiLangText }` – Optional Terms of Service / Privacy Policy references; either URLs or inline text.

Notes:

- If `whiteLabel.enabled === false`, behaviour is unchanged from current.
- `productName` falls back to the existing site title if not set.
- Logo / favicon assets reuse the existing storage configuration (admin uploads from `/admin/site-config`).

### 2.2 Branding override points

All of the following should read from the site config `whiteLabel` block (when enabled) and **never show “OpenShutter”** if `hideOpenShutterBranding === true`:

- **Frontend (public)**:
  - Header logo + site name.
  - Footer “Powered by OpenShutter” or similar text.
  - About page / hero copy where product name appears.
- **Frontend (auth / member / owner / admin shells)**:
  - Login/register pages: logo, title, and any “Welcome to OpenShutter” strings.
  - Admin shell top-left logo and name.
  - Owner dashboard header.
- **Emails**:
  - Welcome email, password reset, and other templates: product name, footer “OpenShutter” mentions, and links should use `whiteLabel.productName` and legal URLs where provided.

Implementation guidelines:

- Centralize branding helpers (e.g. `getProductName()`, `getLogo()` on frontend; similar helpers on backend for emails) instead of inlining strings.
- Keep a **single source of truth** for “product name” and “logo URLs” in site config so templates and components don’t drift.

### 2.3 Admin UI

In **Site Config → Branding** (or a new “White-label” section):

- Toggle: **Enable white-label mode** (`whiteLabel.enabled`).
- Checkbox: **Hide OpenShutter branding** (`whiteLabel.hideOpenShutterBranding`).
- Inputs:
  - Product name (multi-language).
  - Logo upload (light/dark).
  - Favicon upload.
  - Terms of Service URL or inline text.
  - Privacy Policy URL or inline text.

UX considerations:

- When white-label is enabled and branding is hidden, show a short inline warning that this removes visible “OpenShutter” references from the UI and emails.
- Legal URLs/text are optional; if not set, current behaviour (if any) is preserved.

---

## 3. Per-Owner Custom Domains ("Mini-Sites")

### 3.1 Data model

Introduce a dedicated mapping from domains to owners:

- **Collection:** `owner_domains` (or similar name).
- **Fields:**
  - `hostname: string` – Full hostname, e.g. `photos.alice.com` (unique, normalized to lowercase).
  - `ownerId: ObjectId<User>` – Reference to a user with role `owner`.
  - `isPrimary?: boolean` – Optional; marks canonical domain when multiple exist.
  - `active: boolean` – Allows disabling a domain without deleting it.

Rationale:

- A separate mapping collection is more flexible than a single `customDomain` field on `User` and allows multiple domains per owner in the future.

### 3.2 Per-owner storage configuration (high-level)

Each owner needs its own **storage configuration**:

- Extend existing storage model to support:
  - **Global / default storage config** (current behaviour).
  - **Per-owner storage config** (scoped by `ownerId`).
- Rules:
  - When resolving storage for an operation tied to an album or photo, determine the **owner** first, then load that owner’s storage config if present, otherwise fall back to global defaults (if allowed by deployment policy).
  - Admin can configure storage per owner in admin UI (e.g. `Admin → Owners` edit screen or a dedicated “Storage” tab).
  - Owners accessing `<owner-domain>/admin` can view and manage only their own storage settings (no cross-owner visibility).

Details of the storage config schema and migration are tracked in the storage subsystem; this document focuses on white-label and routing.

### 3.3 Request routing and site context

Introduce a **site context** object resolved from the hostname:

- **Backend middleware** (NestJS):
  - On each request, inspect `Host` (and `X-Forwarded-Host` when behind a proxy).
  - Look up `hostname` in `owner_domains`.
  - If found: attach `siteContext = { type: 'owner-site', ownerId }` to the request (e.g. on `req.siteContext`).
  - If not found: `siteContext = { type: 'global' }` (current single-site behaviour).
  - **Implemented:** `SiteContextMiddleware` sets `req.siteContext` for all routes, and a `SiteContextController` exposes `GET /api/site-context` for the frontend.
- **Frontend (SvelteKit)**:
  - In root `+layout.server.ts`, determine `siteContext` by calling `GET /api/site-context` and expose it in layout data.
  - Public routes (`/`, `/albums`, album view, blog, etc.) can branch on `data.siteContext.type`:
    - When `siteContext.type === 'owner-site'`, filter all content to that owner:
      - Only albums where `createdBy === ownerId` (or equivalent owner field).
      - Only blog posts, pages, and other content associated with that owner.
    - When `siteContext.type === 'global'`, behave exactly as today.
  - **Implemented (initial):** root `+layout.server.ts` now loads `siteContext` once per request; individual routes can consume it to adjust behaviour for owner domains.

### 3.4 Content scoping rules

For `siteContext.type === 'owner-site'`:

- **Albums / photos**:
  - Listing endpoints (`GET /api/albums`, album trees, search) must include `ownerId` criteria so only that owner’s albums and photos appear.
- **Blog / pages (if enabled)**:
  - Similarly, scope all content types that can belong to an owner.
- **Search**:
  - Search results must respect `ownerId` scope and existing access control (public/private, allowedUsers, allowedGroups).

For `siteContext.type === 'global'`:

- Preserve current global behaviour and all existing access-control rules.

### 3.5 Admin at `<owner-domain>/admin`

Behaviour:

- On an **owner custom domain**:
  - `/login` and `/admin` serve the **owner-specific admin** for that owner’s content.
  - After successful login (as that owner), redirect to `<owner-domain>/admin`.
  - Guards on admin routes must ensure that:
    - Only the resolved `ownerId` (and optionally global admins) can access `/admin` on that domain.
    - Admin UI automatically filters all lists and operations to that `ownerId`.
- On the **global domain**:
  - `/admin` remains the full system admin for all content and users.
  - Global admin can manage owners, domains, and per-owner storage.

Implementation notes:

- Auth/session logic must be aware of `siteContext` so redirects and role checks behave correctly on both global and owner domains.
- When global admin is logged in and visits an owner domain, we should decide whether that is allowed and, if so, what they see (e.g. “view as owner”).

### 3.6 Owner creation and domain assignment flow

Admin flow when creating or editing an `owner` user:

1. Create owner user (existing flow).
2. Optional “Domains” section:
   - Add domain: input `hostname`.
   - Validate uniqueness and basic syntax.
   - Save as `owner_domains` record with `active: true`.
   - Show DNS/TLS instructions (e.g. CNAME/A record to the global host, plus TLS guidance).
3. Optional “Storage” section:
   - Configure per-owner storage for this owner (provider, bucket, path, etc.).

Edge cases:

- Multiple domains per owner: supported via multiple `owner_domains` entries; one can be marked `isPrimary` for canonical links.
- Disable domain: set `active: false`; requests to an inactive domain should either:
  - Return 404, or
  - Redirect to the global domain (decision to be finalized in implementation).

### 3.7 Per-owner configuration: what the owner can configure on their domain

Each owner should have a **single, self-managed theme** for their domain. They configure it in the same way the admin configures the main site (rows, columns, modules; header; menu), but only **one theme** per owner—no multiple themes or theme picker.

**Combined list — all owner-configurable items (owner_site_settings or equivalent):**

| Area | Item | What the owner configures | Stored as | Same as admin? |
|------|------|---------------------------|-----------|----------------|
| **Branding** | Site name | Multi-lang title for header, page titles | `siteName` (→ config.title) | Yes (site config title) |
| **Branding** | Description | Multi-lang short description / tagline | `description` (→ config.description) | Yes |
| **Branding** | Logo | Logo image (URL or upload to site assets) | `logo` (→ config.logo) | Yes |
| **Branding** | Favicon | Optional favicon for browser tab | `favicon` (→ config.favicon) | Yes |
| **Home** | Hero | Title, subtitle, CTA label+URL, background (light/dark/image/gallery leading), optional background image | `hero` (merged into home pageModules) | Yes (hero module props) |
| **SEO** | Meta title | Optional meta title for owner domain | e.g. `seo.metaTitle` | Yes |
| **SEO** | Meta description | Optional meta description (can default to description) | e.g. `seo.metaDescription` | Yes |
| **Contact** | Email / social | Optional contact email and social links for owner domain | e.g. `contact` | Yes |
| **Footer** | Copyright / links | Optional footer text, terms URL, privacy URL | e.g. `footer` or whiteLabel.legal | Yes |
| **Theme** | Layout & modules | Rows, columns, and which modules per page type (home: hero + albums grid; gallery: etc.). Same module types (hero, richText, albumsGrid) and props. | `template.pageLayout`, `template.pageModules` | Yes |
| **Theme** | Accent color | Optional primary/accent color for owner domain | e.g. `template.customColors` | Yes (optional, later) |
| **Header** | Header options | Show/hide logo, site title, menu; theme toggle, language selector, auth buttons | `template.headerConfig` | Yes |
| **Menu** | Menu items | Label (or labelKey), href, external, type (link/login/logout), showWhen | `template.headerConfig.menu` | Yes |

**Behaviour:**

- When the request is for an **owner domain** (`siteContext.type === 'owner-site'`), `GET /api/site-config` (or the response used for the public frontend) must merge owner-specific values over the global site config:
  - **Branding:** title, description, logo (already in place).
  - **Theme:** If the owner has `pageLayout` / `pageModules` set, use them for the owner’s domain (at least for `home`, and optionally `gallery`, etc.), so the home page and other pages use the owner’s rows, columns, and modules.
  - **Header:** If the owner has `headerConfig` set, use it so the header (logo, title, menu visibility) is the owner’s.
  - **Menu:** If the owner has `headerConfig.menu` set, use it so the main navigation is the owner’s.
- Owner UI (e.g. **Owner panel → Site settings** or **My theme**):
  - **Layout & modules:** Same concepts as admin (e.g. Admin → Templates → Overrides): choose page type (e.g. Home), set grid rows/columns, add/remove/reorder modules (hero, albums grid, etc.), edit module props. Only one “theme” per owner—no theme selector.
  - **Header:** Form with same toggles as admin (show logo, show site title, show menu, etc.).
  - **Menu:** List of menu items with label/labelKey, href, type, showWhen, external—same as admin’s Navigation tab.

**Implementation notes:**

- Reuse the same frontend components and data shapes as admin where possible (page builder grid, module list, header config form, menu editor), so the owner gets “admin-like” control over one theme only.
- Default: if the owner has not set any theme/header/menu overrides, the owner domain can fall back to the global site’s template (or a fixed default), so existing behaviour is preserved until the owner customises.

---

## 4. Security, Auth, and SEO Considerations

### 4.1 Security and auth

- All existing **role-based access control** (admin/owner/guest + groups) remains in force.
- **Per-owner group:** when a user is created/updated with role `owner`, the system ensures a dedicated group `owner-{ownerId}` exists and adds it to the owner’s `groupAliases`.
- **Albums created by owners:** when an owner creates an album, `allowedGroups` for that album is automatically ensured to include the owner’s group (`owner-{ownerId}`), so it is trivially targetable to the owner’s users.
- **Owner-only users:** guest users can be attached to an owner by assigning them the owner’s group alias; these users:
  - Can only log in on that owner’s domain (login on global or another owner domain is rejected).
  - When logged in on the owner domain, only see albums created by that owner (existing `ownerId` + group-based scoping).
- Domain-based scoping is **additional**:
  - On owner domains, the owner cannot see or manage other owners’ content even if they guess IDs.
  - APIs must always combine `ownerId` scoping (for owner domains) with the existing access rules.
- Admin-only features (e.g. user and system config management) remain restricted to admins and only exposed on appropriate hosts.

### 4.2 SEO and canonical URLs

- When rendering public pages on an owner domain:
  - Use the owner domain as the **canonical URL** for SEO.
  - Avoid leaking global-domain URLs in sitemaps or `<link rel="canonical">` when in owner context.
- When multiple domains exist for one owner (`isPrimary` flag), canonical URLs should prefer the primary domain.

**Status (implemented):** Root **`+layout.svelte`** sets **`<link rel="canonical">`** and **`og:url`** from the current request URL (`origin` + pathname + search, no hash), so visitors on a custom owner host get canonicals on that host. **`/admin`** and **`/owner`** receive **`noindex, nofollow`**. **Not yet implemented:** sitemap generation per host; forcing canonical to **`isPrimary`** when the same content is reachable from multiple owner hostnames.

---

## 5. Implementation Plan

### 5.1 Backend

1. **Site config extensions**
   - Add `whiteLabel` block to site-config schema and persistence.
   - Expose `whiteLabel` fields via existing site-config APIs.
   - **Status:** Implemented for `hideOpenShutterBranding`, `termsOfServiceUrl`, `privacyPolicyUrl`, and optional **`whiteLabel.productName`** (`MultiLangText`) for display name in UI/emails when it should differ from public **site title**. Per-install **logo/favicon** still use top-level `logo` / `favicon` (no separate white-label asset fields).
2. **Branding helpers**
   - Add helpers for product name and logos for use by controllers that send templated emails.
   - **Status:** Implemented `getProductName` helper on the frontend and wired it into the footer and emails (via `{{siteTitle}}`).
3. **Owner domain model and middleware**
   - Create `owner_domains` model/schema.
   - Add NestJS middleware or guard that:
     - Resolves `siteContext` from `Host`/`X-Forwarded-Host`.
     - Attaches `siteContext` to the request object.
   - **Status:** Implemented `owner_domains` collection, `OwnerDomainsController`, and `SiteContextMiddleware`.
4. **Per-owner scoping**
   - Update album, photo, page, blog, and search controllers to:
     - Respect `siteContext` when present.
     - Pass the appropriate `ownerId` or access context into services.
   - **Status:** Implemented for albums, search, **public pages** (`GET /api/pages/:slug`, `GET /api/v1/pages`, scoped by `createdBy` on owner domains), and **public blog** (`GET /api/blog`, `GET /api/blog/:slug`, `GET /api/v1/blog`, scoped by `authorId` on owner domains). Frontend proxies: `/api/blog`, `/api/blog/[slug]` (forwards `Host` like `/api/pages/...`).
5. **Admin APIs for owner domains and storage**
   - CRUD endpoints to manage `owner_domains` (admin-only).
   - Extend existing owner/user admin APIs to show associated domains and storage config.
   - **Status:** Implemented admin CRUD for owner domains and Owner Domains section in the Users admin page. **Storage:** global `storage_configs` + per-owner **`storageConfig`** on **`/owner/storage`**; **dedicated** path via **`useDedicatedStorage`** and **`owner_storage_configs`** (see `docs/PHASE_4_WORKFLOW.md` §1.2.6). Optional UX gap: configure dedicated storage in the same flow as **creating** an owner.

### 5.2 Frontend

1. **Site context resolution**
   - In `+layout.server.ts`, retrieve `siteContext` (via API or shared host logic) and place it in `locals`.
   - Provide a small helper/store so components can read `siteContext`.
2. **Branding and white-label UI**
   - Centralize product name + logo rendering in layout components using `whiteLabel` config.
   - Ensure login, register, admin shell, and emails reflect the config.
3. **Admin config UI**
   - Add or extend Site Config sections for:
     - White-label toggles and branding fields.
     - Legal URLs/text.
   - Add Owner edit UI for managing:
     - Custom domains list for each owner.
     - (High-level) pointer to per-owner storage config UI.
4. **Owner-site behaviour**
   - On owner domains, ensure navigation and lists only show that owner’s content.
   - Update admin navigation on owner domains to reflect the scoped nature of the admin.
5. **SEO (canonical)**
   - **Status:** Root **`routes/+layout.svelte`**: canonical + **`og:url`** from request URL; **`noindex`** for **`/admin`** and **`/owner`**. See §4.2 for gaps (sitemap, **`isPrimary`** canonical).

### 5.3 Migration and rollout

- **Default behaviour**:
  - On upgrade, `whiteLabel.enabled` is `false`, `hideOpenShutterBranding` is `false`, and no owner domains exist, so behaviour matches current deployments.
- **Enabling white-label (Solution 1)**:
  - In **Admin → Site Config → Branding**, set the public **Site Title**, upload logo and favicon, and (optionally) set **Terms of Service** and **Privacy Policy** URLs.
  - In the same section, enable **Hide OpenShutter branding** to remove the OpenShutter name from public UI, emails, and footers; the configured Site Title becomes the visible product name.
- **Enabling owner mini-sites (Solution 2)**:
  - In **Admin → Users**, create or edit a user with role **Owner**, then open the **Owner Domains** section and add the custom hostname (e.g. `photos.alice.com` or `sara.localhost:4000` for dev). Ensure DNS (CNAME/A) points to your frontend and TLS is configured.
  - The backend `SiteContextMiddleware` will resolve that host to the owner; all public album/search APIs automatically scope results to that owner. Visitors on that domain see only that owner’s content.
  - The owner (and global admins) can reach their scoped admin panel at `https://<owner-domain>/admin`. Their storage configuration is managed via `/owner/storage`, while `/admin/storage` remains the global/main-site storage configuration.

---

## 6. Open Questions / Future Enhancements

- Should global admins be able to “impersonate” an owner domain from the global admin UI (for debugging)?
- How strict should we be with redirect behaviour when a disabled/unknown domain is accessed?
- How much of the per-owner storage configuration should be editable by owners vs. only by global admins?

These can be refined during implementation without changing the core structure described above.

# White-Label Design Document (Phase 4 – Solution 1)

**Stage:** 4.1 Design  
**Status:** Design Complete  
**Date:** 2026-02-23

## Overview

This document defines the design for **Solution 1: Clean white-label installation** — one deployment that appears as a completely separate product with no OpenShutter branding visible to end users.

---

## Goals

1. **Branding (global):** Site name, logo, favicon, and colors used consistently (header, login, emails).
2. **Removal of upstream branding:** A config flag hides "OpenShutter" everywhere and replaces it with the configured product name.
3. **Legal/terms:** Configurable terms of service and privacy policy URLs in site config.

---

## Config Schema

### New fields on `SiteConfig`

| Field | Type | Description |
|-------|------|-------------|
| `whiteLabel.hideOpenShutterBranding` | `boolean` | When `true`, all user-facing text uses the product display name (`productName` if set, else site `title`); "OpenShutter" is never shown. Default: `false`. |
| `whiteLabel.productName` | `MultiLangText` (optional) | Override for headers, footers, emails, and `{{siteTitle}}` when you want a different string than public **site title**. |
| `whiteLabel.termsOfServiceUrl` | `string` (optional) | URL to terms of service. Shown in footer and/or login/register when set. |
| `whiteLabel.privacyPolicyUrl` | `string` (optional) | URL to privacy policy. Shown in footer and/or login/register when set. |

Existing fields already used for branding:

- `title` (MultiLangText) — product name (header, emails, fallback when branding hidden).
- `logo`, `favicon` — already in site config.
- `template.customColors`, `theme` — Theme Builder / site config.

---

## Override Points

| Location | Behavior |
|----------|----------|
| **Header** | Site title from `config.title`; when `hideOpenShutterBranding`, fallback is product name (no "OpenShutter"). |
| **Footer** | Copyright line: "© {year} {productName}". Product name = `getProductName(config, lang)` (title or "OpenShutter" / "Site" per flag). |
| **Login / Register** | Page title and any footer text use product name when branding hidden. |
| **Email templates** | Already support `{{siteTitle}}`; ensure value is from `config.title` when white-label. |
| **Admin shell** | Logo and name from site config (no change; admin may still need to know it’s OpenShutter internally). |
| **Page titles** | All `<title>… - OpenShutter</title>` use product name when branding hidden. |
| **Default footer module** | RichText body may use placeholder `{{productName}}` for copyright line. |

### Product name helper

- **`getProductName(config, lang): string`**
  - If `config.whiteLabel?.productName` has text for `lang`: return it.
  - Else if `config.title` is set: return `MultiLangUtils.getTextValue(config.title, lang)`.
  - Else if `config.whiteLabel?.hideOpenShutterBranding`: return `'Site'`.
  - Else: return `'OpenShutter'`.

---

## Legal / Terms

- **Terms of service:** Optional URL in `whiteLabel.termsOfServiceUrl`. Link can appear in footer and on login/register.
- **Privacy policy:** Optional URL in `whiteLabel.privacyPolicyUrl`. Link can appear in footer and on login/register.
- No inline legal text in config for Phase 4; only URLs. Inline text can be added later if needed.

---

## Admin UI

- **Branding tab** (existing) extended with:
  - **White-label**
    - Optional **Product display name** (`productName`, per language).
    - Checkbox: "Hide OpenShutter branding" (`hideOpenShutterBranding`). When checked, public and email-facing text never shows "OpenShutter"; the display name is `productName` or site title.
    - Optional text inputs: "Terms of service URL", "Privacy policy URL".
- No change to domain or TLS in this solution; one canonical base URL per install (existing `FRONTEND_URL` / `EMAIL_BASE_URL`).

---

## Deliverables

- [x] Design doc (this document).
- [x] Backend: `whiteLabel` on `SiteConfig`, defaults/merge, GET/PATCH via existing site-config APIs.
- [x] Frontend: `whiteLabel` types; `getProductName()` (title / `productName` / fallbacks); wired in header, footer, titles per earlier implementation.
- [x] Admin UI: white-label section in Site config (Branding tab), including optional **product display name**.
- [x] Email: `{{siteTitle}}` uses `productDisplayNameFromSiteConfig` (optional `productName`, then title).
- [x] Runbook: **`docs/WHITE_LABEL_DEPLOY.md`** (canonical URLs, env, owner domains, TLS pointers).

---

## Testing owner domains on localhost

To test per-owner domains locally with a subdomain (e.g. **sara.localhost:4000**):

1. **DNS**  
   Most systems resolve `*.localhost` to `127.0.0.1`. If `sara.localhost` does not resolve, add `127.0.0.1 sara.localhost` to your hosts file.

2. **Backend**  
   - CORS allows `*.localhost` in development, so `http://sara.localhost:4000` is accepted.  
   - Site-context middleware uses `Host` or `X-Forwarded-Host` to look up `owner_domains`. The dev proxy forwards the browser’s Host as `X-Forwarded-Host`, so the backend sees `sara.localhost:4000`.

3. **Data**  
   - In **Admin → Users**, ensure you have a user with role **Editor** (owner).  
   - **Edit** that user and in **Owner Domains** add a domain with hostname exactly as the backend will see it: **`sara.localhost:4000`** (include the port for local dev).  
   - Save; the `owner_domains` document will link this hostname to that user’s `ownerId`.

4. **Run and test**  
   - Start backend (e.g. port 5000) and frontend (e.g. port 4000).  
   - Open **http://sara.localhost:4000** in the browser.  
   - API calls from that origin are proxied to the backend with `X-Forwarded-Host: sara.localhost:4000`; the backend sets `siteContext.type = 'owner-site'` and scopes albums (and related data) to that owner.  
   - Confirm that only that owner’s albums/content are shown.

**Note:** In production you would typically use hostnames without a port (e.g. `sara.example.com`). For local testing, use the full host as sent by the browser (e.g. `sara.localhost:4000`) when adding the domain in the admin.

---

## References

- [PHASE_4_WORKFLOW.md](./PHASE_4_WORKFLOW.md) — White-label solutions (Section 1)
- [SERVER_DEPLOYMENT.md](./SERVER_DEPLOYMENT.md) — Deployment and env vars
