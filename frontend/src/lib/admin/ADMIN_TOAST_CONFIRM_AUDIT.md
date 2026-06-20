# Admin toast & confirm audit (Phase 5 / 6)

Snapshot to drive migration: prefer **`adminToast`** for transient success/error and **`AdminConfirmDialog`** for destructive confirmations. Update this file when you change a page.

**Legend:** ✓ = imported / used in the route module · — = not found in a quick static scan (page may still use `useDialogManager`, inline alerts, or browser `confirm`).

| Admin route (`+page.svelte`) | `adminToast` | `AdminConfirmDialog` | Notes |
|-----------------------------|:-------------:|:---------------------:|-------|
| `/admin` | — | — | Dashboard; inline cards typical. **Wave 1 partial:** primary CTA, retry, quick actions use **`admin-cerberus`**. |
| `/admin/albums` | ✓ | ✓ | Wave 1; **partial:** empty-state **Create album** uses **`admin-cerberus`**. |
| `/admin/albums/[id]` | ✓ | ✓ | **Wave 1 partial:** **`adminToast`** for successes; bulk dialogs use **`admin-cerberus`**; red banner kept for **`error`**. |
| `/admin/albums/[id]/edit` | ✓ | — | **Wave 1 partial:** save / leading-photo feedback via **`adminToast`**; removed **`NotificationDialog`**; Cerberus primary/secondary actions. |
| `/admin/analytics` | — | — | **Wave 2 partial:** CSV export CTA uses **`admin-cerberus`**; load-error replaced with retry card (surface tokens). No transient actions → no toast needed. |
| `/admin/audit-logs` | ✓ | — | **Wave 5:** load/export via **`adminToast`**; filter/export/pagination use **`admin-cerberus`**; retry card when load fails (no red banner). |
| `/admin/backup-restore` | ✓ | ✓ | **Wave 2:** success/error via **`adminToast`**; backup actions use **`admin-cerberus`** (`restore` keeps caution label styling). |
| `/admin/blog-articles` | ✓ | ✓ | **Wave 3:** list errors via **`adminToast`**; status chips theme **`color-mix`**; CTAs **`admin-cerberus`**. |
| `/admin/blog-articles/new` | ✓ | — | **Wave 3:** create flow uses **`adminToast`** (validation + API); submit / tag add use **`admin-cerberus`**. |
| `/admin/blog-articles/[id]/edit` | ✓ | — | **Wave 3:** same toast + Cerberus pattern as new article. |
| `/admin/blog-categories` | ✓ | — | **Wave 3:** composable **`message`** → **`adminToast`**; primary CTAs **`admin-cerberus`**. |
| `/admin/blog-categories/new` | ✓ | — | **Wave 3:** **`adminToast`** replaces inline banners; submit uses **`admin-cerberus`**. |
| `/admin/blog-categories/[id]/edit` | ✓ | — | **Wave 3:** load/update feedback via **`adminToast`**; submit uses **`admin-cerberus`**. |
| `/admin/blogs` | — | — | Navigation hub only — no actions, no feedback needed. ✅ Done. |
| `/admin/contact-submissions` | ✓ | — | **Wave 5:** **`adminToast`** on load failure; search/pagination use **`admin-cerberus`**; i18n (en/he). |
| `/admin/docs/ui` | — | — | Read-only UI docs page — no actions, no feedback needed. ✅ Done. |
| `/admin/groups` | ✓ | — | **Wave 3:** composable **`message`** / import summary → **`adminToast`**; primary CTAs **`admin-cerberus`**. |
| `/admin/import-sync` | ✓ | — | **Wave 2:** **`adminToast`** (incl. info for path hints); primary job CTAs use **`admin-cerberus`**. |
| `/admin/locations` | ✓ | — | **Wave 2:** composable **`message`** success → **`adminToast`**; primary dialog/list CTAs use **`admin-cerberus`**; inline **`error`** kept for form/list. |
| `/admin/marketplace` | ✓ | ✓ | Action errors (approve/unapprove, featured, tags, delete) via **`adminToast.error`**; load-error replaced with retry card. |
| `/admin/pages` | ✓ | — | **Wave 3:** composable + inline successes → **`adminToast`**; primary actions **`admin-cerberus`** (see **`PageFilters`**). |
| `/admin/people` | ✓ | — | **Wave 3:** composable **`message`** / import → **`adminToast`**; primary CTAs **`admin-cerberus`**. |
| `/admin/photos/upload` | ✓ | — | **Wave 1:** batch summary **`adminToast`**; **`admin-cerberus`** tabs/actions; **`AlertModal`** removed (errors use toast). Report panels use surface / theme mixes (no raw **`green-50`**). |
| `/admin/photos/[id]/edit` | ✓ | — | **Wave 1:** **`adminToast`** replaces bottom **`Toast`**; Cerberus save/back/rotate/crop/rebuild actions; person chip uses primary mix. |
| `/admin/site-config` | ✓ | ✓ | **Wave 1 partial:** save/upload/test-email use **`adminToast`**; top **`message`** banner is **errors only** (Cerberus-style surface). |
| `/admin/storage` | — | — | Embeds `OwnerStorageView` (shared with `/owner/storage` which has no toast region). Inline banners are intentionally retained in the component — **no further migration possible without a shared toast abstraction**. |
| `/admin/storage/google-drive-setup` | ✓ | — | **Wave 5:** OAuth result uses **`adminToast`** + **`admin-cerberus`** links; **`postMessage`** payload unchanged. |
| `/admin/tags` | ✓ | — | **Wave 3:** composable **`message`** / import → **`adminToast`**; primary CTAs **`admin-cerberus`**. |
| `/admin/templates` | ✓ | — | **Wave 4** + polish: **`adminToast`** / modals; card **`btn-sm`** actions, **`adminBadge*`** chips, Skeleton **labels/inputs/selects**, delete confirm **`adminBtnDanger`**; spinner uses **primary** token. |
| `/admin/templates/customize` | ✓ | — | **Wave 4:** **`adminToast`** replaces **`NotificationDialog`** and inline strips; save/back use **`admin-cerberus`**; active chip uses primary **`color-mix`**. |
| `/admin/templates/overrides` | ✓ | ✓ | **Wave 4:** save/load/reset feedback via **`adminToast`**; toolbar and layout-editor primaries use **`admin-cerberus`**; preview device/page toggles use primary **`color-mix`** selected state. |
| `/admin/theme-layout` | ✓ | — | **Wave 4:** **`adminToast`** replaces alert strips; save/reset use **`admin-cerberus`**. |
| `/admin/translations` | ✓ | ✓ | **Wave 2:** **`adminToast`** replaces green/red banners; primary/editor CTAs use **`admin-cerberus`**. |
| `/admin/users` | ✓ | ✓ | CRUD success/error via **`adminToast`** (from `crudMessage`/`crudError` stores); all inline banners removed; delete dialog buttons use **`adminBtnDanger`** + **`adminBtnSecondary`**. |

**Audit complete (2026-06).** All routes addressed. `OwnerStorageView` retains inline banners by design (shared with `/owner/storage` which has no toast region). Run **[`docs/guides/ADMIN_SMOKE_CHECKLIST.md`](../../../../docs/guides/ADMIN_SMOKE_CHECKLIST.md)** after admin changes; **owner subset** (checklist §5) remains a manual pass.

*Generated with repo static scan; re-run `rg "adminToast|AdminConfirmDialog" frontend/src/routes/admin` after changes. **ESLint** warns on `confirm`/`alert` in admin scripts — see `frontend/eslint.config.js`.*
