import { writable } from 'svelte/store';
import { logger } from '../utils/logger';
import { handleError, handleApiErrorResponse } from '../utils/errorHandler';

export interface CrudLoaderOptions<T = unknown> {
	searchParam?: string;
	searchValue?: () => string;
	filterParams?: Record<string, () => string | undefined>;
	endpointBuilder?: (baseEndpoint: string, params: URLSearchParams) => string;
	transform?: (data: T[]) => T[];
	pagination?: {
		page: number;
		limit: number;
		getPage?: () => number;
		getLimit?: () => number;
		params?: { page?: string; limit?: string };
	};
}

export function useCrudLoader<T = unknown>(
	endpoint: string,
	options: CrudLoaderOptions<T> = {}
) {
	const items = writable<T[]>([]);
	const loading = writable(false);
	const error = writable('');

	async function loadItems() {
		loading.set(true);
		error.set('');

		try {
			const params = new URLSearchParams();

			if (options.searchParam && options.searchValue) {
				const searchValue = options.searchValue();
				if (searchValue) params.append(options.searchParam, searchValue);
			}

			if (options.filterParams) {
				for (const [key, getValue] of Object.entries(options.filterParams)) {
					const value = getValue();
					if (value && value !== 'all') params.append(key, value);
				}
			}

			if (options.pagination) {
				const pageParam = options.pagination.params?.page || 'page';
				const limitParam = options.pagination.params?.limit || 'limit';
				const currentPage = options.pagination.getPage?.() ?? options.pagination.page;
				const currentLimit = options.pagination.getLimit?.() ?? options.pagination.limit;
				params.append(pageParam, currentPage.toString());
				params.append(limitParam, currentLimit.toString());
			}

			const url = options.endpointBuilder
				? options.endpointBuilder(endpoint, params)
				: `${endpoint}?${params.toString()}`;

			const response = await fetch(url, { credentials: 'include' });
			if (!response.ok) await handleApiErrorResponse(response);

			const result = await response.json();
			let dataArray: T[] = [];
			if (Array.isArray(result)) {
				dataArray = result;
			} else if (result && Array.isArray(result.data)) {
				dataArray = result.data;
			} else if (result && typeof result === 'object') {
				if (result.error || result.success === false) {
					throw new Error(result.error || result.message || 'Failed to fetch data');
				}
			}

			items.set(options.transform ? options.transform(dataArray) : dataArray);
		} catch (err) {
			logger.error(`Error loading data from ${endpoint}:`, err);
			error.set(handleError(err, 'Failed to load data'));
			items.set([]);
		} finally {
			loading.set(false);
		}
	}

	return { items, loading, error, loadItems };
}
