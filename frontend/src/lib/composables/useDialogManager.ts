/**
 * Composable for managing create/edit/delete dialog state
 * 
 * Eliminates duplication across admin CRUD pages
 * 
 * @example
 * ```typescript
 * const dialogs = useDialogManager();
 * // Use: dialogs.showCreate, dialogs.openCreate(), etc.
 * ```
 */

import { writable } from 'svelte/store';

export function useDialogManager() {
	const showCreate = writable(false);
	const showEdit = writable(false);
	const showDelete = writable(false);

	function openCreate() {
		showCreate.set(true);
		showEdit.set(false);
		showDelete.set(false);
	}

	function openEdit() {
		showEdit.set(true);
		showCreate.set(false);
		showDelete.set(false);
	}

	function openDelete() {
		showDelete.set(true);
		showCreate.set(false);
		showEdit.set(false);
	}

	function closeAll() {
		showCreate.set(false);
		showEdit.set(false);
		showDelete.set(false);
	}

	return {
		showCreate: {
			subscribe: showCreate.subscribe,
			set: showCreate.set
		},
		showEdit: {
			subscribe: showEdit.subscribe,
			set: showEdit.set
		},
		showDelete: {
			subscribe: showDelete.subscribe,
			set: showDelete.set
		},
		openCreate,
		openEdit,
		openDelete,
		closeAll
	};
}
