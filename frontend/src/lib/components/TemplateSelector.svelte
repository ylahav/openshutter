<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { activeTemplate } from '$stores/template';
	import { siteConfigData } from '$stores/siteConfig';
	import { auth } from '$lib/stores/auth';
	import { logger } from '$lib/utils/logger';
	import { applyThemeById } from '$lib/services/apply-theme';

	interface ThemeOption {
		id: string;
		baseTemplate: string;
		displayName: string;
		description?: string;
		category: string;
	}

	export let className = '';
	export let compact = false;

	let themeOptions: ThemeOption[] = [];
	let themesLoading = true;
	let themesError = '';

	let isOpen = false;
	let isSwitching = false;
	let buttonElement: HTMLButtonElement | null = null;
	let dropdownStyle = '';

	$: liveThemeId = $siteConfigData?.template?.activeThemeId ?? null;
	$: activePack = $activeTemplate;
	$: isAdmin = $auth.authenticated && $auth.user?.role === 'admin';

	$: selectedThemeId = (() => {
		if (!browser || themeOptions.length === 0) return null;
		if (isAdmin) {
			if (liveThemeId && themeOptions.some((t) => t.id === liveThemeId)) return liveThemeId;
			const matches = themeOptions.filter((t) => t.baseTemplate === activePack);
			if (matches.length >= 1) return matches[0].id;
			return themeOptions[0].id;
		}
		const pref = localStorage.getItem('preferredThemeId');
		if (pref && themeOptions.some((t) => t.id === pref)) return pref;
		if (liveThemeId && themeOptions.some((t) => t.id === liveThemeId)) {
			const row = themeOptions.find((x) => x.id === liveThemeId);
			if (row?.baseTemplate === activePack) return liveThemeId;
		}
		const matches = themeOptions.filter((t) => t.baseTemplate === activePack);
		if (matches.length >= 1) return matches[0].id;
		return themeOptions[0]?.id ?? null;
	})();

	$: currentTemplate =
		(themeOptions.find((t) => t.id === selectedThemeId) ||
			themeOptions.find((t) => t.baseTemplate === activePack) ||
			themeOptions[0] || {
				id: '',
				baseTemplate: activePack,
				displayName: themesLoading ? 'Loading…' : themesError ? 'Themes unavailable' : 'Theme',
				description: undefined,
				category: activePack
			}) satisfies ThemeOption;

	async function loadThemes() {
		themesLoading = true;
		themesError = '';
		try {
			let res = await fetch('/api/admin/themes', { credentials: 'include' });
			if (res.status === 401 || res.status === 403) {
				res = await fetch('/api/themes');
			}
			if (!res.ok) {
				throw new Error(`Failed to load themes (${res.status})`);
			}
			const result = await res.json();
			const raw = Array.isArray(result) ? result : result.data || [];
			const order = ['default', 'modern', 'elegant', 'minimal'];
			const sorted = [...raw].sort((a: any, b: any) => {
				const aIdx = a.isBuiltIn ? order.indexOf(a.baseTemplate) : -1;
				const bIdx = b.isBuiltIn ? order.indexOf(b.baseTemplate) : -1;
				if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
				if (aIdx >= 0) return -1;
				if (bIdx >= 0) return 1;
				return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
			});
			themeOptions = sorted.map((t: any) => ({
				id: String(t._id),
				baseTemplate: t.baseTemplate || 'modern',
				displayName: typeof t.name === 'string' && t.name.trim() ? t.name.trim() : t.baseTemplate || 'Theme',
				description: typeof t.description === 'string' ? t.description : undefined,
				category: t.isBuiltIn ? t.baseTemplate || 'custom' : 'custom'
			}));
		} catch (e) {
			themesError = e instanceof Error ? e.message : 'Failed to load themes';
			themeOptions = [];
			logger.error('Template themes load failed:', e);
		} finally {
			themesLoading = false;
		}
	}

	async function handleTemplateSelect(theme: ThemeOption) {
		if (theme.id === selectedThemeId || isSwitching || !theme.id) {
			return;
		}

		isSwitching = true;
		isOpen = false;

		try {
			if (isAdmin) {
				const result = await applyThemeById(theme.id);
				if (result.ok) {
					window.location.reload();
				} else {
					logger.error('Template switch failed:', result.error);
					isSwitching = false;
				}
			} else {
				localStorage.setItem('preferredTemplate', theme.baseTemplate);
				localStorage.setItem('preferredThemeId', theme.id);
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
		const dropdownWidth = 256;
		const dropdownHeight = 250;
		const right = window.innerWidth - rect.right;
		let top = rect.bottom + 4;

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
		loadThemes();
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
			default: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
			minimal: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
			modern: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
			elegant: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200',
			custom: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200'
		};
		return colors[category] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
	}
</script>

<div class={`relative ${className}`}>
	<button
		bind:this={buttonElement}
		type="button"
		on:click={toggle}
		disabled={isSwitching || themesLoading}
		class={`
          flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
          bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors text-gray-900 dark:text-gray-100
          ${compact ? 'text-sm' : 'text-base'}
          ${isSwitching || themesLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		title="Switch template"
	>
		<svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
			/>
		</svg>

		<span class="font-medium text-gray-900 dark:text-gray-100">
			{currentTemplate.displayName}
		</span>

		{#if isAdmin}
			<span class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1 rounded">Admin</span>
		{/if}

		<svg
			class={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isOpen}
		<div
			class="fixed inset-0"
			style="z-index: 9998;"
			role="button"
			tabindex="-1"
			on:click={close}
			on:keydown={(e) => e.key === 'Escape' && close()}
		></div>

		<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg dark:shadow-gray-900/50" style={dropdownStyle}>
			<div class="py-1">
				<div class="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
					<p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Templates</p>
					{#if isAdmin}
						<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Changes apply globally</p>
					{:else}
						<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Changes apply to your view only</p>
					{/if}
				</div>
				{#if themesError}
					<p class="px-4 py-3 text-sm text-red-600 dark:text-red-400">{themesError}</p>
				{:else if themeOptions.length === 0}
					<p class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No themes available</p>
				{:else}
					<ul class="py-1">
						{#each themeOptions as template}
							{@const isSelected = template.id === selectedThemeId}

							<li>
								<button
									type="button"
									on:click={() => handleTemplateSelect(template)}
									disabled={isSwitching}
									class={`
                          w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700
                          transition-colors
                          ${isSelected ? 'bg-blue-50 dark:bg-blue-900/40' : ''}
                          ${compact ? 'text-sm' : 'text-base'}
                          ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
								>
									<div class="flex-1 min-w-0">
										<div class="flex items-center justify-between mb-1">
											<span class={`font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
												{template.displayName}
											</span>
											<span class={`text-xs px-2 py-0.5 rounded ${getCategoryColor(template.category)}`}>
												{template.category}
											</span>
										</div>
										{#if template.description}
											<p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
												{template.description}
											</p>
										{/if}
									</div>

									{#if isSelected}
										<svg class="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
				{/if}
			</div>
		</div>
	{/if}
</div>
