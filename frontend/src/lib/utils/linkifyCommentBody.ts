/** Escape HTML then turn http(s) URLs into safe anchor tags. */
export function linkifyCommentBody(text: string): string {
	const esc = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
	return esc.replace(
		/(https?:\/\/[^\s<]+)/g,
		'<a href="$1" class="underline break-all opacity-90 hover:opacity-100" target="_blank" rel="noopener noreferrer">$1</a>',
	);
}
