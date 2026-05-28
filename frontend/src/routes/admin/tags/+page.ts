import { loadAdminListPage } from '$lib/admin/listPageLoad';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch }) =>
	loadAdminListPage(fetch, '/api/admin/tags', { limit: 500 });
