import { browser } from '$app/environment';

/**
 * Marks in-app admin links for full page reload so navigation always updates the view.
 * SvelteKit client routing + Svelte 5 can leave stale page content while the URL changes.
 */
export function adminLinkReload(node: HTMLElement) {
	if (!browser) return {};

	const mark = () => {
		for (const anchor of node.querySelectorAll<HTMLAnchorElement>('a[href]')) {
			const href = anchor.getAttribute('href');
			if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
				continue;
			}
			let path = href;
			try {
				path = new URL(href, window.location.origin).pathname;
			} catch {
				continue;
			}
			if (!path.startsWith('/admin')) continue;
			if (anchor.target === '_blank') continue;
			anchor.setAttribute('data-sveltekit-reload', '');
		}
	};

	mark();
	const observer = new MutationObserver(mark);
	observer.observe(node, { childList: true, subtree: true });

	return {
		destroy() {
			observer.disconnect();
		},
	};
}
