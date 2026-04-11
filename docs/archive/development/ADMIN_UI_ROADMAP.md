# Admin UI roadmap — static shell, visitor templates unchanged

This document is the **source of truth** for how the **admin panel** should relate to **visitor-facing templates** and what to build next.

**UI toolkit (decided):** **Skeleton** `@skeletonlabs/skeleton` + `@skeletonlabs/skeleton-svelte` (**v4.14.x**), theme **Cerberus**, scoped via `frontend/src/lib/styles/admin-skeleton.css` (imported from `frontend/src/routes/admin/+layout.svelte`) so visitor CSS is not merged with Skeleton’s `@theme`. **DaisyUI** was a strong alternative for class-first speed; **Skeleton** wins here for Svelte 5 components, Zag-based primitives (dialogs, lists), and one coherent system for modals / drawers / forms in later phases.

**What is in use today:** **`AdminAppChrome`** (`frontend/src/lib/components/AdminAppChrome.svelte`) sets **`data-theme="cerberus"`** and scopes Skeleton **CSS** via `admin-skeleton.css`. Shared class fragments live in **`frontend/src/lib/admin/admin-cerberus.ts`** (e.g. `adminInputSmClass`, `adminSelectSmClass`, primary button presets). **`@skeletonlabs/skeleton-svelte` components** are used where it pays off: **toasts** (`AdminToastRegion`, `adminToast` / `createToaster`), **confirm dialogs** (`AdminConfirmDialog`), and selected screens (e.g. **Site configuration**: `Tabs`, `Switch`). Most admin pages still use **plain markup + utilities** wired to Cerberus tokens; migration is incremental (**Phase 6**).

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

**Next deliverables:** keep migrating heavy forms and lists to the same primitives; avoid adding DaisyUI or a second design system.

### Phase 5 — Cross-cutting interaction patterns

Standardize implementations so every admin screen uses the same APIs:

| Pattern | Status / location |
|---------|-------------------|
| **Modals / dialogs** | **`AdminConfirmDialog.svelte`** — Skeleton `Dialog` + `Portal`; use for destructive flows (e.g. album delete). Extend for other modals as needed. |
| **Drawers / side panels** | Same stack as modals where possible; consistent widths and breakpoints. |
| **Toasts / notifications** | **`adminToast`**, **`AdminToastRegion`** (mounted in **`AdminAppChrome`**); replace ad-hoc page `message` strings incrementally. |
| **Form validation** | Shared pattern: field errors, `submit` disabled/loading, server error mapping (align with existing fetch/error helpers). |
| **Drag and drop** | Keep **`svelte-dnd-action`** (already in `frontend/package.json`) or wrap it in one admin **`SortableList`** abstraction for grids and reorder lists. |

**Cerberus class helpers:** `frontend/src/lib/admin/admin-cerberus.ts` — `adminText*`, `adminBtnPrimary` / `adminBtnPrimarySm`, `adminInputSmClass`, `adminSelectSmClass`, borders, focus ring.

### Phase 6 — Incremental page migration

- **No big-bang rewrite.** Migrate high-traffic or visually inconsistent admin pages first (e.g. dashboard, lists, template overrides).
- **Regressions:** Preserve all existing **routes, API calls, and permissions**; changes are presentational and structural only unless a bug is fixed.
- **QA:** Smoke-test every admin area after Phase 1–3 (layout shell + config) because routing/layout touches everything.

## Relationship to other docs

- **[`ROADMAP_COMMUNITY.md`](./ROADMAP_COMMUNITY.md)** — Community “admin template switcher” items are **obsolete**; visitor templating and packs remain in scope there.
- **[`TEMPLATING.md` — Part III](./TEMPLATING.md#part-iii-implementation-checklist-and-backlog)** — Checklist items about **public** templates and theme apply stay valid; **admin template switching** is out of scope (see Technical Backlog note there).
- **[`TEMPLATING.md` §8 appendix](./TEMPLATING.md#8-appendix-create-a-template-pack-built-in)** — Packs apply to the **visitor** site; admin panel does not register packs.

## Open decisions (fill in as you implement)

- [x] Toolkit choice: **Skeleton v4.14.x**, Cerberus (2026-04).
- [x] Phase 1 layout: conditional root `+layout.svelte` (route group optional later).
- [x] **`adminTemplate`:** kept in schema and responses as **`default`** only; removing the field from JSON is deferred to a major API version if desired.

---

*Last updated: 2026-04 — admin chrome (header, language, toasts, Cerberus helpers, Skeleton components where adopted); aligns admin with a static, operator-focused UI; visitor template and theme systems unchanged.*
