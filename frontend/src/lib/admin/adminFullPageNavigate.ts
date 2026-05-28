import type { BeforeNavigate } from '@sveltejs/kit';

/**
 * Force a full document load for admin route changes (pathname changes only).
 * Keeps query-only updates on client navigation (e.g. ?tab=).
 */
export const adminFullPageNavigate: BeforeNavigate = (navigation) => {
	const to = navigation.to?.url;
	const from = navigation.from?.url;
	if (!to?.pathname.startsWith('/admin')) return;
	if (navigation.type === 'popstate' || navigation.type === 'leave') return;
	if (from && to.pathname === from.pathname) return;

	const dest = to.href;
	if (dest === window.location.href) {
		navigation.cancel();
		window.location.reload();
		return;
	}

	navigation.cancel();
	window.location.assign(dest);
};
