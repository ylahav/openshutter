/**
 * Composable for loading CRUD data with search/filter support
 * 
 * Eliminates duplication across admin CRUD pages by providing a standardized
 * way to load, filter, and search data from API endpoints.
 * 
 * @template T - The type of items in the array (defaults to `unknown`)
 * 
 * @param endpoint - The base API endpoint URL (e.g., '/api/admin/people')
 * @param options - Configuration options for search, filters, and transformations
 * 
 * @returns An object containing:
 * - `items`: Svelte store containing the loaded items array
 * - `loading`: Svelte store indicating loading state
 * - `error`: Svelte store containing error messages
 * - `loadItems`: Function to trigger data loading
 * 
 * @example Basic usage with search
 * ```typescript
 * const { items, loading, error, loadItems } = useCrudLoader('/api/admin/people', {
 *   searchParam: 'search',
 *   searchValue: () => searchTerm
 * });
 * 
 * // In component (Svelte 5: use store auto-subscription in templates)
 * $: if (searchTerm) loadItems();
 * // Template: `{#if $loading}` and `{#each $items as row}` — not `let loading` copies.
 * // Optional +page.ts: pass `initialItems` / `initialLoadError`, then `loadItems({ background: true })` on mount.
 * ```
 * 
 * @example With filters
 * ```typescript
 * const { items, loading, error, loadItems } = useCrudLoader('/api/admin/tags', {
 *   searchParam: 'q',
 *   searchValue: () => searchTerm,
 *   filterParams: {
 *     category: () => categoryFilter,
 *     active: () => activeFilter
 *   }
 * });
 * ```
 * 
 * @example With custom endpoint builder
 * ```typescript
 * const { items, loading, error, loadItems } = useCrudLoader('/api/admin/albums', {
 *   endpointBuilder: (base, params) => {
 *     const cacheBuster = Date.now();
 *     return `${base}?t=${cacheBuster}&${params.toString()}`;
 *   }
 * });
 * ```
 * 
 * @example With data transformation
 * ```typescript
 * const { items, loading, error, loadItems } = useCrudLoader('/api/admin/locations', {
 *   transform: (data) => data.map(item => ({
 *     ...item,
 *     coordinates: item.coordinates ? {
 *       lat: parseFloat(item.coordinates.lat),
 *       lng: parseFloat(item.coordinates.lng)
 *     } : null
 *   }))
 * });
 * ```
 */

import { writable } from 'svelte/store';
import { logger } from '../utils/logger';
import { handleError, handleApiErrorResponse } from '../utils/errorHandler';

export interface CrudLoaderOptions<T = unknown> {
	/** Search parameter name (e.g., 'search', 'q') */
	searchParam?: string;
	/** Function that returns current search value */
	searchValue?: () => string;
	/** Additional filter parameters as key-value pairs where values are getter functions */
	filterParams?: Record<string, () => string | undefined>;
	/** Custom endpoint builder function for advanced URL construction */
	endpointBuilder?: (baseEndpoint: string, params: URLSearchParams) => string;
	/** Transform function to modify response data before setting items */
	transform?: (data: T[]) => T[];
	/** Enable pagination support (optional, defaults to false) */
	pagination?: {
		/** Current page number (1-indexed) */
		page: number;
		/** Number of items per page */
		limit: number;
		/** Function to get current page number */
		getPage?: () => number;
		/** Function to get current limit */
		getLimit?: () => number;
		/** Parameter names for pagination (defaults to 'page' and 'limit') */
		params?: {
			page?: string;
			limit?: string;
		};
	};
	/** Preloaded in +page.ts so the first paint is not stuck on a spinner (Svelte 5). */
	initialItems?: T[];
	/** Set when +page.ts load failed; keeps loading false and surfaces the message. */
	initialLoadError?: string;
}

export function useCrudLoader<T = unknown>(
	endpoint: string,
	options: CrudLoaderOptions<T> = {}
) {
	const hasPreloaded =
		options.initialItems !== undefined || Boolean(options.initialLoadError);
	const items = writable<T[]>(options.initialItems ?? []);
	const loading = writable(!hasPreloaded);
	const error = writable(options.initialLoadError ?? '');

	/**
	 * Loads items from the API endpoint with current search and filter parameters
	 * 
	 * Automatically handles:
	 * - Search parameter inclusion
	 * - Filter parameter inclusion
	 * - Pagination parameters (if enabled)
	 * - Response parsing (handles both array and { data: [...] } formats)
	 * - Error handling and logging
	 * - Data transformation (if provided)
	 */
	async function loadItems(opts?: { background?: boolean }) {
		if (!opts?.background) {
			loading.set(true);
		}
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

			// Add pagination parameters if enabled
			if (options.pagination) {
				const pageParam = options.pagination.params?.page || 'page';
				const limitParam = options.pagination.params?.limit || 'limit';
				const currentPage = options.pagination.getPage
					? options.pagination.getPage()
					: options.pagination.page;
				const currentLimit = options.pagination.getLimit
					? options.pagination.getLimit()
					: options.pagination.limit;
				
				params.append(pageParam, currentPage.toString());
				params.append(limitParam, currentLimit.toString());
			}

			// Build endpoint URL
			const url = options.endpointBuilder
				? options.endpointBuilder(endpoint, params)
				: params.toString()
					? `${endpoint}?${params.toString()}`
					: endpoint;

			const response = await fetch(url, { credentials: 'include' });
			
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

	// Return writables directly so Svelte 5 `$items` auto-subscription works in templates.
	return { items, loading, error, loadItems };
}
