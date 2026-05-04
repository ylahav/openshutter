<script lang="ts">
	export let exportLabel: string;
	export let importLabel: string;
	export let disabled = false;
	export let busy = false;
	let fileInput: HTMLInputElement;

	export let onExport: () => void | Promise<void> = async () => {};
	export let onImportFile: (file: File) => void | Promise<void> = async () => {};

	async function onFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (file) await onImportFile(file);
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<button
		type="button"
		class="px-3 py-2 text-sm font-medium rounded-md border border-surface-300-700 bg-(--color-surface-50-950) text-(--color-surface-800-200) hover:bg-(--color-surface-100-900) disabled:opacity-50"
		disabled={disabled || busy}
		on:click={() => onExport()}
	>
		{exportLabel}
	</button>
	<button
		type="button"
		class="px-3 py-2 text-sm font-medium rounded-md border border-surface-300-700 bg-(--color-surface-50-950) text-(--color-surface-800-200) hover:bg-(--color-surface-100-900) disabled:opacity-50"
		disabled={disabled || busy}
		on:click={() => fileInput?.click()}
	>
		{importLabel}
	</button>
	<input
		bind:this={fileInput}
		type="file"
		accept="application/json,.json"
		class="sr-only"
		on:change={onFileChange}
	/>
</div>
