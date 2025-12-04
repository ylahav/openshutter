<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
	import type { MultiLangHTML, LanguageCode } from '$lib/types/multi-lang';
	import TiptapHTMLEditor from './TiptapHTMLEditor.svelte';

	export let value: MultiLangHTML = {};
	export let onChange: (value: MultiLangHTML) => void;
	export let placeholder = 'Start typing...';
	export let height = 200;
	export let showLanguageTabs = true;
	export let defaultLanguage: LanguageCode = 'en';
	export let className = '';

	let activeLanguage: LanguageCode = defaultLanguage;
	let editorValue = '';
	let isInternalUpdate = false;

	$: config = $siteConfigData;
	$: isRTL = activeLanguage === 'he' || activeLanguage === 'ar' || activeLanguage === 'fa';

	// Get active languages from site config and map to full language objects
	$: activeLanguages = config?.languages?.activeLanguages || ['en'];
	$: availableLanguages = SUPPORTED_LANGUAGES.filter((lang) =>
		activeLanguages.includes(lang.code)
	);

	// Update editor value when active language or value changes externally
	$: if (activeLanguage && !isInternalUpdate && value) {
		const newEditorValue = value[activeLanguage] || '';
		// Only update if different to avoid unnecessary updates
		if (newEditorValue !== editorValue) {
			editorValue = newEditorValue;
		}
		isInternalUpdate = false;
	}

	// Sync active language when defaultLanguage prop changes
	$: {
		if (defaultLanguage && activeLanguage !== defaultLanguage) {
			activeLanguage = defaultLanguage;
		}
	}

	function handleEditorChange(newValue: string) {
		isInternalUpdate = true;
		editorValue = newValue;

		// Update the multi-language object
		const updatedValue = {
			...value,
			[activeLanguage]: newValue
		};
		onChange(updatedValue);
	}

	function handleLanguageChange(language: LanguageCode) {
		// Don't do anything if clicking the same language
		if (language === activeLanguage) {
			return;
		}
		
		// Prevent reactive statement from interfering
		isInternalUpdate = true;
		
		// Save current content before switching
		const updatedValue = {
			...value,
			[activeLanguage]: editorValue
		};
		onChange(updatedValue);

		// Switch to new language
		activeLanguage = language;
		
		// Update editor value for the new language immediately
		const newValue = updatedValue[language] || '';
		editorValue = typeof newValue === 'string' ? newValue : '';
		
		// Allow reactive updates again after a brief delay
		setTimeout(() => {
			isInternalUpdate = false;
		}, 10);
	}

	$: hasContent = (langCode: LanguageCode) => !!(value && value[langCode] && value[langCode].trim());
</script>

<div class="space-y-3 {className}">
	<!-- Language Tabs -->
	{#if showLanguageTabs && availableLanguages.length > 1}
		<div class="flex border-b border-gray-200 {isRTL ? 'flex-row-reverse' : ''}" style="pointer-events: auto;">
			{#each availableLanguages as language}
				{@const isActive = language.code === activeLanguage}
				{@const hasLangContent = hasContent(language.code)}
				<button
					type="button"
					on:click|stopPropagation|preventDefault={() => handleLanguageChange(language.code)}
					on:mousedown|stopPropagation|preventDefault={() => handleLanguageChange(language.code)}
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

	<!-- Editor Field -->
	<TiptapHTMLEditor
		value={editorValue}
		onChange={handleEditorChange}
		{placeholder}
		{height}
		{isRTL}
		className="w-full"
	/>
</div>
