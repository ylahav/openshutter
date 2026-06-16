import type { Action } from 'svelte';

/** Move an element to `document.body` so fixed overlays escape admin layout stacking contexts. */
export const portalToBody: Action<HTMLElement> = (node) => {
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		},
	};
};
