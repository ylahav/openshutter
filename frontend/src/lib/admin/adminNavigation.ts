import { browser } from '$app/environment';

/** Full document navigation — reliable for admin when client routing leaves stale page content. */
export function adminNavigate(href: string): void {
	if (!browser) return;
	const target = new URL(href, window.location.origin);
	if (target.href === window.location.href) {
		window.location.reload();
		return;
	}
	window.location.assign(target.href);
}

/** @deprecated alias */
export function adminGoto(href: string): void {
	adminNavigate(href);
}
