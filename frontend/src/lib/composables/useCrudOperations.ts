/**
 * Composable for CRUD create, update, and delete operations
 * 
 * Eliminates duplication across admin CRUD pages
 * 
 * @example
 * ```typescript
 * const { create, update, remove, saving, error, message } = useCrudOperations('/api/admin/people', {
 *   onSuccess: (item) => {
 *     // Custom success handling
 *   }
 * });
 * ```
 */

import { writable } from 'svelte/store';
import { logger } from '../utils/logger';
import { handleError, handleApiErrorResponse } from '../utils/errorHandler';

export interface CrudOperationsOptions<T = any> {
	/** Transform function for create/update payload */
	transformPayload?: (data: any) => any;
	/** Transform function for response data */
	transformResponse?: (data: any) => T;
	/** Callback on successful create */
	onCreateSuccess?: (item: T) => void;
	/** Callback on successful update */
	onUpdateSuccess?: (item: T) => void;
	/** Callback on successful delete */
	onDeleteSuccess?: () => void;
	/** Custom success message for create */
	createSuccessMessage?: string;
	/** Custom success message for update */
	updateSuccessMessage?: string;
	/** Custom success message for delete */
	deleteSuccessMessage?: string;
}

export function useCrudOperations<T = any>(
	endpoint: string,
	options: CrudOperationsOptions<T> = {}
) {
	const saving = writable(false);
	const error = writable('');
	const message = writable('');

	async function create(data: any): Promise<T | null> {
		saving.set(true);
		error.set('');
		message.set('');

		try {
			const payload = options.transformPayload ? options.transformPayload(data) : data;

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const responseData = await response.json();

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			const newItem = options.transformResponse
				? options.transformResponse(responseData.data || responseData)
				: (responseData.data || responseData);

			const successMsg = options.createSuccessMessage || 'Item created successfully!';
			message.set(successMsg);

			if (options.onCreateSuccess) {
				options.onCreateSuccess(newItem);
			}

			// Auto-clear message after 3 seconds
			setTimeout(() => {
				message.set('');
			}, 3000);

			return newItem;
		} catch (err) {
			logger.error(`Error creating item at ${endpoint}:`, err);
			error.set(handleError(err, 'Failed to create item'));
			return null;
		} finally {
			saving.set(false);
		}
	}

	async function update(id: string, data: any): Promise<T | null> {
		saving.set(true);
		error.set('');
		message.set('');

		try {
			const payload = options.transformPayload ? options.transformPayload(data) : data;

			const response = await fetch(`${endpoint}/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const responseData = await response.json();

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			const updatedItem = options.transformResponse
				? options.transformResponse(responseData.data || responseData)
				: (responseData.data || responseData);

			const successMsg = options.updateSuccessMessage || 'Item updated successfully!';
			message.set(successMsg);

			if (options.onUpdateSuccess) {
				options.onUpdateSuccess(updatedItem);
			}

			// Auto-clear message after 3 seconds
			setTimeout(() => {
				message.set('');
			}, 3000);

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
				method: 'DELETE'
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const successMsg = options.deleteSuccessMessage || 'Item deleted successfully!';
			message.set(successMsg);

			if (options.onDeleteSuccess) {
				options.onDeleteSuccess();
			}

			// Auto-clear message after 3 seconds
			setTimeout(() => {
				message.set('');
			}, 3000);

			return true;
		} catch (err) {
			logger.error(`Error deleting item at ${endpoint}/${id}:`, err);
			error.set(handleError(err, 'Failed to delete item'));
			return false;
		} finally {
			saving.set(false);
		}
	}

	return {
		create,
		update,
		remove,
		saving: {
			subscribe: saving.subscribe,
			set: saving.set
		},
		error: {
			subscribe: error.subscribe,
			set: error.set
		},
		message: {
			subscribe: message.subscribe,
			set: message.set
		}
	};
}
