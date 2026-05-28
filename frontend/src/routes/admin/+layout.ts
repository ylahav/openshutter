import type { LayoutLoad } from './$types';

/** Changes on every admin navigation; keys the layout outlet so child pages remount. */
export const load: LayoutLoad = ({ url }) => {
	return {
		navKey: `${url.pathname}${url.search}`,
	};
};
