import { normalizeTemplatePackId, type TemplatePackId } from '$lib/template-packs/ids';

/** Built-in default when `site_config.template.pageAliasPrefixes` has no entry for the pack. */
const PREFIX_BY_PACK: Record<TemplatePackId, string> = {
	noir: 'n',
	studio: 's',
	atelier: 'a'
};

const PREFIX_TOKEN = /^[a-z0-9]{1,12}$/;

function normalizedOverride(raw: string | undefined | null): string | null {
	if (raw === undefined || raw === null) return null;
	const t = String(raw).trim().toLowerCase();
	if (!PREFIX_TOKEN.test(t)) return null;
	return t;
}

/**
 * Effective CMS page-alias / scoped CSS prefix for a pack.
 * Optional `pageAliasPrefixes` comes from `site_config.template.pageAliasPrefixes` (admin-editable).
 */
export function packClassPrefixFor(
	packId: string | null | undefined,
	pageAliasPrefixes?: Record<string, string> | null
): string {
	const id = normalizeTemplatePackId(packId);
	const fromConfig = normalizedOverride(pageAliasPrefixes?.[id]);
	if (fromConfig) return fromConfig;
	return PREFIX_BY_PACK[id] || '';
}

/**
 * Turns `header footer-strip` + prefix `a` into `a-header a-footer-strip`.
 * Tokens that already start with `{prefix}-` are unchanged.
 * Tokens that look like Tailwind / arbitrary CSS (`:`, `[`, `/`, `!`, `@`) are passed through.
 */
export function applyPackClassPrefix(classString: string, prefix: string): string {
	const p = String(prefix ?? '').trim();
	const s = String(classString ?? '').trim();
	if (!s) return '';
	if (!p) return s;

	return s
		.split(/\s+/)
		.map((token) => {
			if (!token) return '';
			if (token.startsWith(`${p}-`)) return token;
			if (/[!?:@[\]/]/.test(token)) return token;
			return `${p}-${token}`;
		})
		.filter(Boolean)
		.join(' ');
}
