// frontend/src/lib/page-builder/modules/SocialMedia/resolveLinks.ts

export type ResolvedSocialLink = {
	key: string;
	url: string;
	label: string;
	icon: string;
};

const DEFAULT_LABELS: Record<string, string> = {
	facebook: 'Facebook',
	instagram: 'Instagram',
	twitter: 'Twitter',
	linkedin: 'LinkedIn',
	flickr: 'Flickr',
	youtube: 'YouTube',
	github: 'GitHub',
};

const ICON_BY_KEY: Record<string, string> = {
	facebook: 'Facebook',
	instagram: 'Instagram',
	twitter: 'Twitter',
	linkedin: 'Linkedin',
	flickr: 'Globe',
	youtube: 'Youtube',
	github: 'Github',
};

function labelForKey(key: string, explicit?: string): string {
	const e = explicit?.trim();
	if (e) return e;
	const k = key.toLowerCase();
	if (DEFAULT_LABELS[k]) return DEFAULT_LABELS[k];
	return key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Link';
}

function iconForKey(key: string, explicit?: string): string {
	const e = explicit?.trim();
	if (e) return e;
	const k = key.toLowerCase();
	return ICON_BY_KEY[k] ?? 'Globe';
}

function normalizeRawItem(raw: unknown): ResolvedSocialLink | null {
	if (!raw || typeof raw !== 'object') return null;
	const o = raw as Record<string, unknown>;
	const urlRaw = typeof o.url === 'string' ? o.url : typeof o.href === 'string' ? o.href : '';
	const url = urlRaw.trim();
	if (!url) return null;
	const keySource =
		(typeof o.platform === 'string' && o.platform.trim()) ||
		(typeof o.key === 'string' && o.key.trim()) ||
		'link';
	const key = keySource.toLowerCase();
	const label = typeof o.label === 'string' ? o.label : '';
	const icon = typeof o.icon === 'string' ? o.icon : '';
	return {
		key,
		url,
		label: labelForKey(keySource, label),
		icon: iconForKey(key, icon),
	};
}

/** Non-empty list from a raw JSON array (e.g. `props.links` from API), or null. */
export function normalizeLinksArray(raw: unknown): ResolvedSocialLink[] | null {
	if (!Array.isArray(raw)) return null;
	const out = raw.map(normalizeRawItem).filter((x): x is ResolvedSocialLink => x != null);
	return out.length ? out : null;
}

/** Non-empty array from `linksJson` string, or null if absent / invalid / empty array. */
export function parseLinksJson(linksJson: unknown): ResolvedSocialLink[] | null {
	if (typeof linksJson !== 'string' || !linksJson.trim()) return null;
	try {
		const v = JSON.parse(linksJson) as unknown;
		return normalizeLinksArray(v);
	} catch {
		return null;
	}
}

/** Build ordered link list from a flat platform → URL map (site contact or legacy module props). */
export function linksFromSocialObject(obj: unknown): ResolvedSocialLink[] {
	const base =
		obj && typeof obj === 'object' && !Array.isArray(obj) ? (obj as Record<string, unknown>) : {};
	const order = ['facebook', 'instagram', 'flickr', 'twitter', 'linkedin', 'youtube', 'github'];
	const seen = new Set<string>();
	const out: ResolvedSocialLink[] = [];
	for (const k of order) {
		const u = base[k];
		if (typeof u === 'string' && u.trim()) {
			seen.add(k);
			out.push({
				key: k,
				url: u.trim(),
				label: labelForKey(k),
				icon: iconForKey(k),
			});
		}
	}
	for (const [k, v] of Object.entries(base)) {
		if (seen.has(k)) continue;
		if (typeof v === 'string' && v.trim()) {
			const key = k.toLowerCase();
			out.push({
				key,
				url: v.trim(),
				label: labelForKey(k),
				icon: iconForKey(key),
			});
		}
	}
	return out;
}

/** Legacy `{ facebook, instagram, … }` module props → JSON array text for editors. */
export function legacySocialObjectToLinksJson(socialMedia: unknown): string {
	const o =
		socialMedia && typeof socialMedia === 'object' && !Array.isArray(socialMedia)
			? (socialMedia as Record<string, unknown>)
			: {};
	const entries = Object.entries(o).filter(([, v]) => typeof v === 'string' && String(v).trim());
	if (!entries.length) return '';
	return JSON.stringify(
		entries.map(([platform, url]) => ({ platform, url: String(url).trim() })),
		null,
		2
	);
}
