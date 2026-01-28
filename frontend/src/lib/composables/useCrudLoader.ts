/**
 * Composable for loading CRUD data with search/filter support
 * 
 * Eliminates duplication across admin CRUD pages
 * 
 * @example
 * ```typescript
 * const { items, loading, error, loadItems } = useCrudLoader('/api/admin/people', {
 *   searchParam: 'search',
 *   searchValue: () => searchTerm,
 *   filterParams: { category: () => categoryFilter }
 * });
 * ```
 */

import { writable } from 'svelte/store';
import { logger } from '../utils/logger';
import { handleError, handleApiErrorResponse } from '../utils/errorHandler';

export interface CrudLoaderOptions {
	/** Search parameter name (e.g., 'search', 'q') */
	searchParam?: string;
	/** Function that returns current search value */
	searchValue?: () => string;
	/** Additional filter parameters */
	filterParams?: Record<string, () => string | undefined>;
	/** Custom endpoint builder function */
	endpointBuilder?: (baseEndpoint: string, params: URLSearchParams) => string;
	/** Transform function for response data */
	transform?: (data: any) => any;
}

export function useCrudLoader<T = any>(
	endpoint: string,
	options: CrudLoaderOptions = {}
) {
	const items = writable<T[]>([]);
	const loading = writable(false);
	const error = writable('');

	async function loadItems() {
		loading.set(true);
		error.set('');

		try {
			const params = new URLSearchParams();

			// Add search parameter if provided
			if (options.searchParam && options.searchValue) {
				const searchValue = options.searchValue();
				if (searchValue) {
					params.append(options.searchParam, searchValue);
				}
			}

			// Add filter parameters if provided
			if (options.filterParams) {
				for (const [key, getValue] of Object.entries(options.filterParams)) {
					const value = getValue();
					if (value && value !== 'all') {
						params.append(key, value);
					}
				}
			}

			// Build endpoint URL
			const url = options.endpointBuilder
				? options.endpointBuilder(endpoint, params)
				: `${endpoint}?${params.toString()}`;

			const response = await fetch(url);
			
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			
			// Extract array from response (handles both { data: [...] } and direct array)
			let dataArray: T[] = [];
			if (Array.isArray(result)) {
				dataArray = result;
			} else if (result && Array.isArray(result.data)) {
				dataArray = result.data;
			} else if (result && typeof result === 'object') {
				// Check if it's an error object
				if (result.error || result.success === false) {
					throw new Error(result.error || result.message || 'Failed to fetch data');
				}
				dataArray = [];
			}

			// Apply transform if provided
			const transformedData = options.transform ? options.transform(dataArray) : dataArray;
			items.set(transformedData);
		} catch (err) {
			logger.error(`Error loading data from ${endpoint}:`, err);
			error.set(handleError(err, 'Failed to load data'));
			items.set([]);
		} finally {
			loading.set(false);
		}
	}

	return {
		items: {
			subscribe: items.subscribe,
			set: items.set,
			update: items.update
		},
		loading: {
			subscribe: loading.subscribe,
			set: loading.set
		},
		error: {
			subscribe: error.subscribe,
			set: error.set
		},
		loadItems
	};
}
