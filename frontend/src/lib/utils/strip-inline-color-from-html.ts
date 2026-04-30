/**
 * Removes `color:` declarations from inline `style` attributes so template tokens
 * (e.g. prose / pack SCSS) control text colour.
 */
export function stripInlineColorFromHtml(html: string): string {
	if (!html) return html;
	return html.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (_full, quote: string, styleContent: string) => {
		let s = styleContent.replace(/\s*color\s*:\s*[^;]+;?/gi, '');
		s = s.replace(/;\s*;/g, ';').replace(/^\s*;\s*|\s*;\s*$/g, '').trim();
		if (!s) return '';
		return ` style=${quote}${s}${quote}`;
	});
}
