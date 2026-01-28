<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { activeTemplate } from '$stores/template';
	import { siteConfigData, siteConfig } from '$stores/siteConfig';
	import { auth } from '$lib/stores/auth';
	import { logger } from '$lib/utils/logger';
	import { handleApiErrorResponse } from '$lib/utils/errorHandler';

	interface TemplateConfig {
		templateName: string;
		displayName: string;
		description?: string;
		category: string;
	}

	// Static template list (since templates are defined statically in backend)
	// Note: 'default' is excluded as it's a fallback and duplicates 'minimal'
	const AVAILABLE_TEMPLATES: TemplateConfig[] = [
		{ templateName: 'minimal', displayName: 'Minimal', description: 'Ultra-minimal and clean design', category: 'minimal' },
		{ templateName: 'modern', displayName: 'Modern', description: 'Contemporary and sleek design', category: 'modern' },
		{ templateName: 'elegant', displayName: 'Elegant', description: 'Elegant and sophisticated design', category: 'elegant' }
	];

	export let className = '';
	export let compact = false;

	let isOpen = false;
	let isSwitching = false;
	let buttonElement: HTMLButtonElement | null = null;
	let dropdownStyle = '';

	$: currentTemplateName = $activeTemplate;
	// If current template is 'default', show it as 'Minimal' since they're essentially the same
	$: displayTemplateName = currentTemplateName === 'default' ? 'minimal' : currentTemplateName;
	$: currentTemplate = AVAILABLE_TEMPLATES.find((t) => t.templateName === displayTemplateName) || AVAILABLE_TEMPLATES[0];
	$: isAdmin = $auth.authenticated && $auth.user?.role === 'admin';

	async function handleTemplateSelect(templateName: string) {
		if (templateName === currentTemplateName || isSwitching) {
			return;
		}

		isSwitching = true;
		isOpen = false;

		try {
			if (isAdmin) {
				// Admin users: update site config (global change)
				const response = await fetch('/api/admin/site-config', {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						template: {
							activeTemplate: templateName
						}
					})
				});

				if (response.ok) {
					// Reload site config to reflect the change
					await siteConfig.load();
					// Reload page to apply new template
					window.location.reload();
				} else {
					await handleApiErrorResponse(response);
					isSwitching = false;
				}
			} else {
				// Non-admin users: store in localStorage (client-side only)
				localStorage.setItem('preferredTemplate', templateName);
				// Reload page to apply new template (needed because template components are loaded at build time)
				window.location.reload();
			}
		} catch (err) {
			logger.error('Error switching template:', err);
			isSwitching = false;
		}
	}

	function toggle() {
		isOpen = !isOpen;
		if (isOpen && buttonElement) {
			updateDropdownPosition();
		}
	}

	function close() {
		isOpen = false;
	}

	function updateDropdownPosition() {
		if (!buttonElement) return;
		const rect = buttonElement.getBoundingClientRect();
		const dropdownWidth = 256; // w-64 = 16rem = 256px
		const dropdownHeight = 250; // approximate height
		const right = window.innerWidth - rect.right;
		let top = rect.bottom + 4; // mt-1 = 4px
		
		// If dropdown would go off bottom of screen, position it above the button
		if (top + dropdownHeight > window.innerHeight && rect.top > dropdownHeight) {
			top = rect.top - dropdownHeight - 4;
		}
		
		dropdownStyle = `position: fixed; top: ${top}px; right: ${right}px; width: ${dropdownWidth}px; z-index: 9999;`;
	}

	$: if (isOpen) {
		updateDropdownPosition();
	}

	let resizeHandler: (() => void) | null = null;

	onMount(() => {
		resizeHandler = () => {
			if (isOpen) {
				updateDropdownPosition();
			}
		};
		window.addEventListener('resize', resizeHandler);
		window.addEventListener('scroll', resizeHandler, true);
	});

	onDestroy(() => {
		if (resizeHandler) {
			window.removeEventListener('resize', resizeHandler);
			window.removeEventListener('scroll', resizeHandler, true);
		}
	});

	function getCategoryColor(category: string): string {
		const colors: Record<string, string> = {
			minimal: 'bg-gray-100 text-gray-800',
			modern: 'bg-blue-100 text-blue-800',
			elegant: 'bg-purple-100 text-purple-800',
			custom: 'bg-indigo-100 text-indigo-800'
		};
		return colors[category] || 'bg-gray-100 text-gray-800';
	}
</script>

<div class={`relative ${className}`}>
	<!-- Current Template Display -->
	<button
		bind:this={buttonElement}
		type="button"
		on:click={toggle}
		disabled={isSwitching}
		class={`
          flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm
          bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors text-gray-900
          ${compact ? 'text-sm' : 'text-base'}
          ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}
        `}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		title="Switch template"
	>
		<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
			/>
		</svg>

		<span class="font-medium text-gray-900">
			{currentTemplate.displayName}
		</span>

		{#if isAdmin}
			<span class="text-xs text-gray-500 bg-gray-100 px-1 rounded">Admin</span>
		{/if}

		<svg
			class={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Template Dropdown -->
	{#if isOpen}
		<!-- Backdrop -->
		<div
			class="fixed inset-0"
			style="z-index: 9998;"
			role="button"
			tabindex="-1"
			on:click={close}
			on:keydown={(e) => e.key === 'Escape' && close()}
		></div>

		<!-- Dropdown Menu -->
		<div class="bg-white border border-gray-200 rounded-md shadow-lg" style={dropdownStyle}>
			<div class="py-1">
				<div class="px-4 py-2 border-b border-gray-200">
					<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Templates</p>
					{#if isAdmin}
						<p class="text-xs text-gray-400 mt-1">Changes apply globally</p>
					{:else}
						<p class="text-xs text-gray-400 mt-1">Changes apply to your view only</p>
					{/if}
				</div>
				<ul class="py-1">
					{#each AVAILABLE_TEMPLATES as template}
						{@const isSelected = template.templateName === displayTemplateName || (currentTemplateName === 'default' && template.templateName === 'minimal')}

						<li>
							<button
								type="button"
								on:click={() => handleTemplateSelect(template.templateName)}
								disabled={isSwitching}
								class={`
                          w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50
                          transition-colors
                          ${isSelected ? 'bg-blue-50' : ''}
                          ${compact ? 'text-sm' : 'text-base'}
                          ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
							>
								<div class="flex-1 min-w-0">
									<div class="flex items-center justify-between mb-1">
										<span class={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
											{template.displayName}
										</span>
										<span class={`text-xs px-2 py-0.5 rounded ${getCategoryColor(template.category)}`}>
											{template.category}
										</span>
									</div>
									{#if template.description}
										<p class="text-xs text-gray-500 line-clamp-1">
											{template.description}
										</p>
									{/if}
								</div>

								{#if isSelected}
									<svg class="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
				</ul>
			</div>
		</div>
	{/if}
</div>
