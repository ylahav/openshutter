import { browser } from '$app/environment';

/**
 * Admin interactivity fallbacks — work even when Svelte hydration fails on legacy pages.
 */
if (browser) {
	document.addEventListener(
		'click',
		(event) => {
			const target = event.target;
			if (!(target instanceof Node)) return;

			// Open native <dialog> by id (data-open-dialog="my-dialog-id")
			const opener =
				target instanceof Element
					? target.closest('[data-open-dialog]')
					: target.parentElement?.closest('[data-open-dialog]');
			if (opener instanceof HTMLElement) {
				const dialogId = opener.getAttribute('data-open-dialog');
				if (dialogId) {
					const dialog = document.getElementById(dialogId);
					if (dialog instanceof HTMLDialogElement) {
						event.preventDefault();
						event.stopPropagation();
						dialog.showModal();
						return;
					}
				}
			}

			if (event.defaultPrevented) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

			const anchor =
				target instanceof Element ? target.closest('a[href]') : target.parentElement?.closest('a[href]');
			if (!anchor || anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download')) return;
			if (anchor.hasAttribute('data-sveltekit-reload')) return;

			const rawHref = anchor.getAttribute('href');
			if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:'))
				return;

			let url: URL;
			try {
				url = new URL(rawHref, window.location.origin);
			} catch {
				return;
			}

			if (url.origin !== window.location.origin) return;
			if (!window.location.pathname.startsWith('/admin')) return;

			const path = url.pathname;
			if (!path.startsWith('/admin') && !path.startsWith('/albums/')) return;

			event.preventDefault();
			event.stopImmediatePropagation();
			window.location.assign(url.href);
		},
		true
	);
}
