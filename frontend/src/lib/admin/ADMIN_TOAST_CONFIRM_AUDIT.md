# Admin toast & confirm audit (Phase 5 / 6)

Snapshot to drive migration: prefer **`adminToast`** for transient success/error and **`AdminConfirmDialog`** for destructive confirmations. Update this file when you change a page.

**Legend:** ✓ = imported / used in the route module · — = not found in a quick static scan (page may still use `useDialogManager`, inline alerts, or browser `confirm`).

| Admin route (`+page.svelte`) | `adminToast` | `AdminConfirmDialog` | Notes |
|-----------------------------|:-------------:|:---------------------:|-------|
| `/admin` | — | — | Dashboard; inline cards typical. **Wave 1 partial:** primary CTA, retry, quick actions use **`admin-cerberus`**. |
| `/admin/albums` | ✓ | ✓ | Wave 1; **partial:** empty-state **Create album** uses **`admin-cerberus`**. |
| `/admin/albums/[id]` | ✓ | ✓ | **Wave 1 partial:** **`adminToast`** for successes; bulk dialogs use **`admin-cerberus`**; red banner kept for **`error`**. |
| `/admin/albums/[id]/edit` | ✓ | — | **Wave 1 partial:** save / leading-photo feedback via **`adminToast`**; removed **`NotificationDialog`**; Cerberus primary/secondary actions. |
| `/admin/analytics` | — | — | |
| `/admin/audit-logs` | — | — | |
| `/admin/backup-restore` | — | ✓ | |
| `/admin/blog-articles` | ✓ | ✓ | |
| `/admin/blog-articles/new` | — | — | |
| `/admin/blog-articles/[id]/edit` | — | — | |
| `/admin/blog-categories` | — | — | |
| `/admin/blog-categories/new` | — | — | |
| `/admin/blog-categories/[id]/edit` | — | — | |
| `/admin/blogs` | — | — | |
| `/admin/contact-submissions` | — | — | |
| `/admin/docs/ui` | — | — | Markdown docs |
| `/admin/groups` | — | — | Uses dialog composable |
| `/admin/import-sync` | — | — | Large forms |
| `/admin/locations` | — | — | |
| `/admin/marketplace` | — | ✓ | |
| `/admin/pages` | — | — | Very large page |
| `/admin/people` | — | — | |
| `/admin/photos/upload` | ✓ | — | **Wave 1:** batch summary **`adminToast`**; **`admin-cerberus`** tabs/actions; **`AlertModal`** removed (errors use toast). Report panels use surface / theme mixes (no raw **`green-50`**). |
| `/admin/photos/[id]/edit` | ✓ | — | **Wave 1:** **`adminToast`** replaces bottom **`Toast`**; Cerberus save/back/rotate/crop/rebuild actions; person chip uses primary mix. |
| `/admin/site-config` | ✓ | ✓ | **Wave 1 partial:** save/upload/test-email use **`adminToast`**; top **`message`** banner is **errors only** (Cerberus-style surface). |
| `/admin/storage` | — | — | Embeds `OwnerStorageView`. **Wave 1 partial:** page shell uses admin body background (no **`gray-50`**). |
| `/admin/storage/google-drive-setup` | — | — | |
| `/admin/tags` | — | — | |
| `/admin/templates` | — | — | |
| `/admin/templates/customize` | — | — | |
| `/admin/templates/overrides` | — | ✓ | Multiple confirms |
| `/admin/theme-layout` | — | — | |
| `/admin/translations` | — | ✓ | Two confirm dialogs |
| `/admin/users` | — | ✓ | **Wave 1 partial:** create/edit dialog footers use **`admin-cerberus`**. |

**Next steps (Phase 6 Wave 2+):** begin **Wave 2** routes (import-sync, backup-restore, etc.); optional **`OwnerStorageView`** Cerberus pass; smoke checklist **C**.

*Generated with repo static scan; re-run `rg "adminToast|AdminConfirmDialog" frontend/src/routes/admin` after changes. **ESLint** warns on `confirm`/`alert` in admin scripts — see `frontend/eslint.config.js`.*
