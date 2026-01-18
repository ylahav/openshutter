<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { AVAILABLE_ICON_NAMES } from '$lib/icons';
	import IconRenderer from './IconRenderer.svelte';

	export let value: string = '';
	export let placeholder: string = 'Select an icon...';

	const dispatch = createEventDispatcher();

	let isOpen = false;
	let sortedIcons = [...AVAILABLE_ICON_NAMES].sort();

	function toggle() {
		isOpen = !isOpen;
	}

	function close() {
		isOpen = false;
	}

	function selectIcon(iconName: string) {
		value = iconName;
		dispatch('change', { value: iconName });
		close();
	}

	function selectCustom() {
		value = 'custom';
		dispatch('change', { value: 'custom' });
		close();
	}

	function selectNone() {
		value = '';
		dispatch('change', { value: '' });
		close();
	}

	// Close on outside click
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		// Don't close if clicking inside the icon-selector or on a custom input field
		if (!target.closest('.icon-selector') && !target.closest('input[placeholder*="custom" i]')) {
			close();
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	$: displayValue = value === 'custom' ? 'Custom...' : value || placeholder;
	$: selectedIcon = value && value !== 'custom' ? value : null;
</script>

<div class="icon-selector relative">
	<!-- Current Selection Display -->
	<button
		type="button"
		on:click={toggle}
		class="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm text-left"
		aria-haspopup="listbox"
		aria-expanded={isOpen}
	>
		{#if selectedIcon}
			<div class="w-5 h-5 flex items-center justify-center text-gray-600 shrink-0">
				<IconRenderer icon={selectedIcon} />
			</div>
		{/if}
		<span class="flex-1 truncate {value ? 'text-gray-900' : 'text-gray-500'}">
			{displayValue}
		</span>
		<svg
			class={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Dropdown Menu -->
	{#if isOpen}
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-10"
			role="button"
			tabindex="-1"
			on:click={close}
			on:keydown={(e) => e.key === 'Escape' && close()}
		></div>

		<!-- Dropdown Menu -->
		<div class="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 max-h-96 overflow-y-auto">
			<ul class="py-1">
				<!-- None Option -->
				<li>
					<button
						type="button"
						on:click={selectNone}
						class="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm text-gray-700"
					>
						<span class="w-5 h-5"></span>
						<span>None</span>
					</button>
				</li>

				<!-- Divider -->
				<li class="border-t border-gray-200 my-1"></li>

				<!-- Available Icons -->
				{#each sortedIcons as iconName}
					{@const isSelected = value === iconName}
					<li>
						<button
							type="button"
							on:click={() => selectIcon(iconName)}
							class="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm {isSelected
								? 'bg-blue-50 text-blue-700'
								: 'text-gray-900'}"
						>
							<div class="w-5 h-5 flex items-center justify-center text-gray-600 shrink-0">
								<IconRenderer icon={iconName} />
							</div>
							<span class="flex-1">{iconName}</span>
							{#if isSelected}
								<svg class="w-4 h-4 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							{/if}
						</button>
					</li>
				{/each}

				<!-- Divider -->
				<li class="border-t border-gray-200 my-1"></li>

				<!-- Custom Option -->
				<li>
					<button
						type="button"
						on:click={selectCustom}
						class="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm {value === 'custom'
							? 'bg-blue-50 text-blue-700'
							: 'text-gray-900'}"
					>
						<span class="w-5 h-5 flex items-center justify-center text-gray-400 shrink-0">🎨</span>
						<span>Custom...</span>
						{#if value === 'custom'}
							<svg class="w-4 h-4 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
						{/if}
					</button>
				</li>
			</ul>
		</div>
	{/if}
</div>
