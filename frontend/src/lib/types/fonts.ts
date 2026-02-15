/**
 * Font setting: family (required for display), optional size and weight.
 * Values can be stored as string (legacy = family only) or full object.
 */
export interface FontSetting {
	family: string;
	size?: string;
	weight?: string;
}

export type FontRole = 'heading' | 'body' | 'links' | 'lists' | 'formInputs' | 'formLabels';

export const FONT_ROLES: FontRole[] = ['heading', 'body', 'links', 'lists', 'formInputs', 'formLabels'];

/** Default size/weight per role when not set (used by ThemeColorApplier and globals). */
export const DEFAULT_FONT_SIZE_WEIGHT: Record<FontRole, { size: string; weight: string }> = {
	heading: { size: '1.25rem', weight: '600' },
	body: { size: '1rem', weight: '400' },
	links: { size: 'inherit', weight: 'inherit' },
	lists: { size: 'inherit', weight: 'inherit' },
	formInputs: { size: '1rem', weight: '400' },
	formLabels: { size: '0.875rem', weight: '500' }
};

/** Normalize string or partial object to FontSetting. */
export function normalizeFontSetting(
	value: string | FontSetting | undefined,
	defaultFamily: string,
	role: FontRole
): FontSetting {
	const defaults = DEFAULT_FONT_SIZE_WEIGHT[role];
	if (value == null || value === '') {
		return { family: defaultFamily, size: defaults.size, weight: defaults.weight };
	}
	if (typeof value === 'string') {
		return { family: value, size: defaults.size, weight: defaults.weight };
	}
	return {
		family: value.family ?? defaultFamily,
		size: value.size ?? defaults.size,
		weight: value.weight ?? defaults.weight
	};
}

/** Extract family from string or FontSetting for Google Fonts URL. */
export function getFontFamily(value: string | FontSetting | undefined): string | undefined {
	if (value == null || value === '') return undefined;
	return typeof value === 'string' ? value : value.family;
}

/** Preset sizes for font size selector. */
export const FONT_SIZE_OPTIONS = [
	{ value: '', label: 'Default' },
	{ value: '0.75rem', label: '0.75rem (12px)' },
	{ value: '0.875rem', label: '0.875rem (14px)' },
	{ value: '1rem', label: '1rem (16px)' },
	{ value: '1.125rem', label: '1.125rem (18px)' },
	{ value: '1.25rem', label: '1.25rem (20px)' },
	{ value: '1.5rem', label: '1.5rem (24px)' },
	{ value: '2rem', label: '2rem (32px)' },
];

/** Preset weights for font weight selector. */
export const FONT_WEIGHT_OPTIONS = [
	{ value: '', label: 'Default' },
	{ value: '300', label: '300 (Light)' },
	{ value: '400', label: '400 (Normal)' },
	{ value: '500', label: '500 (Medium)' },
	{ value: '600', label: '600 (Semibold)' },
	{ value: '700', label: '700 (Bold)' },
];
