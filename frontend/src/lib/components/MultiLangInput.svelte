<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
	import type { MultiLangText, LanguageCode } from '$lib/types/multi-lang';

	export let value: MultiLangText = {};
	export let onChange: ((value: MultiLangText) => void) | undefined = undefined;
	export let placeholder = 'Enter text...';
	export let className = '';
	export let id: string | undefined = undefined;
	export let required = false;
	export let maxLength: number | undefined = undefined;
	export let showLanguageTabs = true;
	export let defaultLanguage: LanguageCode = 'en';
	export let multiline = false;
	export let rows = 3;

	let activeLanguage: LanguageCode = defaultLanguage;
	let inputValue = '';
	let isInternalUpdate = false;
	let lastSentValue: MultiLangText = {}; // Track what we last sent to parent

	$: config = $siteConfigData;
	$: isRTL = activeLanguage === 'he' || activeLanguage === 'ar' || activeLanguage === 'fa';

	// Get active languages from site config
	$: activeLanguages = config?.languages?.activeLanguages || ['en', 'he'];
	$: availableLanguages = SUPPORTED_LANGUAGES.filter((lang) =>
		activeLanguages.includes(lang.code)
	);

	// Update input value when active language or value changes externally
	// Only update if we're not in the middle of an internal update
	// and if the incoming value is different from what we last sent
	$: if (activeLanguage && !isInternalUpdate && value) {
		const stringValue = MultiLangUtils.getValue(value, activeLanguage);
		const newInputValue = typeof stringValue === 'string' ? stringValue : '';
		
		// Check if this is a different value than what we last sent
		const lastSentStringValue = MultiLangUtils.getValue(lastSentValue, activeLanguage);
		const lastSentInputValue = typeof lastSentStringValue === 'string' ? lastSentStringValue : '';
		
		// Only update if:
		// 1. The new value is different from current input
		// 2. The new value is different from what we last sent (to avoid overwriting our own updates)
		if (newInputValue !== inputValue && newInputValue !== lastSentInputValue) {
			// Temporarily set flag to prevent recursive updates
			isInternalUpdate = true;
			inputValue = newInputValue;
			// Update lastSentValue to match current state
			lastSentValue = { ...(value || {}), [activeLanguage]: newInputValue };
			// Reset flag after a brief delay
			setTimeout(() => {
				isInternalUpdate = false;
			}, 10);
		}
	}

	// Sync active language when defaultLanguage prop changes
	// BUT only if we haven't manually changed it (don't override user selection)
	// Only sync on initial mount or if defaultLanguage changes externally
	let hasUserSelectedLanguage = false;
	$: if (defaultLanguage && !hasUserSelectedLanguage && activeLanguage !== defaultLanguage) {
		activeLanguage = defaultLanguage;
	}

	function handleInputChange(e: Event) {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement;
		const newValue = target.value;
		
		// Set flag to prevent reactive statement from overwriting
		isInternalUpdate = true;
		inputValue = newValue;

		// Update the multi-language field - preserve ALL existing languages and update current one
		// Ensure we always include all languages from the value prop
		// IMPORTANT: Use the current activeLanguage, not the value prop's language
		const updatedField = { 
			...(value || {}), // Start with all existing languages
			[activeLanguage]: newValue // Update the CURRENT active language
		};
		
		// Track what we're sending to parent
		lastSentValue = updatedField;
		
		// Update parent if onChange is provided, otherwise rely on bind:value
		if (onChange) {
			onChange(updatedField);
		} else {
			// When using bind:value, update the value prop directly
			value = updatedField;
		}
		
		// Reset flag after a longer delay to ensure parent has updated
		// This prevents the reactive statement from overwriting user input
		setTimeout(() => {
			isInternalUpdate = false;
		}, 100);
	}

	function handleLanguageClick(languageCode: LanguageCode) {
		// Don't do anything if clicking the same language
		if (languageCode === activeLanguage) {
			return;
		}
		
		// Mark that user has manually selected a language
		hasUserSelectedLanguage = true;
		
		// Prevent reactive statement from interfering during the switch
		isInternalUpdate = true;
		
		// Save current input value before switching - preserve ALL existing languages
		// Use the CURRENT activeLanguage (before switch)
		const currentLang = activeLanguage;
		const updatedField = { 
			...(value || {}), // Start with all existing languages
			[currentLang]: inputValue // Update current language with current input
		};
		
		// Track what we're sending to parent
		lastSentValue = updatedField;
		
		// Update parent - use onChange if provided, otherwise update value directly (for bind:value)
		if (onChange) {
			onChange(updatedField);
		} else {
			// When using bind:value, Svelte handles the binding automatically
			// We just need to update the value prop
			value = updatedField;
		}

		// Switch to new language - this must happen synchronously
		activeLanguage = languageCode;
		
		// Get the value for the new language - check updatedField first (includes unsaved changes), then value prop
		const newValue = MultiLangUtils.getValue(updatedField, languageCode) || MultiLangUtils.getValue(value, languageCode) || '';
		inputValue = typeof newValue === 'string' ? newValue : '';
		
		// Update lastSentValue to include the new language's value
		lastSentValue = { ...updatedField, [languageCode]: inputValue };
		
		// Allow reactive updates again after a brief delay
		// This ensures the reactive statement can update if the parent value prop changes
		// Use a slightly longer delay to ensure parent has processed the onChange callback
		setTimeout(() => {
			isInternalUpdate = false;
			// Force a check by reading from value prop again in case parent updated it
			// Make sure we're still on the correct language
			if (activeLanguage === languageCode) {
				const latestValue = MultiLangUtils.getValue(value, languageCode);
				if (latestValue && typeof latestValue === 'string' && latestValue !== inputValue) {
					inputValue = latestValue;
					lastSentValue = { ...(value || {}), [languageCode]: latestValue };
				}
			}
		}, 150);
	}

	$: currentLangConfig = availableLanguages.find((lang) => lang.code === activeLanguage);
	$: hasContent = (lang: LanguageCode) => !!(value && value[lang] && value[lang].trim());
</script>

<div class="space-y-2 {className}">
	<!-- Language Tabs -->
	{#if showLanguageTabs && availableLanguages.length > 1}
		<div class="flex flex-wrap border-b border-gray-200 {isRTL ? 'flex-row-reverse' : ''}" style="pointer-events: auto;">
			{#each availableLanguages as language}
				{@const isActive = language.code === activeLanguage}
				{@const hasLangContent = hasContent(language.code)}
				<button
					type="button"
					on:click={(e) => {
						e.preventDefault();
						e.stopPropagation();
						handleLanguageClick(language.code);
					}}
					class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer z-10 relative {isActive
						? 'border-blue-500 text-blue-600 bg-blue-50'
						: 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'} {hasLangContent
						? 'font-semibold'
						: 'font-normal'} {isRTL ? 'flex-row-reverse' : ''}"
					style="pointer-events: auto; user-select: none;"
				>
					<span class="text-lg pointer-events-none">{language.flag}</span>
					<span class="hidden sm:inline pointer-events-none">{language.nativeName}</span>
					{#if hasLangContent}
						<span class="w-2 h-2 bg-green-500 rounded-full pointer-events-none"></span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Input Field -->
	<div class="relative">
		{#if multiline}
			<textarea
				{id}
				value={inputValue}
				on:input={handleInputChange}
				{placeholder}
				{required}
				{maxLength}
				{rows}
				class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {currentLangConfig?.isRTL
					? 'text-right'
					: 'text-left'} {className}"
				dir={currentLangConfig?.isRTL ? 'rtl' : 'ltr'}
			></textarea>
		{:else}
			<input
				{id}
				type="text"
				value={inputValue}
				on:input={handleInputChange}
				{placeholder}
				{required}
				{maxLength}
				class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 {currentLangConfig?.isRTL
					? 'text-right'
					: 'text-left'} {className}"
				dir={currentLangConfig?.isRTL ? 'rtl' : 'ltr'}
			/>
		{/if}

		<!-- Language Indicator -->
		<div
			class="absolute {currentLangConfig?.isRTL ? 'left-2' : 'right-2'} top-1/2 transform -translate-y-1/2"
			dir={currentLangConfig?.isRTL ? 'rtl' : 'ltr'}
		>
			<span class="text-xs text-gray-400 bg-white px-1">
				{currentLangConfig?.code.toUpperCase() || activeLanguage.toUpperCase()}
			</span>
		</div>
	</div>

	<!-- Character Count -->
	{#if maxLength}
		<div class="text-xs text-gray-500 text-right">
			{inputValue.length} / {maxLength}
		</div>
	{/if}
</div>
