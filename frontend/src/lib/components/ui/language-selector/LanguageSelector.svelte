<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SUPPORTED_LANGUAGES, type LanguageCode } from '$types/multi-lang';
	import { currentLanguage, setLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { logger } from '$lib/utils/logger';

	/** `dropdown` — button + menu. `flags` — row of flag (or code) buttons using the same palette tokens. */
	export let variant: 'dropdown' | 'flags' = 'dropdown';
	export let className = '';
	export let showFlags = true;
	export let showNativeNames = true;
	export let compact = false;

	let isOpen = false;
	let buttonElement: HTMLButtonElement | null = null;
	let dropdownStyle = '';

	$: config = $siteConfigData;
	$: activeLanguages = config?.languages?.activeLanguages ?? ['en', 'he'];
	$: availableLanguages = SUPPORTED_LANGUAGES.filter((lang) => activeLanguages.includes(lang.code));

	$: if (typeof window !== 'undefined' && window.location.search.includes('debug=lang')) {
		logger.debug('LanguageSelector - config:', config);
		logger.debug('LanguageSelector - activeLanguages:', activeLanguages);
		logger.debug('LanguageSelector - availableLanguages:', availableLanguages.map((l) => l.code));
	}

	$: lang = $currentLanguage;
	$: currentLangConfig =
		availableLanguages.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES.find((l) => l.code === lang);

	function labelFor(language: (typeof SUPPORTED_LANGUAGES)[number], viewerLang: string): string {
		if (viewerLang === 'he') return language.name;
		if (showNativeNames) return language.nativeName;
		return language.name;
	}

	function handleLanguageSelect(languageCode: LanguageCode) {
		setLanguage(languageCode);
		isOpen = false;
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
		const dropdownWidth = 192;
		const dropdownHeight = 200;
		const right = window.innerWidth - rect.right;
		let top = rect.bottom + 4;

		if (top + dropdownHeight > window.innerHeight && rect.top > dropdownHeight) {
			top = rect.top - dropdownHeight - 4;
		}

		dropdownStyle = `position: fixed; top: ${top}px; right: ${right}px; width: ${dropdownWidth}px; z-index: 9999;`;
	}

	$: if (isOpen && variant === 'dropdown') {
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

	const triggerBase =
		'flex items-center gap-2 rounded-md border shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--os-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--tp-surface-1)] ' +
		'border-[color:var(--tp-border)] bg-[color:var(--tp-surface-1)] text-[color:var(--tp-fg)] hover:bg-[color:var(--tp-surface-2)] ';
</script>

{#if variant === 'flags'}
	<nav
		class={`flex flex-wrap items-center ${compact ? 'gap-0.5' : 'gap-1.5'} ${className}`}
		aria-label="Language"
		data-language-selector="flags"
	>
		{#each availableLanguages as language}
			{@const selected = language.code === lang}
			<button
				type="button"
				class={`rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--os-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--tp-surface-1)] ${compact ? 'p-1 min-w-[2rem] text-base' : 'p-1.5 min-w-[2.35rem] text-lg'} ${
					selected
						? 'border-[color:var(--os-primary)] bg-[color:color-mix(in_oklab,var(--os-primary)_14%,var(--tp-surface-1))] ring-1 ring-[color:var(--os-primary)]'
						: 'border-[color:var(--tp-border)] bg-[color:var(--tp-surface-1)] opacity-90 hover:opacity-100 hover:bg-[color:var(--tp-surface-2)]'
				}`}
				aria-current={selected ? 'true' : undefined}
				aria-pressed={selected}
				title={labelFor(language, lang)}
				aria-label={labelFor(language, lang)}
				on:click={() => handleLanguageSelect(language.code as LanguageCode)}
			>
				{#if showFlags}
					<span aria-hidden="true">{language.flag}</span>
				{:else}
					<span
						class={`font-medium uppercase tracking-wide text-[color:var(--tp-fg)] ${compact ? 'text-[10px]' : 'text-xs'}`}
						>{language.code}</span
					>
				{/if}
			</button>
		{/each}
	</nav>
{:else}
	<div class={`relative ${className}`} data-language-selector="dropdown">
		<button
			bind:this={buttonElement}
			type="button"
			on:click={toggle}
			class={`${triggerBase} px-3 py-2 ${compact ? 'text-sm' : 'text-base'}`}
			aria-haspopup="listbox"
			aria-expanded={isOpen}
		>
			{#if showFlags}
				<span class="text-lg" aria-hidden="true">{currentLangConfig?.flag}</span>
			{/if}

			<span class="font-medium text-[color:var(--tp-fg)]">
				{labelFor(currentLangConfig ?? SUPPORTED_LANGUAGES[0], lang)}
			</span>

			{#if currentLangConfig?.isRTL && lang !== 'he'}
				<span
					class="rounded px-1 text-xs text-[color:var(--tp-fg-muted)] bg-[color:var(--tp-surface-2)]"
					>RTL</span
				>
			{/if}

			<svg
				class={`h-4 w-4 shrink-0 text-[color:var(--tp-fg-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
				class="fixed inset-0"
				style="z-index: 9998;"
				role="button"
				tabindex="-1"
				on:click={close}
				on:keydown={(e) => e.key === 'Escape' && close()}
			></div>

			<div
				class="rounded-md border border-[color:var(--tp-border)] bg-[color:var(--tp-surface-1)] py-1 shadow-lg"
				style={dropdownStyle}
			>
				<ul class="py-1" role="listbox">
					{#each availableLanguages as language}
						{@const isSelected = language.code === lang}
						{@const isRTL = language.isRTL}

						<li role="none">
							<button
								type="button"
								role="option"
								aria-selected={isSelected}
								on:click={() => handleLanguageSelect(language.code as LanguageCode)}
								class={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${compact ? 'text-sm' : 'text-base'} ${
									isSelected
										? 'bg-[color:color-mix(in_oklab,var(--os-primary)_14%,var(--tp-surface-1))] text-[color:var(--os-primary)]'
										: 'text-[color:var(--tp-fg)] hover:bg-[color:var(--tp-surface-2)]'
								}`}
							>
								{#if showFlags}
									<span class="text-lg" aria-hidden="true">{language.flag}</span>
								{/if}

								<div class="min-w-0 flex-1">
									<div class="flex items-center justify-between">
										<span
											class={`truncate font-medium ${isSelected ? 'text-[color:var(--os-primary)]' : 'text-[color:var(--tp-fg)]'}`}
										>
											{labelFor(language, lang)}
										</span>

										{#if isRTL && lang !== 'he'}
											<span
												class="ml-2 rounded px-1 text-xs text-[color:var(--tp-fg-muted)] bg-[color:var(--tp-surface-2)]"
												>RTL</span
											>
										{/if}
									</div>

									{#if showNativeNames && language.nativeName !== language.name && lang !== 'he'}
										<div class="truncate text-xs text-[color:var(--tp-fg-muted)]">
											{language.name}
										</div>
									{:else if lang === 'he' && language.nativeName !== language.name}
										<div class="truncate text-xs text-[color:var(--tp-fg-muted)]">
											{language.nativeName}
										</div>
									{/if}
								</div>

								{#if isSelected}
									<svg
										class="h-4 w-4 shrink-0 text-[color:var(--os-primary)]"
										fill="currentColor"
										viewBox="0 0 20 20"
										aria-hidden="true"
									>
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
		{/if}
	</div>
{/if}
