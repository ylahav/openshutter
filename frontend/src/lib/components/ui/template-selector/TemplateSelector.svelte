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
			const validPacks = new Set(['noir', 'studio', 'atelier']);
			const raw = (Array.isArray(result) ? result : result.data || []).filter((t: any) =>
				validPacks.has(String(t.baseTemplate ?? 'noir').toLowerCase())
			);
			const order = ['noir', 'studio', 'atelier'];
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
				baseTemplate: t.baseTemplate || 'noir',
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

	function categoryBadgeClass(category: string): string {
		const c = String(category || '').toLowerCase();
		const base = 'pb-templateSelector__badge';
		if (c === 'noir') return `${base} pb-templateSelector__badge--noir`;
		if (c === 'studio') return `${base} pb-templateSelector__badge--studio`;
		if (c === 'atelier') return `${base} pb-templateSelector__badge--atelier`;
		if (c === 'custom') return `${base} pb-templateSelector__badge--custom`;
		return `${base} pb-templateSelector__badge--default`;
	}

	$: triggerDisabled = isSwitching || themesLoading;
	$: triggerClass = [
		'pb-templateSelector__trigger',
		compact ? 'pb-templateSelector__trigger--compact' : '',
		triggerDisabled ? 'pb-templateSelector__trigger--disabled' : ''
	]
		.filter(Boolean)
		.join(' ');
</script>

<div class={`pb-templateSelector ${className}`.trim()}>
	<button
		bind:this={buttonElement}
		type="button"
		on:click={toggle}
		disabled={triggerDisabled}
		class={triggerClass}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		title="Switch template"
	>
		<svg class="pb-templateSelector__triggerIcon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
			/>
		</svg>

		<span class="pb-templateSelector__triggerLabel">
			{currentTemplate.displayName}
		</span>

		{#if isAdmin}
			<span class="pb-templateSelector__adminPill">Admin</span>
		{/if}

		<svg
			class="pb-templateSelector__chevron {isOpen ? 'pb-templateSelector__chevron--open' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isOpen}
		<div
			class="pb-templateSelector__backdrop"
			style="z-index: 9998;"
			role="button"
			tabindex="-1"
			on:click={close}
			on:keydown={(e) => e.key === 'Escape' && close()}
		></div>

		<div class="pb-templateSelector__dropdown" style={dropdownStyle}>
			<div class="pb-templateSelector__dropdownInner">
				<div class="pb-templateSelector__header">
					<p class="pb-templateSelector__headerTitle">Templates</p>
					{#if isAdmin}
						<p class="pb-templateSelector__headerHint">Changes apply globally</p>
					{:else}
						<p class="pb-templateSelector__headerHint">Changes apply to your view only</p>
					{/if}
				</div>
				{#if themesError}
					<p class="pb-templateSelector__message pb-templateSelector__message--error">{themesError}</p>
				{:else if themeOptions.length === 0}
					<p class="pb-templateSelector__message">No themes available</p>
				{:else}
					<ul class="pb-templateSelector__list" role="listbox">
						{#each themeOptions as template}
							{@const isSelected = template.id === selectedThemeId}

							<li>
								<button
									type="button"
									on:click={() => handleTemplateSelect(template)}
									disabled={isSwitching}
									class={[
										'pb-templateSelector__option',
										isSelected ? 'pb-templateSelector__option--selected' : '',
										compact ? 'pb-templateSelector__option--compact' : '',
										isSwitching ? 'pb-templateSelector__option--disabled' : ''
									]
										.filter(Boolean)
										.join(' ')}
								>
									<div class="pb-templateSelector__optionBody">
										<div class="pb-templateSelector__optionRow">
											<span
												class={isSelected
													? 'pb-templateSelector__optionName pb-templateSelector__optionName--selected'
													: 'pb-templateSelector__optionName'}
											>
												{template.displayName}
											</span>
											<span class={categoryBadgeClass(template.category)}>
												{template.category}
											</span>
										</div>
										{#if template.description}
											<p class="pb-templateSelector__optionDesc">
												{template.description}
											</p>
										{/if}
									</div>

									{#if isSelected}
										<svg class="pb-templateSelector__check" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
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

<style lang="scss">
	.pb-templateSelector {
		position: relative;
		color: var(--tp-fg);
	}

	.pb-templateSelector__trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--tp-border);
		border-radius: 0.375rem;
		background: var(--tp-surface-1);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
		font-size: 1rem;
		font-weight: 500;
		color: var(--tp-fg);
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			opacity 0.15s ease;
	}
	.pb-templateSelector__trigger:hover:not(:disabled) {
		background: var(--tp-surface-2);
	}
	.pb-templateSelector__trigger:focus-visible {
		outline: 2px solid var(--tp-brand, #3b82f6);
		outline-offset: 2px;
	}
	.pb-templateSelector__trigger--compact {
		font-size: 0.875rem;
	}
	.pb-templateSelector__trigger--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pb-templateSelector__triggerIcon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: var(--tp-fg-muted);
	}
	.pb-templateSelector__triggerLabel {
		font-weight: 500;
	}
	.pb-templateSelector__adminPill {
		font-size: 0.625rem;
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		background: var(--tp-surface-2);
		color: var(--tp-fg-muted);
	}

	.pb-templateSelector__chevron {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: var(--tp-fg-muted);
		transition: transform 0.15s ease;
	}
	.pb-templateSelector__chevron--open {
		transform: rotate(180deg);
	}

	.pb-templateSelector__backdrop {
		position: fixed;
		inset: 0;
	}

	.pb-templateSelector__dropdown {
		border: 1px solid var(--tp-border);
		border-radius: 0.375rem;
		background: var(--tp-surface-1);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
	}
	.pb-templateSelector__dropdownInner {
		padding: 0.25rem 0;
	}

	.pb-templateSelector__header {
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--tp-border);
	}
	.pb-templateSelector__headerTitle {
		margin: 0;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--tp-fg-muted);
	}
	.pb-templateSelector__headerHint {
		margin: 0.25rem 0 0;
		font-size: 0.6875rem;
		color: var(--tp-fg-subtle, var(--tp-fg-muted));
	}

	.pb-templateSelector__message {
		margin: 0;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: var(--tp-fg-muted);
	}
	.pb-templateSelector__message--error {
		color: var(--tp-danger, #dc2626);
	}

	.pb-templateSelector__list {
		margin: 0;
		padding: 0.25rem 0;
		list-style: none;
	}

	.pb-templateSelector__option {
		display: flex;
		width: 100%;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border: none;
		background: transparent;
		text-align: left;
		font-size: 1rem;
		color: var(--tp-fg);
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.pb-templateSelector__option--compact {
		font-size: 0.875rem;
	}
	.pb-templateSelector__option:hover:not(:disabled) {
		background: var(--tp-surface-2);
	}
	.pb-templateSelector__option--selected {
		background: color-mix(in srgb, var(--tp-brand, #3b82f6) 12%, transparent);
	}
	.pb-templateSelector__option--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pb-templateSelector__optionBody {
		flex: 1;
		min-width: 0;
	}
	.pb-templateSelector__optionRow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}
	.pb-templateSelector__optionName {
		font-weight: 500;
		color: var(--tp-fg);
	}
	.pb-templateSelector__optionName--selected {
		color: var(--tp-brand, #2563eb);
	}
	.pb-templateSelector__optionDesc {
		margin: 0;
		font-size: 0.75rem;
		color: var(--tp-fg-muted);
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		line-clamp: 1;
	}

	.pb-templateSelector__check {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
		color: var(--tp-brand, #2563eb);
	}

	.pb-templateSelector__badge {
		display: inline-block;
		font-size: 0.625rem;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-weight: 500;
		text-transform: lowercase;
	}
	.pb-templateSelector__badge--noir {
		background: var(--tp-surface-2);
		color: var(--tp-fg);
		border: 1px solid var(--tp-border);
	}
	.pb-templateSelector__badge--studio {
		background: color-mix(in srgb, #3b82f6 14%, var(--tp-surface-1));
		color: var(--tp-fg);
	}
	.pb-templateSelector__badge--atelier {
		background: color-mix(in srgb, #d97706 18%, var(--tp-surface-1));
		color: var(--tp-fg);
	}
	.pb-templateSelector__badge--custom {
		background: color-mix(in srgb, #6366f1 16%, var(--tp-surface-1));
		color: var(--tp-fg);
	}
	.pb-templateSelector__badge--default {
		background: var(--tp-surface-2);
		color: var(--tp-fg-muted);
	}
</style>
