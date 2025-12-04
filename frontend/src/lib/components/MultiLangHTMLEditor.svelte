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
	let lastSentValue: MultiLangHTML = {}; // Track what we last sent to parent
	let hasUserSelectedLanguage = false; // Track if user has manually selected a language

	$: config = $siteConfigData;
	$: isRTL = activeLanguage === 'he' || activeLanguage === 'ar' || activeLanguage === 'fa';

	// Get active languages from site config and map to full language objects
	$: activeLanguages = config?.languages?.activeLanguages || ['en'];
	$: availableLanguages = SUPPORTED_LANGUAGES.filter((lang) =>
		activeLanguages.includes(lang.code)
	);

	// Update editor value when active language or value changes externally
	// Only update if we're not in the middle of an internal update
	// and if the incoming value is different from what we last sent
	$: if (activeLanguage && !isInternalUpdate && value) {
		const newEditorValue = value[activeLanguage] || '';
		
		// Check if this is a different value than what we last sent
		const lastSentEditorValue = lastSentValue[activeLanguage] || '';
		
		// Only update if:
		// 1. The new value is different from current editor value
		// 2. The new value is different from what we last sent (to avoid overwriting our own updates)
		if (newEditorValue !== editorValue && newEditorValue !== lastSentEditorValue) {
			// Temporarily set flag to prevent recursive updates
			isInternalUpdate = true;
			editorValue = newEditorValue;
			// Update lastSentValue to match current state
			lastSentValue = { ...(value || {}), [activeLanguage]: newEditorValue };
			// Reset flag after a brief delay
			setTimeout(() => {
				isInternalUpdate = false;
			}, 10);
		}
	}

	// Sync active language when defaultLanguage prop changes
	// BUT only if we haven't manually changed it (don't override user selection)
	// Only sync on initial mount or if defaultLanguage changes externally
	$: if (defaultLanguage && !hasUserSelectedLanguage && activeLanguage !== defaultLanguage) {
		activeLanguage = defaultLanguage;
	}

	function handleEditorChange(newValue: string) {
		// Set flag to prevent reactive statement from overwriting
		isInternalUpdate = true;
		editorValue = newValue;

		// Update the multi-language object - preserve ALL existing languages
		const updatedValue = {
			...(value || {}), // Start with all existing languages
			[activeLanguage]: newValue // Update the current language
		};
		
		// Track what we're sending to parent
		lastSentValue = updatedValue;
		
		onChange(updatedValue);
		
		// Reset flag after a longer delay to ensure parent has updated
		// This prevents the reactive statement from overwriting user input
		setTimeout(() => {
			isInternalUpdate = false;
		}, 100);
	}

	function handleLanguageChange(language: LanguageCode) {
		// Don't do anything if clicking the same language
		if (language === activeLanguage) {
			return;
		}
		
		// Mark that user has manually selected a language
		hasUserSelectedLanguage = true;
		
		// Prevent reactive statement from interfering during the switch
		isInternalUpdate = true;
		
		// Save current content before switching - preserve ALL existing languages
		// Use the CURRENT activeLanguage (before switch)
		const currentLang = activeLanguage;
		const updatedValue = {
			...(value || {}), // Start with all existing languages
			[currentLang]: editorValue // Update current language with current editor value
		};
		
		// Track what we're sending to parent
		lastSentValue = updatedValue;
		
		// Notify parent of the current language's value (preserving all languages)
		onChange(updatedValue);

		// Switch to new language - this must happen synchronously
		activeLanguage = language;
		
		// Get the value for the new language - check updatedValue first (includes unsaved changes), then value prop
		const newValue = updatedValue[language] || value[language] || '';
		editorValue = typeof newValue === 'string' ? newValue : '';
		
		// Update lastSentValue to include the new language's value
		lastSentValue = { ...updatedValue, [language]: editorValue };
		
		// Allow reactive updates again after a brief delay
		// This ensures the reactive statement can update if the parent value prop changes
		// Use a slightly longer delay to ensure parent has processed the onChange callback
		setTimeout(() => {
			isInternalUpdate = false;
			// Force a check by reading from value prop again in case parent updated it
			// Make sure we're still on the correct language
			if (activeLanguage === language) {
				const latestValue = value[language] || '';
				if (latestValue && typeof latestValue === 'string' && latestValue !== editorValue) {
					editorValue = latestValue;
					lastSentValue = { ...(value || {}), [language]: latestValue };
				}
			}
		}, 150);
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
					on:click={(e) => {
						e.preventDefault();
						e.stopPropagation();
						handleLanguageChange(language.code);
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
