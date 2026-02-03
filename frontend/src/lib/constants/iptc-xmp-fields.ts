/**
 * Canonical list of IPTC/XMP metadata field names that can be displayed.
 * Keys match what exifr returns (translated keys) for IPTC and XMP segments.
 * Used by site config (admin selects which to show) and by components that display IPTC/XMP.
 */
export const IPTC_XMP_DISPLAY_FIELDS: Array<{ id: string; label: string }> = [
	// IPTC Core / common
	{ id: 'ObjectName', label: 'Object Name / Title' },
	{ id: 'Caption', label: 'Caption' },
	{ id: 'Keywords', label: 'Keywords' },
	{ id: 'CopyrightNotice', label: 'Copyright Notice' },
	{ id: 'Creator', label: 'Creator' },
	{ id: 'Credit', label: 'Credit' },
	{ id: 'City', label: 'City' },
	{ id: 'Country', label: 'Country' },
	{ id: 'ProvinceState', label: 'Province / State' },
	{ id: 'Sublocation', label: 'Sublocation' },
	{ id: 'Source', label: 'Source' },
	{ id: 'Headline', label: 'Headline' },
	{ id: 'Description', label: 'Description' },
	{ id: 'Title', label: 'Title' },
	{ id: 'Subject', label: 'Subject' },
	// XMP Dublin Core / Photoshop
	{ id: 'CreatorTool', label: 'Creator Tool' },
	{ id: 'CreateDate', label: 'Create Date' },
	{ id: 'ModifyDate', label: 'Modify Date' },
	{ id: 'Rating', label: 'Rating' },
	{ id: 'Instructions', label: 'Instructions' },
	{ id: 'TransmissionReference', label: 'Transmission Reference' },
	{ id: 'Category', label: 'Category' },
	{ id: 'SupplementalCategories', label: 'Supplemental Categories' },
	{ id: 'Urgency', label: 'Urgency' },
];

/**
 * Returns IPTC/XMP object filtered to only keys that should be displayed.
 * If displayFields is undefined or empty, returns all keys (show all).
 */
export function filterIptcXmpByDisplayFields(
	iptcXmp: Record<string, unknown> | null | undefined,
	displayFields: string[] | undefined
): Record<string, unknown> | null {
	if (!iptcXmp || typeof iptcXmp !== 'object') return null;
	if (!displayFields || displayFields.length === 0) return iptcXmp;
	const set = new Set(displayFields);
	const filtered: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(iptcXmp)) {
		if (set.has(key)) {
			filtered[key] = value;
		}
	}
	return Object.keys(filtered).length > 0 ? filtered : null;
}
