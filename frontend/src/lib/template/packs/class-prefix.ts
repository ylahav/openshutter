import { normalizeTemplatePackId, type TemplatePackId } from '$lib/template-packs/ids';

/** Short prefix prepended to page-builder `className` tokens (e.g. `a-header` for atelier). */
const PREFIX_BY_PACK: Record<TemplatePackId, string> = {
	noir: 'n',
	studio: 's',
	atelier: 'a'
};

export function packClassPrefixFor(packId: string | null | undefined): string {
	const id = normalizeTemplatePackId(packId);
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
