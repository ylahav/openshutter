# Admin UI smoke checklist (Phase 6)

Use after **layout, nav, or admin styling** changes, and before a release that touches **`/admin/**`**. Assumes a **site admin** account and a running stack (`pnpm dev` or equivalent).

See also: **[`ADMIN_UI_ROADMAP.md`](../archive/development/ADMIN_UI_ROADMAP.md)** (Phase 6 waves), **[`ADMIN_TOAST_CONFIRM_AUDIT.md`](../../frontend/src/lib/admin/ADMIN_TOAST_CONFIRM_AUDIT.md)** (per-route patterns).

## 1. Shell and navigation

- [ ] Open **`/admin`** — top bar, sidebar, and light/dark toggle render; no visitor pack header/footer.
- [ ] Click each **sidebar** item — route loads without console errors; active state updates.
- [ ] Trigger a **toast** (e.g. Site config → save, or Templates → create flow) — toast appears and dismisses.

## 2. Waves 1–2 (core + heavy config)

- [ ] **Dashboard** — cards load or show a sensible empty/error state.
- [ ] **Albums** — list loads; open one album; optional: upload path from sidebar.
- [ ] **Site config** — open a tab, save a harmless change, confirm toast.
- [ ] **Storage** — page loads; Google Drive section does not throw if disabled.
- [ ] **Import / backup / translations / marketplace / analytics / locations** — open each; at least one primary action renders (no blank shell).

## 3. Waves 3–4 (content + themes)

- [ ] **Pages** or **Blog** hub — list opens.
- [ ] **Templates** — list themes; **Create** modal opens; **Theme builder** link opens overrides; card actions (Edit / Set default / Preview / Duplicate / Delete) use Skeleton buttons and badges look theme-aligned.
- [ ] **Theme & layout** — page loads; save disabled until change (if applicable).

## 4. Wave 5 (supporting)

- [ ] **Audit logs** — filters apply; empty or table renders.
- [ ] **Contact submissions** — list or empty state; search submit does not break.
- [ ] **UI docs** (`/admin/docs/ui`) — nav switches doc; markdown renders.
- [ ] **Google Drive setup** — only if testing OAuth: callback URL shows success or failure card (popup or full window).

## 5. Owner subset (`ownerCanAccess`)

Owners do **not** land on **`/admin`** today. With an **owner** account, verify allowed routes only (see `frontend/src/routes/admin/+layout.server.ts`):

- [ ] **Albums / photos / storage** (as applicable) — no 403 on allowed paths; no cross-owner data in lists you can see.

## 6. Regression guard

- [ ] No accidental **guest** access to `/admin` (unauthenticated redirect).
- [ ] **API proxies** still return JSON for `/api/admin/*` routes you touched (not HTML error pages).

---

*Last updated: 2026-05 — aligned with Phase 6 Waves 1–5.*
