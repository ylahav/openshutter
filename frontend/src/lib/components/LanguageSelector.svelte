<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { SUPPORTED_LANGUAGES, type LanguageCode } from '$types/multi-lang';
	import { currentLanguage, setLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';

	export let className = '';
	export let showFlags = true;
	export let showNativeNames = true;
	export let compact = false;

	let isOpen = false;

	// Derived data
	$: config = get(siteConfigData);
	$: activeLanguages = config?.languages?.activeLanguages ?? ['en'];
	$: availableLanguages = SUPPORTED_LANGUAGES.filter((lang) => activeLanguages.includes(lang.code));

	$: lang = get(currentLanguage);
	$: currentLangConfig =
		availableLanguages.find((l) => l.code === lang) ?? SUPPORTED_LANGUAGES.find((l) => l.code === lang);

	function handleLanguageSelect(languageCode: LanguageCode) {
		setLanguage(languageCode);
		isOpen = false;
	}

	function toggle() {
		isOpen = !isOpen;
	}

	function close() {
		isOpen = false;
	}
</script>

<div class={`relative ${className}`}>
	<!-- Current Language Display -->
	<button
		type="button"
		on:click={toggle}
		class={`
          flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm
          bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors text-gray-900
          ${compact ? 'text-sm' : 'text-base'}
        `}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
	>
		{#if showFlags}
			<span class="text-lg">{currentLangConfig?.flag}</span>
		{/if}

		<span class="font-medium text-gray-900">
			{#if lang === 'he'}
				{currentLangConfig?.name}
			{:else if showNativeNames}
				{currentLangConfig?.nativeName}
			{:else}
				{currentLangConfig?.name}
			{/if}
		</span>

		{#if currentLangConfig?.isRTL && lang !== 'he'}
			<span class="text-xs text-gray-500 bg-gray-100 px-1 rounded">RTL</span>
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

	<!-- Language Dropdown -->
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
		<div class="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
			<ul class="py-1">
				{#each availableLanguages as language}
					{@const isSelected = language.code === lang}
					{@const isRTL = language.isRTL}

					<li>
						<button
							type="button"
							on:click={() => handleLanguageSelect(language.code as LanguageCode)}
							class={`
                        w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50
                        transition-colors
                        ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
                        ${compact ? 'text-sm' : 'text-base'}
                      `}
						>
							{#if showFlags}
								<span class="text-lg">{language.flag}</span>
							{/if}

							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between">
									<span class={`font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
										{#if lang === 'he'}
											{language.name}
										{:else if showNativeNames}
											{language.nativeName}
										{:else}
											{language.name}
										{/if}
									</span>

									{#if isRTL && lang !== 'he'}
										<span class="text-xs text-gray-500 bg-gray-100 px-1 rounded ml-2">
											RTL
										</span>
									{/if}
								</div>

								{#if showNativeNames && language.nativeName !== language.name && lang !== 'he'}
									<div class="text-xs text-gray-500 truncate">
										{language.name}
									</div>
								{:else if lang === 'he' && language.nativeName !== language.name}
									<div class="text-xs text-gray-500 truncate">
										{language.nativeName}
									</div>
								{/if}
							</div>

							{#if isSelected}
								<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
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
