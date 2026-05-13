# Admin UI — PR checklist

Use this when your PR touches **`frontend/src/routes/admin/**`** or **`frontend/src/lib/components/admin/**`**.

## Automation

- **ESLint (warn):** `confirm` / `window.confirm` / `alert` / `window.alert` in those paths — prefer **`AdminConfirmDialog`** and **`adminToast`** (see `frontend/eslint.config.js` and [`ADMIN_INTERACTION_PATTERNS.md`](../frontend/src/lib/admin/ADMIN_INTERACTION_PATTERNS.md)).

## Manual review

- [ ] **Cerberus / Skeleton** — Prefer `$lib/admin/admin-cerberus` (`adminBtnPrimary`, `adminInputSmClass`, …) and Skeleton **`btn` / `input` / `select`** presets under admin chrome; avoid new raw `bg-green-600` / `bg-blue-600` / `text-gray-*` unless there is a deliberate exception (document in PR).
- [ ] **Transient feedback** — Prefer **`adminToast`** for short success/error; keep inline panels only for **reports** (upload summaries, multi-step results) until that page is migrated.
- [ ] **Destructive actions** — Use **`AdminConfirmDialog`** (not browser confirm); align copy with i18n where user-visible strings are added.
- [ ] **Forms** — Submit buttons disabled while saving; map API errors with **`handleApiErrorResponse`** / **`submitErrorMessage`** per [`ADMIN_INTERACTION_PATTERNS.md`](../frontend/src/lib/admin/ADMIN_INTERACTION_PATTERNS.md).
- [ ] **Reorder lists** — For **flat** lists with drag-and-drop, consider **`AdminSortableList`**; nested trees may keep bespoke `svelte-dnd-action` (e.g. `AlbumTree`).

## Docs

- [ ] If you introduce a **new** cross-cutting admin pattern, extend **`frontend/src/lib/admin/ADMIN_INTERACTION_PATTERNS.md`** (and the toast/confirm audit table if route list changes).

Roadmap: [`docs/archive/development/ADMIN_UI_ROADMAP.md`](../docs/archive/development/ADMIN_UI_ROADMAP.md).
