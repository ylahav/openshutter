/**
 * Expands shorthand like `1-9-2` to `1fr 9fr 2fr`. Passes through full CSS values unchanged.
 */
export function normalizeGridTemplateColumns(raw: string): string {
	const v = raw.trim();
	if (!v) return '';
	if (/^\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)+$/.test(v)) {
		return v
			.split('-')
			.map((n) => `${n}fr`)
			.join(' ');
	}
	return v;
}

/**
 * `Nfr` in Grid defaults to `minmax(auto, Nfr)` — auto min-size follows content, which often
 * fights proportional columns (tracks look equal). Use `minmax(0, Nfr)` so fr ratios win.
 * Keeps non-`…fr` tokens (e.g. `auto`, `min-content`, `minmax(...)`) unchanged.
 */
export function hardenGridFrTracks(template: string): string {
	const v = template.trim();
	if (!v) return '';
	const repeatM = /^repeat\s*\(\s*(\d+)\s*,\s*(\d+(?:\.\d+)?)fr\s*\)$/i.exec(v);
	if (repeatM) {
		return `repeat(${repeatM[1]}, minmax(0, ${repeatM[2]}fr))`;
	}
	return v
		.split(/\s+/)
		.filter(Boolean)
		.map((token) => {
			const fr = /^(\d+(?:\.\d+)?)fr$/.exec(token);
			if (fr) return `minmax(0, ${fr[1]}fr)`;
			return token;
		})
		.join(' ');
}

/** Normalize shorthand then harden fr tracks — use for layout-shell row `grid-template-columns`. */
export function shellGridTemplateColumns(raw: string): string {
	return hardenGridFrTracks(normalizeGridTemplateColumns(raw));
}
