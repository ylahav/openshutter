<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let isOpen = false;
	export let suggestions: Array<{
		label: string;
		confidence: number;
		category?: string;
		matchedTag?: {
			id: string;
			name: string;
		};
		isNewTag: boolean;
		source?: string;
		reason?: string;
	}> = [];
	export let loading = false;
	export let error: string | null = null;
	export let provider: string = 'local';
	export let processingTime: number = 0;

	const dispatch = createEventDispatcher();

	let selectedSuggestions: Set<string> = new Set();

	function handleClose() {
		selectedSuggestions.clear();
		dispatch('close');
	}

	function toggleSuggestion(label: string) {
		if (selectedSuggestions.has(label)) {
			selectedSuggestions.delete(label);
		} else {
			selectedSuggestions.add(label);
		}
		selectedSuggestions = selectedSuggestions; // Trigger reactivity
	}

	function handleApply() {
		const selected = suggestions.filter((s) => selectedSuggestions.has(s.label));
		dispatch('apply', { detail: selected });
		selectedSuggestions.clear();
	}

	function formatConfidence(confidence: number): string {
		return `${Math.round(confidence * 100)}%`;
	}

	function getCategoryColor(category?: string): string {
		const colors: Record<string, string> = {
			object: 'bg-blue-100 text-blue-800',
			location: 'bg-green-100 text-green-800',
			event: 'bg-purple-100 text-purple-800',
			mood: 'bg-yellow-100 text-yellow-800',
			technical: 'bg-gray-100 text-gray-800',
			general: 'bg-gray-100 text-gray-800',
		};
		return colors[category || 'general'] || colors.general;
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={handleClose}>
		<div
			class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
			on:click|stopPropagation
		>
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-lg font-semibold">{provider === 'context' ? 'Context-Based Tag Suggestions' : 'AI Tag Suggestions'}</h3>
				<button
					type="button"
					on:click={handleClose}
					class="text-gray-400 hover:text-gray-600 focus:outline-none"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			{#if loading}
				<div class="flex-1 flex items-center justify-center py-8">
					<div class="text-center">
						<svg
							class="animate-spin h-8 w-8 text-purple-600 mx-auto mb-4"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						<p class="text-gray-600">Analyzing photo...</p>
					</div>
				</div>
			{:else if error}
				<div class="flex-1 flex items-center justify-center py-8">
					<div class="text-center">
						<svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p class="text-red-600 font-medium mb-2">Error</p>
						<p class="text-gray-600 text-sm">{error}</p>
					</div>
				</div>
			{:else if suggestions.length === 0}
				<div class="flex-1 flex items-center justify-center py-8">
					<div class="text-center">
						<svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p class="text-gray-600">No tag suggestions found</p>
					</div>
				</div>
			{:else}
				<div class="mb-4 text-sm text-gray-600">
					<p>
						Found {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'} using{' '}
						<span class="font-medium">{provider}</span>
						{#if processingTime > 0}
							<span class="text-gray-500"> ({processingTime}ms)</span>
						{/if}
					</p>
					<p class="text-xs text-gray-500 mt-1">
						{#if provider === 'context'}
							Tags suggested from similar photos, IPTC keywords, location, and patterns.
						{:else}
							Select the tags you want to apply. Tags marked as "new" will be created.
						{/if}
					</p>
				</div>

				<div class="flex-1 overflow-y-auto border border-gray-200 rounded-md p-4 mb-4 min-h-[200px]">
					<div class="space-y-2">
						{#each suggestions as suggestion}
							{@const isSelected = selectedSuggestions.has(suggestion.label)}
							<label
								class="flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors {isSelected
									? 'bg-purple-50 border-purple-300'
									: 'bg-white border-gray-200 hover:bg-gray-50'}"
							>
								<input
									type="checkbox"
									checked={isSelected}
									on:change={() => toggleSuggestion(suggestion.label)}
									class="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
								/>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1">
										<span class="font-medium text-gray-900">{suggestion.label}</span>
										{#if suggestion.matchedTag}
											<span class="text-xs text-blue-600">(matches: {suggestion.matchedTag.name})</span>
										{:else if suggestion.isNewTag}
											<span class="text-xs text-purple-600 font-medium">(new tag)</span>
										{/if}
									</div>
									<div class="flex items-center gap-2 flex-wrap">
										{#if suggestion.category}
											<span class="text-xs px-2 py-0.5 rounded {getCategoryColor(suggestion.category)}">
												{suggestion.category}
											</span>
										{/if}
										{#if suggestion.source}
											<span class="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
												{suggestion.source}
											</span>
										{/if}
										<span class="text-xs text-gray-500">
											Confidence: {formatConfidence(suggestion.confidence)}
										</span>
									</div>
									{#if suggestion.reason}
										<p class="text-xs text-gray-400 mt-1">{suggestion.reason}</p>
									{/if}
								</div>
							</label>
						{/each}
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-4 border-t border-gray-200">
					<button
						type="button"
						on:click={handleClose}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleApply}
						disabled={selectedSuggestions.size === 0}
						class="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Apply {selectedSuggestions.size > 0 ? `(${selectedSuggestions.size})` : ''}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
