<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
	import type { MultiLangText, LanguageCode } from '$lib/types/multi-lang';

	export let value: MultiLangText = {};
	export let onChange: (value: MultiLangText) => void;
	export let placeholder = 'Enter text...';
	export let className = '';
	export let required = false;
	export let maxLength: number | undefined = undefined;
	export let showLanguageTabs = true;
	export let defaultLanguage: LanguageCode = 'en';
	export let multiline = false;
	export let rows = 3;

	let activeLanguage: LanguageCode = defaultLanguage;
	let inputValue = '';
	let isInternalUpdate = false;

	$: config = $siteConfigData;
	$: isRTL = activeLanguage === 'he' || activeLanguage === 'ar' || activeLanguage === 'fa';

	// Get active languages from site config
	$: activeLanguages = config?.languages?.activeLanguages || ['en'];
	$: availableLanguages = SUPPORTED_LANGUAGES.filter((lang) =>
		activeLanguages.includes(lang.code)
	);

	// Update input value when active language or value changes externally
	$: if (activeLanguage && !isInternalUpdate && value) {
		const stringValue = MultiLangUtils.getValue(value, activeLanguage);
		const newInputValue = typeof stringValue === 'string' ? stringValue : '';
		// Only update if different to avoid unnecessary updates
		if (newInputValue !== inputValue) {
			inputValue = newInputValue;
		}
		isInternalUpdate = false;
	}

	// Sync active language when defaultLanguage prop changes
	$: if (defaultLanguage && activeLanguage !== defaultLanguage) {
		activeLanguage = defaultLanguage;
	}

	function handleInputChange(e: Event) {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement;
		const newValue = target.value;
		isInternalUpdate = true;
		inputValue = newValue;

		// Update the multi-language field
		const updatedField = { ...value, [activeLanguage]: newValue };
		onChange(updatedField);
	}

	function handleLanguageClick(languageCode: LanguageCode) {
		// Don't do anything if clicking the same language
		if (languageCode === activeLanguage) {
			return;
		}
		
		// Prevent reactive statement from interfering
		isInternalUpdate = true;
		
		// Save current input value before switching
		const updatedField = { ...value, [activeLanguage]: inputValue };
		onChange(updatedField);

		// Switch to new language
		activeLanguage = languageCode;
		
		// Update input value for the new language immediately (use updatedField which includes current changes)
		const newValue = MultiLangUtils.getValue(updatedField, languageCode);
		inputValue = typeof newValue === 'string' ? newValue : '';
		
		// Allow reactive updates again after a brief delay
		setTimeout(() => {
			isInternalUpdate = false;
		}, 10);
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
					on:click|stopPropagation|preventDefault={() => handleLanguageClick(language.code)}
					on:mousedown|stopPropagation|preventDefault={() => handleLanguageClick(language.code)}
					class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer z-10 relative pointer-events-auto {isActive
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
