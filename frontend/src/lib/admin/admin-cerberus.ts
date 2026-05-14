/**
 * Cerberus-aligned class fragments for admin UI.
 * Prefer these over raw `gray-*` / `blue-*` Tailwind so light/dark + `light-dark()` tokens stay consistent.
 * @see https://www.skeleton.dev/docs/design-system/themes — Cerberus
 * @see https://www.skeleton.dev/docs/tailwind-components/forms-and-inputs
 */

/** Primary body / heading text (uses theme `light-dark()` surface pairing). */
export const adminTextPrimary = 'text-(--color-surface-950-50)';

/** Secondary lines (labels, table body). */
export const adminTextSecondary = 'text-(--color-surface-800-200)';

/** Muted / help text. */
export const adminTextMuted = 'text-(--color-surface-600-400)';

/** Default border on neutral panels (pairs with Cerberus surfaces). */
export const adminBorderDefault = 'border-surface-200-800';

/** Stronger border. */
export const adminBorderStrong = 'border-surface-300-700';

/** Focus ring aligned with Cerberus primary. */
export const adminRingPrimary =
	'focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary-500) focus-visible:ring-offset-2 focus-visible:ring-offset-(--body-background-color) dark:focus-visible:ring-offset-(--body-background-color-dark)';

/** Primary actions — prefer Skeleton `btn` + preset (see Tailwind “Buttons” on skeleton.dev). */
export const adminBtnPrimary = 'btn preset-filled-primary-500';
/** Compact primary (matches previous `text-sm` toolbar / inline actions). */
export const adminBtnPrimarySm = 'btn preset-filled-primary-500 text-sm';
export const adminBtnSecondary = 'btn preset-tonal';
export const adminBtnDanger = 'btn preset-filled-error-500';

/** Compact toolbar / card actions (Skeleton `btn-sm`). */
export const adminBtnSmSecondary = 'btn btn-sm preset-tonal';
export const adminBtnSmPrimary = 'btn btn-sm preset-filled-primary-500';
export const adminBtnSmDanger = 'btn btn-sm preset-filled-error-500';

/** Status chips — prefer over raw Tailwind `green-*` / `amber-*` fills on admin cards. */
export const adminBadgePrimary =
	'inline-flex items-center rounded-full border border-[color-mix(in_oklab,var(--color-primary-500)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] px-2 py-0.5 text-xs font-medium text-(--color-primary-900)';
/** Preview / caution (amber tint without solid `bg-amber-100`). */
export const adminBadgeCaution =
	'inline-flex items-center rounded-full border border-[color-mix(in_oklab,#d97706_35%,transparent)] bg-[color-mix(in_oklab,#d97706_12%,transparent)] px-2 py-0.5 text-xs font-medium text-amber-950 dark:text-amber-100';

/** Skeleton form primitives (background fill comes from `admin-skeleton.css` under `[data-admin-chrome]`). */
export const adminInputClass = 'input w-full';
export const adminSelectClass = 'select w-full';
/** Smaller controls (matches previous `text-sm` fields). */
export const adminInputSmClass = 'input w-full text-sm';
export const adminSelectSmClass = 'select w-full text-sm';
export const adminLabelClass = 'label';
export const adminLabelTextClass = 'label-text';
