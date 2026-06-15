<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title = '',
		maxWidthClass = 'max-w-md',
		dialogId = '',
		children
	}: {
		title?: string;
		maxWidthClass?: string;
		/** For hooks.client.ts data-open-dialog fallback. */
		dialogId?: string;
		children?: Snippet;
	} = $props();

	let dialogEl = $state<HTMLDialogElement | undefined>();

	export function open() {
		dialogEl?.showModal();
	}

	export function close() {
		dialogEl?.close();
	}
</script>

<dialog
	id={dialogId || undefined}
	bind:this={dialogEl}
	class="admin-crud-dialog m-0 w-full max-w-none border-0 bg-transparent p-4 backdrop:bg-black/50 open:flex open:items-center open:justify-center fixed inset-0 h-full max-h-none"
	oncancel={(e) => e.preventDefault()}
>
	<div
		class="card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl w-full {maxWidthClass} p-6 max-h-[90vh] overflow-y-auto"
	>
		{#if title}
			<h2 class="text-xl font-bold text-(--color-surface-950-50) mb-4">{title}</h2>
		{/if}
		{@render children?.()}
	</div>
</dialog>
