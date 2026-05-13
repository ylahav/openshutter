# Admin chrome — shared code

Operator UI under `/admin` uses **Skeleton (Cerberus)** scoped in `AdminAppChrome`, not visitor template packs.

| Resource | Purpose |
|----------|---------|
| [`admin-cerberus.ts`](./admin-cerberus.ts) | Tailwind / Skeleton class fragments (buttons, inputs, text colors). |
| [`toaster.ts`](./toaster.ts) + [`adminToast.ts`](./adminToast.ts) | Global toast region (`AdminToastRegion`) and `adminToast.success` / `.error` / `.info`. |
| [`form-errors.ts`](./form-errors.ts) | Helpers to turn thrown API errors into user-visible strings (and optional field hints). |
| [`ADMIN_INTERACTION_PATTERNS.md`](./ADMIN_INTERACTION_PATTERNS.md) | **Forms, loading, toasts, confirms, drawers** — patterns to follow in admin routes. |
| [`ADMIN_TOAST_CONFIRM_AUDIT.md`](./ADMIN_TOAST_CONFIRM_AUDIT.md) | Snapshot of which admin pages use toasts vs inline banners vs confirm dialogs (update when migrating). |
| [`../components/admin/AdminConfirmDialog.svelte`](../components/admin/AdminConfirmDialog.svelte) | Destructive / high-friction confirmations. |
| [`../components/admin/AdminSortableList.svelte`](../components/admin/AdminSortableList.svelte) | Flat vertical list reordering via `svelte-dnd-action` + Cerberus row chrome. |

Roadmap: [`docs/archive/development/ADMIN_UI_ROADMAP.md`](../../../docs/archive/development/ADMIN_UI_ROADMAP.md) (Phases 5–6).
