import { writable } from 'svelte/store';
import { logger } from '../utils/logger';
import { handleError, handleApiErrorResponse } from '../utils/errorHandler';

export interface CrudOperationsOptions<T = unknown> {
	transformPayload?: (data: Partial<T> & Record<string, unknown>) => unknown;
	transformResponse?: (data: unknown) => T;
	onCreateSuccess?: (item: T) => void;
	onUpdateSuccess?: (item: T) => void;
	onDeleteSuccess?: () => void;
	createSuccessMessage?: string;
	updateSuccessMessage?: string;
	deleteSuccessMessage?: string;
}

export function useCrudOperations<T = unknown>(
	endpoint: string,
	options: CrudOperationsOptions<T> = {}
) {
	const saving = writable(false);
	const error = writable('');
	const message = writable('');

	async function create(data: Partial<T> & Record<string, unknown>): Promise<T | null> {
		saving.set(true);
		error.set('');
		message.set('');

		try {
			const payload = options.transformPayload ? options.transformPayload(data) : data;

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload)
			});

			if (!response.ok) await handleApiErrorResponse(response);

			const responseData = await response.json();
			if (!responseData) throw new Error('No data returned from server');

			const newItem = options.transformResponse
				? options.transformResponse(responseData.data || responseData)
				: (responseData.data || responseData);

			message.set(options.createSuccessMessage || 'Item created successfully!');
			options.onCreateSuccess?.(newItem);
			setTimeout(() => message.set(''), 3000);
			return newItem;
		} catch (err) {
			logger.error(`Error creating item at ${endpoint}:`, err);
			error.set(handleError(err, 'Failed to create item'));
			return null;
		} finally {
			saving.set(false);
		}
	}

	async function update(id: string, data: Partial<T> & Record<string, unknown>): Promise<T | null> {
		saving.set(true);
		error.set('');
		message.set('');

		try {
			const payload = options.transformPayload ? options.transformPayload(data) : data;

			const response = await fetch(`${endpoint}/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload)
			});

			if (!response.ok) await handleApiErrorResponse(response);

			const responseData = await response.json();
			if (!responseData) throw new Error('No data returned from server');

			const updatedItem = options.transformResponse
				? options.transformResponse(responseData.data || responseData)
				: (responseData.data || responseData);

			message.set(options.updateSuccessMessage || 'Item updated successfully!');
			options.onUpdateSuccess?.(updatedItem);
			setTimeout(() => message.set(''), 3000);
			return updatedItem;
		} catch (err) {
			logger.error(`Error updating item at ${endpoint}/${id}:`, err);
			error.set(handleError(err, 'Failed to update item'));
			return null;
		} finally {
			saving.set(false);
		}
	}

	async function remove(id: string): Promise<boolean> {
		saving.set(true);
		error.set('');
		message.set('');

		try {
			const response = await fetch(`${endpoint}/${id}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) await handleApiErrorResponse(response);

			message.set(options.deleteSuccessMessage || 'Item deleted successfully!');
			options.onDeleteSuccess?.();
			setTimeout(() => message.set(''), 3000);
			return true;
		} catch (err) {
			logger.error(`Error deleting item at ${endpoint}/${id}:`, err);
			error.set(handleError(err, 'Failed to delete item'));
			return false;
		} finally {
			saving.set(false);
		}
	}

	return { create, update, remove, saving, error, message };
}
