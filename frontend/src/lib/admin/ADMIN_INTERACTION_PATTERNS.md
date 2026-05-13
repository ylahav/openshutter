# Admin interaction patterns (Phase 5)

Conventions for `/admin/**` Svelte pages: **forms**, **loading**, **toasts**, **confirm dialogs**, and **side panels**. Visitor-facing routes are out of scope.

## Forms and validation

1. **Submit state** — Use a boolean such as `saving` or `submitting`. While true:
   - Disable primary submit buttons (`disabled={saving}`).
   - Optionally show a small spinner or “Saving…” label on the same control.
2. **Client validation** — Validate required fields before `fetch`. Set a `record<string, string>` (e.g. `fieldErrors`) or inline booleans; show errors under inputs using `adminLabelTextClass` + error color classes from Cerberus (`text-error-500` / `preset` tokens where appropriate).
3. **Server errors** — On failed `fetch`, prefer `await handleApiErrorResponse(res)` in a `try`/`catch`, or read JSON and throw `ApiError` yourself. In `catch`, use:
   - **`submitErrorMessage(err)`** from `$lib/admin/form-errors` for a single banner or toast body.
   - **`fieldHintFromApiError(err, 'fieldName')`** when the backend supplies structured `details` (extend Nest/DTOs when you need per-field messages).
4. **Success** — For **short-lived** feedback after save, prefer **`adminToast.success`** (`$lib/admin/adminToast`). Keep **inline** summary blocks when the UX is a **report** (e.g. upload result tables) until Phase 6 migrates that screen.

## Toasts and confirm dialogs

- **Toasts:** `adminToast.success | .error | .info` — titles should be short; put details in `description`.
- **Destructive actions:** Use **`AdminConfirmDialog`** (`$lib/components/admin/AdminConfirmDialog.svelte`) with `variant="danger"` when deleting or irreversibly changing data.

## Drawers and floating panels

Skeleton **does not** ship a dedicated “Drawer” name. Use one of:

| Use case | Component | Notes |
|----------|-----------|--------|
| **Modal** (center, focus trap) | `Dialog` + `Portal` | Already used in `AdminConfirmDialog`. |
| **Docked side sheet** (filters, inspectors) | `Dialog` + `Portal` with a **wide** `Dialog.Positioner` aligned to **`items-end`** / **`justify-end`** and full-height `Dialog.Content` (`max-w-md` → `max-w-lg` / `h-full`) | Same stack as modals; document max width in the page. |
| **Floating / draggable panel** | `FloatingPanel` + `Portal` from `@skeletonlabs/skeleton-svelte` | See [Floating Panel — Skeleton](https://www.skeleton.dev/docs/svelte/framework-components/floating-panel). Good for tool-style inspectors, not every list filter. |

**Breakpoints:** On narrow viewports, prefer **full-screen** `Dialog.Content` (`w-full h-full max-w-none rounded-none`) for side sheets so content does not clip.

## Reorderable flat lists

- Use **`AdminSortableList`** (`$lib/components/admin/AdminSortableList.svelte`) for **flat** vertical lists whose items each have a stable **`id`** string.
- Parent should **`bind:items`** and listen for **`on:reorder`** to persist order (e.g. `PATCH` array of ids). Nested trees (album hierarchy) keep using **`AlbumTree`** / bespoke `dndzone` until a dedicated abstraction exists.

**Example:**

```svelte
<script lang="ts">
	import AdminSortableList from '$lib/components/admin/AdminSortableList.svelte';

	let rows: Array<{ id: string; title: string }> = [
		{ id: '1', title: 'First' },
		{ id: '2', title: 'Second' },
	];

	async function persistOrder() {
		/* await fetch(... ids in rows order ...) */
	}
</script>

<AdminSortableList bind:items={rows} on:reorder={persistOrder} let:item>
	<span class="font-medium">{item.title}</span>
</AdminSortableList>
```

## Styling

Prefer **`admin-cerberus.ts`** class exports and Skeleton **`btn` / `input` / `select`** presets under `[data-admin-chrome]` so light/dark matches the admin shell.

## ESLint & PR checklist (admin scope)

- **ESLint:** For `src/routes/admin/**` and `src/lib/components/admin/**`, ESLint **warns** on `confirm()`, `window.confirm`, `alert()`, and `window.alert` in **`<script>`** — use **`AdminConfirmDialog`** / **`adminToast`** instead (`frontend/eslint.config.js`). Template `class="..."` strings are still reviewed manually.
- **PR checklist:** When changing admin UI, reviewers use [`.github/ADMIN_UI_PR_CHECKLIST.md`](../../../../.github/ADMIN_UI_PR_CHECKLIST.md) (Cerberus, toasts, confirms, forms).

## See also

- [`README.md`](./README.md) — index of admin helpers.
- [`ADMIN_TOAST_CONFIRM_AUDIT.md`](./ADMIN_TOAST_CONFIRM_AUDIT.md) — which routes already use toasts vs confirms (update as you migrate).
- Roadmap: [`docs/archive/development/ADMIN_UI_ROADMAP.md`](../../../docs/archive/development/ADMIN_UI_ROADMAP.md).
