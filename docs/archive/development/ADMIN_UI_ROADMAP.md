# Admin UI roadmap — static shell, visitor templates unchanged

This document is the **source of truth** for how the **admin panel** should relate to **visitor-facing templates** and what to build next.

**UI toolkit (decided):** **Skeleton** `@skeletonlabs/skeleton` + `@skeletonlabs/skeleton-svelte` (**v4.14.x**), theme **Cerberus**, scoped via `frontend/src/lib/styles/admin-skeleton.css` (imported from `frontend/src/routes/admin/+layout.svelte`) so visitor CSS is not merged with Skeleton’s `@theme`. **DaisyUI** was a strong alternative for class-first speed; **Skeleton** wins here for Svelte 5 components, Zag-based primitives (dialogs, lists), and one coherent system for modals / drawers / forms in later phases.

**What is in use today:** **`AdminAppChrome`** (`frontend/src/lib/components/AdminAppChrome.svelte`) sets **`data-theme="cerberus"`** and scopes Skeleton **CSS** via `admin-skeleton.css`. Shared class fragments live in **`frontend/src/lib/admin/admin-cerberus.ts`** (e.g. `adminInputSmClass`, `adminSelectSmClass`, `adminBtnSm*`, badges, primary button presets). **`@skeletonlabs/skeleton-svelte` components** are used where it pays off: **toasts** (`AdminToastRegion`, `adminToast` / `createToaster`), **confirm dialogs** (`AdminConfirmDialog`), and selected screens (e.g. **Site configuration**: `Tabs`, `Switch`). **Phase 6 Waves 1–5** (inventory below) target **`adminToast`** + **`admin-cerberus`** on those routes; **stragglers** and embeds (e.g. **`OwnerStorageView`**) are tracked in [`ADMIN_TOAST_CONFIRM_AUDIT.md`](../../../frontend/src/lib/admin/ADMIN_TOAST_CONFIRM_AUDIT.md).

## Vision (clarified)

| Area | Policy |
|------|--------|
| **Visitor site (frontend templates)** | **Unchanged in intent.** Template packs, themes, page builder modules, `frontendTemplate` / `activeThemeId`, and public `ThemeColorApplier` behavior stay the product surface for customization. |
| **Admin panel** | **Single static template.** No operator choice of “admin template,” no admin skin tied to the site theme system, no goal of matching customer galleries visually. |
| **Goal** | **Simple, consistent operator UX** across all current and future admin features, with explicit support for **modals, drawers, toasts, form validation states, drag-and-drop**, and similar patterns. |

**Non-goals:** Per-site admin branding, admin themes in site config, or reusing template-pack `Header`/`Footer` chrome for `/admin`.

## Resolved coupling (historical)

Previously, admin shared visitor chrome and `activeTemplate` could follow `adminTemplate` and localStorage preview. **Phase 1–2** remove that: admin uses `AdminAppChrome` + Skeleton; `activeTemplate` is a fixed `'default'` on `/admin` routes; preview is session-local on Manage templates only. **Phase 3** normalizes **`template.adminTemplate`** to **`default`** on every site-config read/write and stops validating client values.

## Phased delivery

### Phase 1 — Admin layout shell (structural)

**Implemented (incremental):** `frontend/src/routes/+layout.svelte` branches on `/admin`; **`AdminAppChrome.svelte`** wraps admin content. A future route-group `(admin)` refactor is optional cleanup.

- Introduce an **admin-only root branch** (recommended: SvelteKit route group `(admin)` under `frontend/src/routes`, or a conditional branch in `routes/+layout.svelte` as an incremental first step — **done via conditional root layout**).
- For `/admin/**`, **do not render** visitor-only wrappers: **`BodyTemplateWrapper`** and **`ThemeColorApplier`** (site palette). (Legacy pack header/footer switchers were removed; public chrome uses **`layoutShell`**.)
- Provide a small **fixed admin chrome**: **single-row top bar** (title truncates on narrow viewports; nav stays on one line), **light/dark toggle** for the admin shell only (`admin-ui-theme` store + `color-scheme` on `body`), optional **UI language** `<select>` when **more than one** language is enabled in **site config** (`languages.activeLanguages`); uses the same **`currentLanguage`** / **`setLanguage`** store as the public site. Toasts mount under **`AdminAppChrome`**.
- **Acceptance:** Loading `/admin` never shows public header/footer pack or module-driven header; background and typography do not follow applied **gallery** theme.

### Phase 2 — Remove admin template selection and preview

**Implemented:** Admin template dropdown/save removed from **Manage templates**; site-config **Theme & layout** shows a fixed-admin explanation; `adminPreviewTemplate` / localStorage and `clearAdminPreviewTemplate` on navigation **removed**; `activeTemplate` is **`'default'`** for `/admin`; theme **Preview** is in-page state only (`frontend/src/routes/admin/templates/+page.svelte`). Removed **`admin/templates/+layout.svelte`** (preview-clear on leave).

### Phase 3 — Site config and theme apply behavior

**Implemented:**

- **Backend** (`backend/src/services/site-config.ts`): No validation of client `template.adminTemplate`. Before save, **`mergedConfig.template.adminTemplate`** is always set to **`'default'`**. **GET** config merges in the same sentinel for API responses. Theme-replace (`replaceTemplateFromTheme`) no longer copies `adminTemplate` from the theme payload.
- **Backend** (`backend/src/services/template-config.ts`): For `area === 'admin'`, template metadata resolves to pack **`'default'`** only (DB `adminTemplate` ignored).
- **Frontend:** Theme apply PUT payload omits `adminTemplate` (server normalizes).
- **Types:** `adminTemplate` documented as **@deprecated** in backend and frontend `site-config` types.

Legacy Mongo documents may still store an old `adminTemplate`; the next **PUT** or served **GET** will surface `default` only.

### Phase 4 — UI toolkit choice and installation

**Decision: Skeleton** (see top of doc). **Implemented:** packages in `frontend/package.json`; **`admin-skeleton.css`** imports Skeleton + **Cerberus** styles; **`AdminAppChrome`** sets `data-theme="cerberus"` and uses `--body-background-color`, `--color-surface-*`, heading tokens, etc.

**Components in admin (non-exhaustive):** `Toast` + `createToaster` (`frontend/src/lib/components/admin/AdminToastRegion.svelte`, `frontend/src/lib/admin/toaster.ts`, `adminToast` helpers); `Dialog` + `Portal` (`AdminConfirmDialog.svelte`); `Tabs` / `Switch` on **`/admin/site-config`** and elsewhere as migrated. Prefer **`btn`** + Skeleton **presets** and shared **`admin-cerberus`** strings over one-off gray/blue Tailwind on new work.

**Next deliverables:** finish **straggler** screens in [`ADMIN_TOAST_CONFIRM_AUDIT.md`](../../../frontend/src/lib/admin/ADMIN_TOAST_CONFIRM_AUDIT.md); avoid adding DaisyUI or a second design system.

### Phase 5 — Cross-cutting interaction patterns

**Status:** **Platform checklist complete** (Master checklist **§A** below — docs, audits, ESLint/PR hooks, `AdminSortableList`, `form-errors`). The **pattern table** tracks **ongoing adoption** on individual screens (overlaps Phase 6 and the toast/confirm **audit**); not every row needs to read “complete” for the platform work to be done.

Standardize implementations so every admin screen uses the same APIs:

| Pattern | Status | Location / notes |
|---------|--------|------------------|
| **Modals / dialogs** | **Partial** | **`AdminConfirmDialog.svelte`** — Skeleton `Dialog` + `Portal`. Used on several flows (albums, users, site-config, marketplace, …). **Remaining:** audit any destructive actions still using browser **`confirm`**; add a **generic modal shell** only if non-confirm dialogs repeat often. |
| **Drawers / side panels** | **Partial** | **Documented** in [`ADMIN_INTERACTION_PATTERNS.md`](../../../frontend/src/lib/admin/ADMIN_INTERACTION_PATTERNS.md): `Dialog` edge layout vs **`FloatingPanel`** + `Portal` ([Skeleton Floating Panel](https://www.skeleton.dev/docs/svelte/framework-components/floating-panel)). **Remaining:** first production screen using the chosen pattern. |
| **Toasts / notifications** | **Mostly adopted** | **`adminToast`**, **`AdminToastRegion`** in **`AdminAppChrome`**. **Waves 1–5** routes in the inventory table use toasts per [`ADMIN_TOAST_CONFIRM_AUDIT.md`](../../../frontend/src/lib/admin/ADMIN_TOAST_CONFIRM_AUDIT.md). **Remaining:** clear **partial** audit rows and optional **`OwnerStorageView`** surfaces. |
| **Form validation** | **Partial** | **Doc + helpers:** [`ADMIN_INTERACTION_PATTERNS.md`](../../../frontend/src/lib/admin/ADMIN_INTERACTION_PATTERNS.md) (submit state, server errors), [`form-errors.ts`](../../../frontend/src/lib/admin/form-errors.ts) (`submitErrorMessage`, `fieldHintFromApiError`). **Remaining:** adopt on straggler pages; heavy forms already lean on the doc in migrated waves. |
| **Drag and drop** | **Partial** | **`AdminSortableList.svelte`** — flat list wrapper over `svelte-dnd-action` + Cerberus row chrome (`$lib/components/admin/AdminSortableList.svelte`). **Existing:** `AlbumTree` for nested album DnD. **Remaining:** adopt `AdminSortableList` on a suitable flat list (or keep bespoke zones where layout is non-list). |

**Cerberus class helpers:** `frontend/src/lib/admin/admin-cerberus.ts` — `adminText*`, `adminBtnPrimary` / `adminBtnPrimarySm` / `adminBtnSmPrimary` / `adminBtnSmSecondary` / `adminBtnSmDanger`, `adminBadgePrimary` / `adminBadgeCaution`, `adminInputSmClass`, `adminSelectSmClass`, borders, focus ring. Prefer these over ad hoc Tailwind on **new** admin work.

---

### Phase 6 — Incremental page migration

**Status:** **Waves 1–5 complete** for listed routes (presentational migration); **stragglers** remain on some screens (see [`ADMIN_TOAST_CONFIRM_AUDIT.md`](../../../frontend/src/lib/admin/ADMIN_TOAST_CONFIRM_AUDIT.md)). Optional: **`OwnerStorageView`** internals; dashboard load toasts.

- **No big-bang rewrite.** Migrate in **waves** (below); prioritize high-traffic and visually inconsistent screens.
- **Regressions:** Preserve all **routes, API calls, roles, and guards**; **owner**-accessible routes (`ownerCanAccess`) stay permission-identical.
- **QA:** After each wave (or before release), smoke-test **admin** and **owner-as-admin** paths touched by layout/nav changes.

#### Inventory — admin `+page.svelte` routes (33)

Paths are under `frontend/src/routes/admin/`:

| Wave | Routes (priority) |
|------|-------------------|
| **1 — Core ops** | `+page.svelte` (dashboard), `albums/+page.svelte`, `albums/[id]/+page.svelte`, `albums/[id]/edit/+page.svelte`, `photos/upload/+page.svelte`, `photos/[id]/edit/+page.svelte`, `users/+page.svelte`, `site-config/+page.svelte`, `storage/+page.svelte` |
| **2 — Heavy / config** | `import-sync/+page.svelte`, `backup-restore/+page.svelte`, `translations/+page.svelte`, `marketplace/+page.svelte`, `analytics/+page.svelte`, `locations/+page.svelte` |
| **3 — Content & taxonomy** | `pages/+page.svelte`, `blog-articles/+page.svelte`, `blog-articles/new/+page.svelte`, `blog-articles/[id]/edit/+page.svelte`, `blog-categories/+page.svelte`, `blog-categories/new/+page.svelte`, `blog-categories/[id]/edit/+page.svelte`, `blogs/+page.svelte`, `tags/+page.svelte`, `people/+page.svelte`, `groups/+page.svelte` |
| **4 — Themes & templates** | `templates/+page.svelte`, `templates/customize/+page.svelte`, `templates/overrides/+page.svelte`, `theme-layout/+page.svelte` |
| **5 — Supporting** | `audit-logs/+page.svelte`, `contact-submissions/+page.svelte`, `docs/ui/+page.svelte`, `storage/google-drive-setup/+page.svelte` |

*(New admin routes should be added to this table when created.)*

#### Definition of done — single admin page (Phase 6)

For each migrated page:

- [x] Buttons/inputs use **`admin-cerberus`** (or Skeleton **`btn`** presets scoped to Cerberus), not one-off primary colors unless justified.
- [x] User-visible success/error uses **`adminToast`** where it is **transient feedback**; keep **`AdminConfirmDialog`** for destructive confirmation.
- [x] Submit actions show **loading state** (disable buttons / spinner) during async work.
- [x] No accidental change to **fetch URLs**, **methods**, or **role checks**.

*(Waves 1–5 target routes in the inventory table; partial screens and follow-ups are tracked in [`ADMIN_TOAST_CONFIRM_AUDIT.md`](../../../frontend/src/lib/admin/ADMIN_TOAST_CONFIRM_AUDIT.md).)*

---

### Master checklist — completing Phase 5 & 6

**Phase 5 §A (platform)** and **Phase 6 Waves 1–5** are **checked off** below. Ongoing work: **stragglers** in the Phase 5 pattern table and [`ADMIN_TOAST_CONFIRM_AUDIT.md`](../../../frontend/src/lib/admin/ADMIN_TOAST_CONFIRM_AUDIT.md), **§C owner** smoke pass, and the **Backlog** table for owners + `/admin` dashboard.

#### A. Finish Phase 5 (platform)

- [x] **Form validation doc** — [`frontend/src/lib/admin/ADMIN_INTERACTION_PATTERNS.md`](../../../frontend/src/lib/admin/ADMIN_INTERACTION_PATTERNS.md) + [`form-errors.ts`](../../../frontend/src/lib/admin/form-errors.ts).
- [x] **Drawer pattern** — Documented in the same interaction doc (Skeleton `Dialog` side sheet + `FloatingPanel` option); live screen migration remains optional.
- [x] **`SortableList` abstraction** — [`AdminSortableList.svelte`](../../../frontend/src/lib/components/admin/AdminSortableList.svelte); **adopt** on a concrete admin screen = Phase 6 follow-up (albums use `AlbumTree`).
- [x] **Toast audit** — [`ADMIN_TOAST_CONFIRM_AUDIT.md`](../../../frontend/src/lib/admin/ADMIN_TOAST_CONFIRM_AUDIT.md) (static snapshot + `rg` hint).
- [x] **Confirm audit** — Same audit table (`AdminConfirmDialog` column).
- [x] **Optional:** ESLint rule or PR checklist — `confirm`/`alert` **warnings** in `src/routes/admin/**` and `src/lib/components/admin/**` (`frontend/eslint.config.js`); reviewer checklist [`.github/ADMIN_UI_PR_CHECKLIST.md`](../../../.github/ADMIN_UI_PR_CHECKLIST.md); PR template link.

#### B. Execute Phase 6 (waves)

- [x] **Wave 1** — Core admin routes in Wave 1 table: dashboard, albums list/detail/edit, photos upload/edit, users, site-config, storage shells; **`adminToast`** + **`admin-cerberus`** on those surfaces (see audit). *Follow-up (optional):* **`OwnerStorageView`** internals; dashboard load toasts.
- [x] **Wave 2** — Import/backup/translations/marketplace/analytics/locations.
- [x] **Wave 3** — Blog suite, pages, tags, people, groups.
- [x] **Wave 4** — Templates + theme-layout.
- [x] **Wave 5** — Audit logs, contact submissions, docs UI, Google Drive setup.

#### C. Verification

- [x] **Smoke script / checklist** — [`docs/guides/ADMIN_SMOKE_CHECKLIST.md`](../../guides/ADMIN_SMOKE_CHECKLIST.md) (linked from [`ADMIN_SETUP.md`](../../guides/ADMIN_SETUP.md)); run after waves or admin chrome changes.
- [ ] **Owner subset** — Human pass using checklist **§5** (`ownerCanAccess` routes; no cross-owner data). **`/admin` dashboard** for owners remains in the **Backlog** table below until product/backend tasks close.

### Backlog — Owners and the admin dashboard (`/admin`)

**Context:** Gallery **owners** today can use only a subset of `/admin/**` routes (`ownerCanAccess` in `frontend/src/routes/admin/+layout.server.ts`). **`/admin` itself is not allowed**, so owners never land on the new **dashboard** (`frontend/src/routes/admin/+page.svelte`). The dashboard summary API (`GET /api/admin/dashboard`, backend `AdminDashboardController`) is **`AdminGuard`** only and returns **site-wide** aggregates (all albums/photos), which would be wrong for an owner without scoping.

| # | Task | Notes |
|---|------|--------|
| 1 | **Product decision: owner entry point** | Either allow **`/admin`** for owners (dashboard as home) or keep **`/owner`** (or equivalent) as the only home and link “insights” there—align with multi-owner / white-label expectations. |
| 2 | **`ownerCanAccess` + redirects** | If owners should see the dashboard: include pathname **`/admin`** (and optionally **`/admin/`**) in `ownerCanAccess`, and re-check any redirects (e.g. storage / `useAdminConfig`) so owners are not bounced unexpectedly. |
| 3 | **Backend: scoped dashboard summary** | For **`role === owner`**, return counts and “recent albums” filtered by **`createdBy`** (and photos constrained to those albums—or the same ownership rules as `AlbumsAdminController`). Reuse patterns from existing **AdminOrOwnerGuard** endpoints. |
| 4 | **Guards and proxy** | Expose summary under **`AdminOrOwnerGuard`** (or a dedicated guard) instead of **`AdminGuard`** only; mirror auth in **`frontend/src/routes/api/admin/dashboard/+server.ts`** and **`admin/+page.server.ts`** so owners can SSR-load data when allowed. |
| 5 | **Alerts and storage for owners** | **Featured / public / storage** alerts and totals: define whether they are **owner-scoped** or hidden until an owner has a dedicated quota story (optional **`STORAGE_QUOTA_BYTES`** per owner is not in scope unless product asks). |
| 6 | **QA** | With owner login on a owner-site context, smoke-test dashboard, sidebar links, and that no cross-owner data appears in stats or recent lists. |

## Relationship to other docs

- **[`ROADMAP_COMMUNITY.md`](./ROADMAP_COMMUNITY.md)** — Community “admin template switcher” items are **obsolete**; visitor templating and packs remain in scope there.
- **[`TEMPLATING.md` — Part III](./TEMPLATING.md#part-iii-implementation-checklist-and-backlog)** — Checklist items about **public** templates and theme apply stay valid; **admin template switching** is out of scope (see Technical Backlog note there).
- **[`TEMPLATING.md` §8 appendix](./TEMPLATING.md#8-appendix-create-a-template-pack-built-in)** — Packs apply to the **visitor** site; admin panel does not register packs.

## Open decisions (fill in as you implement)

- [x] Toolkit choice: **Skeleton v4.14.x**, Cerberus (2026-04).
- [x] Phase 1 layout: conditional root `+layout.svelte` (route group optional later).
- [x] **`adminTemplate`:** kept in schema and responses as **`default`** only; removing the field from JSON is deferred to a major API version if desired.

---

*Last updated: 2026-05 — **Phase 5 §A** (platform) and **Phase 6 Waves 1–5** complete per inventory; **Phase 5 pattern table** tracks stragglers; **§C smoke** doc at [`docs/guides/ADMIN_SMOKE_CHECKLIST.md`](../../guides/ADMIN_SMOKE_CHECKLIST.md); **owner dashboard backlog** unchanged.*
