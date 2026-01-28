/**
 * Composable for managing create/edit/delete dialog state
 * 
 * Eliminates duplication across admin CRUD pages by providing a standardized
 * way to manage dialog visibility states. Ensures only one dialog is open at a time.
 * 
 * @returns An object containing:
 * - `showCreate`: Svelte store indicating if create dialog is visible
 * - `showEdit`: Svelte store indicating if edit dialog is visible
 * - `showDelete`: Svelte store indicating if delete dialog is visible
 * - `openCreate()`: Function to open create dialog and close others
 * - `openEdit()`: Function to open edit dialog and close others
 * - `openDelete()`: Function to open delete dialog and close others
 * - `closeAll()`: Function to close all dialogs
 * 
 * @example Basic usage
 * ```typescript
 * const dialogs = useDialogManager();
 * 
 * // In component
 * $: showCreateDialog = $dialogs.showCreate;
 * 
 * // Open create dialog
 * dialogs.openCreate();
 * 
 * // Close all dialogs
 * dialogs.closeAll();
 * ```
 * 
 * @example In template
 * ```svelte
 * <script>
 *   const dialogs = useDialogManager();
 * </script>
 * 
 * {#if $dialogs.showCreate}
 *   <CreateDialog on:close={dialogs.closeAll} />
 * {/if}
 * 
 * {#if $dialogs.showEdit}
 *   <EditDialog on:close={dialogs.closeAll} />
 * {/if}
 * 
 * {#if $dialogs.showDelete}
 *   <DeleteDialog on:close={dialogs.closeAll} />
 * {/if}
 * ```
 */

import { writable } from 'svelte/store';

export function useDialogManager() {
	const showCreate = writable(false);
	const showEdit = writable(false);
	const showDelete = writable(false);

	/**
	 * Opens the create dialog and closes all other dialogs
	 */
	function openCreate() {
		showCreate.set(true);
		showEdit.set(false);
		showDelete.set(false);
	}

	/**
	 * Opens the edit dialog and closes all other dialogs
	 */
	function openEdit() {
		showEdit.set(true);
		showCreate.set(false);
		showDelete.set(false);
	}

	/**
	 * Opens the delete dialog and closes all other dialogs
	 */
	function openDelete() {
		showDelete.set(true);
		showCreate.set(false);
		showEdit.set(false);
	}

	/**
	 * Closes all dialogs
	 */
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
