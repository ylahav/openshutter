/**
 * Composable for CRUD create, update, and delete operations
 * 
 * Eliminates duplication across admin CRUD pages by providing standardized
 * create, update, and delete operations with consistent error handling,
 * loading states, and success messaging.
 * 
 * @template T - The type of items being created/updated (defaults to `any`)
 * 
 * @param endpoint - The base API endpoint URL (e.g., '/api/admin/people')
 * @param options - Configuration options for payload transformation and callbacks
 * 
 * @returns An object containing:
 * - `create`: Function to create a new item
 * - `update`: Function to update an existing item
 * - `remove`: Function to delete an item
 * - `saving`: Svelte store indicating if an operation is in progress
 * - `error`: Svelte store containing error messages
 * - `message`: Svelte store containing success messages (auto-clears after 3s)
 * 
 * @example Basic usage
 * ```typescript
 * const crudOps = useCrudOperations('/api/admin/people', {
 *   createSuccessMessage: 'Person created successfully!',
 *   updateSuccessMessage: 'Person updated successfully!',
 *   deleteSuccessMessage: 'Person deleted successfully!'
 * });
 * 
 * // Create
 * const newPerson = await crudOps.create({ name: 'John Doe' });
 * 
 * // Update
 * await crudOps.update('person-id', { name: 'Jane Doe' });
 * 
 * // Delete
 * await crudOps.remove('person-id');
 * ```
 * 
 * @example With payload transformation
 * ```typescript
 * const crudOps = useCrudOperations('/api/admin/locations', {
 *   transformPayload: (data) => ({
 *     ...data,
 *     coordinates: {
 *       lat: parseFloat(data.lat),
 *       lng: parseFloat(data.lng)
 *     }
 *   })
 * });
 * ```
 * 
 * @example With callbacks
 * ```typescript
 * const crudOps = useCrudOperations('/api/admin/tags', {
 *   onCreateSuccess: (tag) => {
 *     // Reload list or update UI
 *     loadItems();
 *   },
 *   onUpdateSuccess: (tag) => {
 *     // Close edit dialog
 *     showEditDialog = false;
 *   },
 *   onDeleteSuccess: () => {
 *     // Reload list
 *     loadItems();
 *   }
 * });
 * ```
 */

import { writable } from 'svelte/store';
import { logger } from '../utils/logger';
import { handleError, handleApiErrorResponse } from '../utils/errorHandler';

export interface CrudOperationsOptions<T = any> {
	/** Transform function to modify payload before sending to API */
	transformPayload?: (data: any) => any;
	/** Transform function to modify response data after receiving from API */
	transformResponse?: (data: any) => T;
	/** Callback invoked when create operation succeeds */
	onCreateSuccess?: (item: T) => void;
	/** Callback invoked when update operation succeeds */
	onUpdateSuccess?: (item: T) => void;
	/** Callback invoked when delete operation succeeds */
	onDeleteSuccess?: () => void;
	/** Custom success message displayed after successful create (defaults to 'Item created successfully!') */
	createSuccessMessage?: string;
	/** Custom success message displayed after successful update (defaults to 'Item updated successfully!') */
	updateSuccessMessage?: string;
	/** Custom success message displayed after successful delete (defaults to 'Item deleted successfully!') */
	deleteSuccessMessage?: string;
}

export function useCrudOperations<T = any>(
	endpoint: string,
	options: CrudOperationsOptions<T> = {}
) {
	const saving = writable(false);
	const error = writable('');
	const message = writable('');

	/**
	 * Creates a new item via POST request
	 * 
	 * @param data - The data to send in the request body
	 * @returns The created item, or `null` if creation failed
	 * 
	 * @example
	 * ```typescript
	 * const newItem = await create({ name: 'New Item' });
	 * if (newItem) {
	 *   console.log('Created:', newItem);
	 * }
	 * ```
	 */
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

	/**
	 * Updates an existing item via PUT request
	 * 
	 * @param id - The ID of the item to update
	 * @param data - The data to send in the request body
	 * @returns The updated item, or `null` if update failed
	 * 
	 * @example
	 * ```typescript
	 * const updatedItem = await update('item-id', { name: 'Updated Name' });
	 * if (updatedItem) {
	 *   console.log('Updated:', updatedItem);
	 * }
	 * ```
	 */
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

	/**
	 * Deletes an item via DELETE request
	 * 
	 * @param id - The ID of the item to delete
	 * @returns `true` if deletion succeeded, `false` otherwise
	 * 
	 * @example
	 * ```typescript
	 * const success = await remove('item-id');
	 * if (success) {
	 *   console.log('Item deleted');
	 * }
	 * ```
	 */
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
