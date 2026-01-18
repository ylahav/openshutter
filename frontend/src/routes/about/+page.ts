import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	// Load page by alias "about"
	const pageAlias = 'about';
	
	try {
		const response = await fetch(`/api/pages/${pageAlias}`);
		if (!response.ok) {
			if (response.status === 404) {
				throw error(404, 'Page not found');
			}
			throw error(500, 'Failed to load page');
		}
		const result = await response.json();
		const data = result.success ? result.data : result;
		
		if (!data.page && !data) {
			throw error(404, 'Page not found');
		}
		
		// Ensure we extract page and modules correctly
		const pageData = data.page || data;
		const modulesData = data.modules || [];
		
		return {
			page: pageData,
			modules: Array.isArray(modulesData) ? modulesData : []
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load page');
	}
};
