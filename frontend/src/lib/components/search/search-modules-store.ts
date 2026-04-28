import { writable } from 'svelte/store';

export interface SearchModuleFilters {
	albumId: string | null;
	tags: string[];
	people: string[];
	locationIds: string[];
	dateFrom: string;
	dateTo: string;
	sortOrder: 'asc' | 'desc';
}

export interface SearchModuleState {
	query: string;
	filters: SearchModuleFilters;
}

export const defaultSearchModuleFilters = (): SearchModuleFilters => ({
	albumId: null,
	tags: [],
	people: [],
	locationIds: [],
	dateFrom: '',
	dateTo: '',
	sortOrder: 'desc'
});

export const searchModulesState = writable<SearchModuleState>({
	query: '',
	filters: defaultSearchModuleFilters()
});

export function hasActiveSearchFilters(filters: SearchModuleFilters): boolean {
	return !!(
		filters.albumId ||
		filters.tags.length > 0 ||
		filters.people.length > 0 ||
		filters.locationIds.length > 0 ||
		filters.dateFrom ||
		filters.dateTo
	);
}
