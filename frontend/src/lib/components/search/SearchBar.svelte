<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { t } from '$stores/i18n';

	export let query = '';
	export let loading = false;
	export let placeholder = '';
	
	$: displayPlaceholder = placeholder || $t('search.placeholder');

	const dispatch = createEventDispatcher();

	let inputValue = query;
	let isFocused = false;

	$: if (query !== inputValue && !isFocused) {
		inputValue = query;
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		dispatch('search', inputValue.trim());
	}

	function handleClear() {
		inputValue = '';
		dispatch('search', '');
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			(e.target as HTMLInputElement)?.blur();
		}
	}
</script>

<form on:submit={handleSubmit} class="relative">
	<div class="relative">
		<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
			<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
		</div>

		<input
			type="text"
			bind:value={inputValue}
			on:focus={() => (isFocused = true)}
			on:blur={() => (isFocused = false)}
			on:keydown={handleKeyDown}
			placeholder={displayPlaceholder}
			disabled={loading}
			class="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:opacity-50"
		/>

		{#if inputValue && !loading}
			<div class="absolute inset-y-0 right-0 pr-3 flex items-center">
				<button
					type="button"
					on:click={handleClear}
					class="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
					disabled={loading}
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		{/if}

		{#if loading}
			<div class="absolute inset-y-0 right-0 pr-3 flex items-center">
				<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
			</div>
		{/if}
	</div>
</form>
