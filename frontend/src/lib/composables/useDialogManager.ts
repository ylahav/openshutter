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

	return { showCreate, showEdit, showDelete, openCreate, openEdit, openDelete, closeAll };
}
