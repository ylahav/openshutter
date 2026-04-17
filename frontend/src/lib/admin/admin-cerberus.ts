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

/** Skeleton form primitives (background fill comes from `admin-skeleton.css` under `[data-admin-chrome]`). */
export const adminInputClass = 'input w-full';
export const adminSelectClass = 'select w-full';
/** Smaller controls (matches previous `text-sm` fields). */
export const adminInputSmClass = 'input w-full text-sm';
export const adminSelectSmClass = 'select w-full text-sm';
export const adminLabelClass = 'label';
export const adminLabelTextClass = 'label-text';
