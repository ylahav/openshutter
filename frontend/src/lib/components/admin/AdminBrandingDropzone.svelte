<script lang="ts">
	/** Styled drop / click target for logo or favicon uploads (replaces native file input UI). */
	export let accept: string;
	export let onFile: (file: File) => void | Promise<void>;
	export let hint: string;
	/** Optional second line (e.g. accepted formats); omit to hide */
	export let formatsHint = '';
	export let previewUrl: string | undefined = undefined;
	/** Wider preview for logos; compact square for favicons */
	export let previewVariant: 'logo' | 'favicon' = 'logo';

	let dragDepth = 0;
	let inputEl: HTMLInputElement;

	$: dragActive = dragDepth > 0;

	function triggerPick() {
		inputEl?.click();
	}

	function handleInput(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		(e.currentTarget as HTMLInputElement).value = '';
		if (f) void onFile(f);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragDepth = 0;
		const f = e.dataTransfer?.files?.[0];
		if (f) void onFile(f);
	}
</script>

<div class="space-y-2">
	<input
		bind:this={inputEl}
		type="file"
		class="sr-only"
		{accept}
		aria-hidden="true"
		tabindex={-1}
		on:change={handleInput}
	/>
	<button
		type="button"
		class="group relative flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-primary-500) focus-visible:ring-offset-2 {dragActive
			? 'border-(--color-primary-500) bg-[color-mix(in_oklab,var(--color-primary-500)_10%,transparent)]'
			: 'border-(--color-surface-300-600) bg-[color-mix(in_oklab,var(--color-surface-950)_4%,transparent)] hover:border-(--color-primary-400) hover:bg-[color-mix(in_oklab,var(--color-primary-500)_6%,transparent)]'}"
		aria-label={hint}
		on:click={triggerPick}
		on:keydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				triggerPick();
			}
		}}
		on:dragenter={(e) => {
			e.preventDefault();
			dragDepth += 1;
		}}
		on:dragleave={() => {
			dragDepth = Math.max(0, dragDepth - 1);
		}}
		on:dragover={(e) => e.preventDefault()}
		on:drop={handleDrop}
	>
		{#if previewUrl}
			<img
				src={previewUrl}
				alt=""
				class="{previewVariant === 'favicon'
					? 'h-14 w-14'
					: 'max-h-20 max-w-[min(100%,240px)]'} shrink-0 rounded-md border border-surface-200-800 bg-(--color-surface-50-950) object-contain p-2"
				on:error={(e) => {
					(e.currentTarget as HTMLImageElement).style.display = 'none';
				}}
			/>
		{:else}
			<svg
				class="h-10 w-10 text-(--color-surface-400-500)"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
		{/if}
		<div class="max-w-sm space-y-1">
			<p class="text-sm font-medium text-(--color-surface-800-200)">{hint}</p>
			{#if formatsHint}
				<p class="text-xs text-(--color-surface-500-500)">{formatsHint}</p>
			{/if}
		</div>
	</button>
</div>
