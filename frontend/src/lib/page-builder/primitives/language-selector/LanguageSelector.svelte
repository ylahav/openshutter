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

	function flagsNavClass(): string {
		return `pb-languageSelector pb-languageSelector--flags ${compact ? 'pb-languageSelector--compact' : ''} ${className}`.trim();
	}

	function flagButtonClass(selected: boolean): string {
		return `pb-languageSelector__flagBtn ${compact ? 'pb-languageSelector__flagBtn--compact' : ''} ${
			selected ? 'pb-languageSelector__flagBtn--selected' : 'pb-languageSelector__flagBtn--default'
		}`.trim();
	}

	function triggerClass(): string {
		return `pb-languageSelector__trigger ${compact ? 'pb-languageSelector__trigger--compact' : ''}`.trim();
	}

	function dropdownOptionClass(isSelected: boolean): string {
		return `pb-languageSelector__option ${compact ? 'pb-languageSelector__option--compact' : ''} ${
			isSelected ? 'pb-languageSelector__option--selected' : 'pb-languageSelector__option--default'
		}`.trim();
	}
</script>

{#if variant === 'flags'}
	<nav
		class={flagsNavClass()}
		aria-label="Language"
		data-language-selector="flags"
	>
		{#each availableLanguages as language}
			{@const selected = language.code === lang}
			<button
				type="button"
				class={flagButtonClass(selected)}
				aria-current={selected ? 'true' : undefined}
				aria-pressed={selected}
				title={labelFor(language, lang)}
				aria-label={labelFor(language, lang)}
				on:click={() => handleLanguageSelect(language.code as LanguageCode)}
			>
				{#if showFlags}
					<span class="pb-languageSelector__flag" aria-hidden="true">{language.flag}</span>
				{:else}
					<span class="pb-languageSelector__code {compact ? 'pb-languageSelector__code--compact' : ''}"
						>{language.code}</span>
				{/if}
			</button>
		{/each}
	</nav>
{:else}
	<div class={`pb-languageSelector pb-languageSelector--dropdown ${className}`} data-language-selector="dropdown">
		<button
			bind:this={buttonElement}
			type="button"
			on:click={toggle}
			class={triggerClass()}
			aria-haspopup="listbox"
			aria-expanded={isOpen}
		>
			{#if showFlags}
				<span class="pb-languageSelector__currentFlag" aria-hidden="true">{currentLangConfig?.flag}</span>
			{/if}

			<span class="pb-languageSelector__currentLabel">
				{labelFor(currentLangConfig ?? SUPPORTED_LANGUAGES[0], lang)}
			</span>

			{#if currentLangConfig?.isRTL && lang !== 'he'}
				<span class="pb-languageSelector__rtlTag">RTL</span>
			{/if}

			<svg
				class={`pb-languageSelector__chevron ${isOpen ? 'pb-languageSelector__chevron--open' : ''}`}
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
				class="pb-languageSelector__backdrop"
				style="z-index: 9998;"
				role="button"
				tabindex="-1"
				on:click={close}
				on:keydown={(e) => e.key === 'Escape' && close()}
			></div>

			<div
				class="pb-languageSelector__menu"
				style={dropdownStyle}
			>
				<ul class="pb-languageSelector__menuList" role="listbox">
					{#each availableLanguages as language}
						{@const isSelected = language.code === lang}
						{@const isRTL = language.isRTL}

						<li role="none">
							<button
								type="button"
								role="option"
								aria-selected={isSelected}
								on:click={() => handleLanguageSelect(language.code as LanguageCode)}
								class={dropdownOptionClass(isSelected)}
							>
								{#if showFlags}
									<span class="pb-languageSelector__optionFlag" aria-hidden="true">{language.flag}</span>
								{/if}

								<div class="pb-languageSelector__optionMain">
									<div class="pb-languageSelector__optionHead">
										<span
											class={`pb-languageSelector__optionLabel ${isSelected ? 'pb-languageSelector__optionLabel--selected' : ''}`}
										>
											{labelFor(language, lang)}
										</span>

										{#if isRTL && lang !== 'he'}
											<span class="pb-languageSelector__rtlTag pb-languageSelector__rtlTag--inline">RTL</span>
										{/if}
									</div>

									{#if showNativeNames && language.nativeName !== language.name && lang !== 'he'}
										<div class="pb-languageSelector__optionSubLabel">
											{language.name}
										</div>
									{:else if lang === 'he' && language.nativeName !== language.name}
										<div class="pb-languageSelector__optionSubLabel">
											{language.nativeName}
										</div>
									{/if}
								</div>

								{#if isSelected}
									<svg
										class="pb-languageSelector__check"
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

<style lang="scss">
	.pb-languageSelector {
		position: relative;
	}

	.pb-languageSelector--flags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	.pb-languageSelector--compact.pb-languageSelector--flags {
		gap: 0.125rem;
	}

	.pb-languageSelector__flagBtn {
		border-radius: 0.375rem;
		border: 1px solid var(--tp-border);
		background: var(--tp-surface-1);
		transition: background-color 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
		padding: 0.375rem;
		min-width: 2.35rem;
		font-size: 1.125rem;
	}

	.pb-languageSelector__flagBtn--compact {
		padding: 0.25rem;
		min-width: 2rem;
		font-size: 1rem;
	}

	.pb-languageSelector__flagBtn--selected {
		border-color: var(--os-primary);
		background: color-mix(in oklab, var(--os-primary) 14%, var(--tp-surface-1));
		box-shadow: 0 0 0 1px var(--os-primary) inset;
	}

	.pb-languageSelector__flagBtn--default {
		opacity: 0.9;
	}

	.pb-languageSelector__flagBtn--default:hover {
		opacity: 1;
		background: var(--tp-surface-2);
	}

	.pb-languageSelector__flagBtn:focus-visible,
	.pb-languageSelector__trigger:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px var(--os-primary), 0 0 0 4px var(--tp-surface-1);
	}

	.pb-languageSelector__code {
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--tp-fg);
		font-size: 0.75rem;
	}

	.pb-languageSelector__code--compact {
		font-size: 10px;
	}

	.pb-languageSelector__trigger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		border: 1px solid var(--tp-border);
		background: var(--tp-surface-1);
		color: var(--tp-fg);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
		font-size: 1rem;
		transition: background-color 0.2s ease;
	}

	.pb-languageSelector__trigger:hover {
		background: var(--tp-surface-2);
	}

	.pb-languageSelector__trigger--compact {
		font-size: 0.875rem;
	}

	.pb-languageSelector__currentFlag,
	.pb-languageSelector__optionFlag {
		font-size: 1.125rem;
	}

	.pb-languageSelector__currentLabel {
		font-weight: 500;
		color: var(--tp-fg);
	}

	.pb-languageSelector__rtlTag {
		border-radius: 0.25rem;
		padding: 0 0.25rem;
		font-size: 0.75rem;
		background: var(--tp-surface-2);
		color: var(--tp-fg-muted);
	}

	.pb-languageSelector__rtlTag--inline {
		margin-left: 0.5rem;
	}

	.pb-languageSelector__chevron {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: var(--tp-fg-muted);
		transition: transform 0.2s ease;
	}

	.pb-languageSelector__chevron--open {
		transform: rotate(180deg);
	}

	.pb-languageSelector__backdrop {
		position: fixed;
		inset: 0;
	}

	.pb-languageSelector__menu {
		border-radius: 0.375rem;
		border: 1px solid var(--tp-border);
		background: var(--tp-surface-1);
		padding-block: 0.25rem;
		box-shadow: 0 10px 26px rgb(0 0 0 / 0.2);
	}

	.pb-languageSelector__menuList {
		padding-block: 0.25rem;
	}

	.pb-languageSelector__option {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		text-align: left;
		transition: background-color 0.2s ease;
		font-size: 1rem;
	}

	.pb-languageSelector__option--compact {
		font-size: 0.875rem;
	}

	.pb-languageSelector__option--selected {
		background: color-mix(in oklab, var(--os-primary) 14%, var(--tp-surface-1));
		color: var(--os-primary);
	}

	.pb-languageSelector__option--default {
		color: var(--tp-fg);
	}

	.pb-languageSelector__option--default:hover {
		background: var(--tp-surface-2);
	}

	.pb-languageSelector__optionMain {
		min-width: 0;
		flex: 1;
	}

	.pb-languageSelector__optionHead {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.pb-languageSelector__optionLabel {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
		color: var(--tp-fg);
	}

	.pb-languageSelector__optionLabel--selected {
		color: var(--os-primary);
	}

	.pb-languageSelector__optionSubLabel {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.75rem;
		color: var(--tp-fg-muted);
	}

	.pb-languageSelector__check {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: var(--os-primary);
	}
</style>
