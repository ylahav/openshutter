import { browser } from '$app/environment';

/** Reliable in-app admin navigation when SvelteKit client routing leaves stale page content. */
export function navigateAdmin(href: string, event?: MouseEvent): void {
	if (!browser) return;
	if (event) {
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
	}
	const target = new URL(href, window.location.origin);
	if (
		target.pathname === window.location.pathname &&
		target.search === window.location.search
	) {
		window.location.reload();
		return;
	}
	window.location.href = target.href;
}
