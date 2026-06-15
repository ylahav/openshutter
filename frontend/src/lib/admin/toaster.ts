import { createToaster } from '@skeletonlabs/skeleton-svelte';

/** Shared Skeleton toast instance for admin UI. */
export const adminToaster = createToaster({
	placement: 'top-end',
	max: 5
});
