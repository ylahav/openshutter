import { createToaster } from '@skeletonlabs/skeleton-svelte';

/** Single admin toast store (Skeleton / Zag). */
export const adminToaster = createToaster({
	placement: 'top-end',
	max: 5,
});
