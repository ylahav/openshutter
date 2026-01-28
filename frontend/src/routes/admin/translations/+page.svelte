<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

	interface Language {
		code: string;
		name: string;
		flag: string;
	}

	let languages: Language[] = [];
	let loading = true;
	let saving = false;
	let deleting = false;
	let message = '';
	let error = '';
	let selectedLanguage: string | null = null;
	let translations: Record<string, any> = {};
	let editingKey: string | null = null;
	let editingValue: string = '';
	let searchTerm = '';
	let expandedKeys: Set<string> = new Set();
	let expandedCategories: Set<string> = new Set();
	let showAddLanguageDialog = false;
	let newLanguageCode = '';
	let newLanguageName = '';
	let newLanguageFlag = '🌐';
	let autoTranslating = false;
	let selectedCategory: string | null = null;
	let englishTranslations: Record<string, any> = {};
	
	// Confirmation dialogs
	let showAutoTranslateDialog = false;
	let showDeleteLanguageDialog = false;
	let languageToDelete: string | null = null;
	
	// Auto-translation progress
	let translationProgress = {
		current: 0,
		total: 0,
		currentKey: ''
	};

	// Language metadata for creating new languages
	const languageMetadata: Record<string, { name: string; flag: string }> = {
		en: { name: 'English', flag: '🇺🇸' },
		he: { name: 'Hebrew', flag: '🇮🇱' },
		ar: { name: 'Arabic', flag: '🇸🇦' },
		es: { name: 'Spanish', flag: '🇪🇸' },
		fr: { name: 'French', flag: '🇫🇷' },
		de: { name: 'German', flag: '🇩🇪' },
		it: { name: 'Italian', flag: '🇮🇹' },
		pt: { name: 'Portuguese', flag: '🇵🇹' },
		ru: { name: 'Russian', flag: '🇷🇺' },
		ja: { name: 'Japanese', flag: '🇯🇵' },
		ko: { name: 'Korean', flag: '🇰🇷' },
		zh: { name: 'Chinese', flag: '🇨🇳' },
		nl: { name: 'Dutch', flag: '🇳🇱' },
		sv: { name: 'Swedish', flag: '🇸🇪' },
		no: { name: 'Norwegian', flag: '🇳🇴' },
		da: { name: 'Danish', flag: '🇩🇰' },
		fi: { name: 'Finnish', flag: '🇫🇮' },
		pl: { name: 'Polish', flag: '🇵🇱' },
		tr: { name: 'Turkish', flag: '🇹🇷' },
		hi: { name: 'Hindi', flag: '🇮🇳' },
	};

	onMount(async () => {
		await loadLanguages();
	});

	async function loadLanguages() {
		try {
			loading = true;
			error = '';
			const response = await fetch('/api/admin/translations');
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			if (result.success) {
				languages = result.data;
			} else {
				throw new Error(result.error || 'Failed to load languages');
			}
		} catch (err) {
			logger.error('Error loading languages:', err);
			error = handleError(err, 'Failed to load languages');
		} finally {
			loading = false;
		}
	}

	async function loadTranslations(languageCode: string, forceReload: boolean = false) {
		try {
			loading = true;
			error = '';
			// Add cache-busting parameter if force reload
			const cacheBuster = forceReload ? `&_t=${Date.now()}` : '';
			const response = await fetch(`/api/admin/translations?languageCode=${languageCode}${cacheBuster}`);
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			logger.debug(`[Translations] API response for ${languageCode}:`, {
				success: result.success,
				hasData: !!result.data,
				dataType: typeof result.data,
				dataKeys: result.data ? Object.keys(result.data) : [],
				dataPreview: result.data ? JSON.stringify(result.data).substring(0, 200) : 'no data'
			});
			
			if (result.success) {
				// Deep clone to ensure reactivity
				const loadedTranslations = result.data || {};
				
				// Force reactivity by creating a new object
				translations = JSON.parse(JSON.stringify(loadedTranslations));
				selectedLanguage = languageCode;
				expandedKeys.clear();
				expandedCategories.clear();
				
				// Force categories update by triggering reactivity
				categories = getCategories();
				logger.debug(`[Translations] Explicitly set categories, found ${categories.length} categories:`, categories);
				
				// Expand all categories by default
				categories.forEach(key => expandedCategories.add(key));
				
				logger.debug(`[Translations] Loaded ${categories.length} categories for ${languageCode}`);
				
				if (categories.length === 0) {
					logger.error(`[Translations] ERROR: No categories found for ${languageCode}!`, {
						translationsKeys: Object.keys(translations),
						translationsType: typeof translations,
						sampleKey: Object.keys(translations)[0],
						sampleValue: Object.keys(translations)[0] ? translations[Object.keys(translations)[0]] : null,
						sampleValueType: Object.keys(translations)[0] ? typeof translations[Object.keys(translations)[0]] : null,
						sampleValueIsObject: Object.keys(translations)[0] ? typeof translations[Object.keys(translations)[0]] === 'object' : false,
						sampleValueIsArray: Object.keys(translations)[0] ? Array.isArray(translations[Object.keys(translations)[0]]) : false
					});
				}
				
				// Load English translations for reference
				if (languageCode !== 'en') {
					try {
						const enResponse = await fetch(`/api/admin/translations?languageCode=en${cacheBuster}`);
						if (enResponse.ok) {
							const enResult = await enResponse.json();
							if (enResult.success) {
								englishTranslations = enResult.data;
							}
						}
					} catch (e) {
						logger.warn('Could not load English translations for reference:', e);
					}
				}
			} else {
				throw new Error(result.error || 'Failed to load translations');
			}
		} catch (err) {
			logger.error('Error loading translations:', err);
			error = handleError(err, 'Failed to load translations');
		} finally {
			loading = false;
		}
	}

	function openAutoTranslateDialog() {
		if (!selectedLanguage || selectedLanguage === 'en') {
			error = 'Cannot auto-translate English (source language)';
			return;
		}
		showAutoTranslateDialog = true;
	}

	function closeAutoTranslateDialog() {
		showAutoTranslateDialog = false;
	}

	function countMissingTranslations(): number {
		if (!selectedLanguage || selectedLanguage === 'en') return 0;
		
		let count = 0;
		const countMissing = (obj: any, target: any, prefix = '') => {
			for (const key in obj) {
				const fullKey = prefix ? `${prefix}.${key}` : key;
				const sourceValue = obj[key];
				const targetValue = getNestedValue(target, fullKey);
				
				if (typeof sourceValue === 'string' && sourceValue.trim() !== '') {
					if (!targetValue || (typeof targetValue === 'string' && targetValue.trim() === '')) {
						count++;
					}
				} else if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
					const targetObj = targetValue || {};
					countMissing(sourceValue, targetObj, fullKey);
				}
			}
		};
		
		countMissing(englishTranslations, translations);
		return count;
	}

	async function confirmAutoTranslate() {
		if (!selectedLanguage || selectedLanguage === 'en') {
			error = 'Cannot auto-translate English (source language)';
			return;
		}

		closeAutoTranslateDialog();

		// Count missing translations first
		const totalMissing = countMissingTranslations();
		
		if (totalMissing === 0) {
			message = 'No missing translations found!';
			setTimeout(() => {
				message = '';
			}, 3000);
			return;
		}

		// Initialize progress
		translationProgress = {
			current: 0,
			total: totalMissing,
			currentKey: ''
		};

		try {
			autoTranslating = true;
			error = '';
			message = '';
			
			const startTime = Date.now();
			const estimatedTimePerTranslation = 200; // milliseconds per translation
			const estimatedTotalTime = totalMissing * estimatedTimePerTranslation;
			
			// Start progress simulation (since backend processes in one go)
			const progressInterval = setInterval(() => {
				if (autoTranslating && translationProgress.current < translationProgress.total) {
					const elapsed = Date.now() - startTime;
					// Calculate progress based on elapsed time vs estimated total time
					const timeBasedProgress = Math.min(
						Math.floor((elapsed / estimatedTotalTime) * translationProgress.total),
						translationProgress.total
					);
					
					// Use the higher of time-based or incremental progress
					const incrementalProgress = Math.min(
						translationProgress.current + Math.ceil(translationProgress.total / 30),
						translationProgress.total
					);
					
					const newProgress = Math.max(timeBasedProgress, incrementalProgress);
					
					translationProgress = {
						...translationProgress,
						current: Math.min(newProgress, translationProgress.total)
					};
				} else {
					clearInterval(progressInterval);
				}
			}, 300);
			
			const response = await fetch(`/api/admin/translations?languageCode=${selectedLanguage}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					action: 'auto-translate',
					sourceLanguageCode: 'en'
				})
			});

			clearInterval(progressInterval);

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to auto-translate');
			}

			const result = await response.json();
			if (result.success) {
				// Set final progress
				translationProgress = {
					current: result.data.translated || translationProgress.total,
					total: translationProgress.total,
					currentKey: ''
				};
				
				const translatedCount = result.data.translated || 0;
				message = result.data.message || `Auto-translation completed! Translated ${translatedCount} keys.`;
				
				// Wait longer for file system to sync (Windows file system can be slow)
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				// Force reload translations by clearing cache and reloading
				if (selectedLanguage) {
					const langCode = selectedLanguage;
					translations = {};
					englishTranslations = {};
					
					logger.debug(`[Translations] Force reloading translations for ${langCode}...`);
					await loadTranslations(langCode, true); // Force reload with cache busting
					
					// Wait a bit more and verify
					await new Promise(resolve => setTimeout(resolve, 500));
					
					// Verify translations were loaded
					const missingAfter = countMissingTranslations();
					const totalKeys = getAllKeys(translations).length;
					
					console.log(`[Translations] After reload: ${totalKeys} total keys, ${missingAfter} missing`);
					
					if (missingAfter < totalMissing) {
						message = `Success! Translated ${translatedCount} keys. ${missingAfter} keys still missing.`;
					} else if (totalKeys > 0) {
						// Translations loaded but count might be wrong - check if we actually have translations
						const sampleKey = getAllKeys(translations)[0];
						const sampleValue = getNestedValue(translations, sampleKey);
						if (sampleValue && typeof sampleValue === 'string' && sampleValue.trim() !== '') {
							message = `Translations loaded successfully! Check the editor to verify.`;
						} else {
							console.warn('[Translations] Translations reloaded but appear empty. File may not have been saved correctly.');
							message = `Translation completed but reload failed. Please refresh the page manually.`;
						}
					} else {
						console.warn('[Translations] No translations loaded after reload. File may not exist or be empty.');
						message = `Translation completed but failed to reload. Please refresh the page manually.`;
					}
				}
				
				// Reset progress after a moment
				setTimeout(() => {
					translationProgress = { current: 0, total: 0, currentKey: '' };
					message = '';
				}, 5000);
			} else {
				throw new Error(result.error || 'Failed to auto-translate');
			}
		} catch (err) {
			console.error('Error auto-translating:', err);
			error = err instanceof Error ? err.message : 'Failed to auto-translate';
			translationProgress = { current: 0, total: 0, currentKey: '' };
		} finally {
			autoTranslating = false;
		}
	}

	async function saveTranslations() {
		if (!selectedLanguage) return;

		try {
			saving = true;
			message = '';
			error = '';
			const response = await fetch(`/api/admin/translations?languageCode=${selectedLanguage}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(translations)
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to save translations');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Translations saved successfully!';
				setTimeout(() => {
					message = '';
					// Reload page to refresh translations in the app
					if (typeof window !== 'undefined') {
						window.location.reload();
					}
				}, 2000);
			} else {
				throw new Error(result.error || 'Failed to save translations');
			}
		} catch (err) {
			console.error('Error saving translations:', err);
			error = err instanceof Error ? err.message : 'Failed to save translations';
		} finally {
			saving = false;
		}
	}

	async function createLanguage() {
		if (!newLanguageCode || !newLanguageName) {
			error = 'Language code and name are required';
			return;
		}

		try {
			saving = true;
			error = '';
			const response = await fetch('/api/admin/translations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					languageCode: newLanguageCode.toLowerCase(),
					name: newLanguageName,
					flag: newLanguageFlag
				})
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to create language');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Language created successfully!';
				showAddLanguageDialog = false;
				newLanguageCode = '';
				newLanguageName = '';
				newLanguageFlag = '🌐';
				await loadLanguages();
				setTimeout(() => {
					message = '';
				}, 3000);
			} else {
				throw new Error(result.error || 'Failed to create language');
			}
		} catch (err) {
			console.error('Error creating language:', err);
			error = err instanceof Error ? err.message : 'Failed to create language';
		} finally {
			saving = false;
		}
	}

	function openDeleteLanguageDialog(languageCode: string) {
		if (languageCode === 'en') {
			error = 'Cannot delete English language (default fallback)';
			return;
		}
		languageToDelete = languageCode;
		showDeleteLanguageDialog = true;
	}

	function closeDeleteLanguageDialog() {
		showDeleteLanguageDialog = false;
		languageToDelete = null;
	}

	async function confirmDeleteLanguage() {
		if (!languageToDelete) return;
		
		const languageCode = languageToDelete;
		closeDeleteLanguageDialog();

		try {
			deleting = true;
			error = '';
			const response = await fetch(`/api/admin/translations?languageCode=${languageCode}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to delete language');
			}

			const result = await response.json();
			if (result.success) {
				message = 'Language deleted successfully!';
				if (selectedLanguage === languageCode) {
					selectedLanguage = null;
					translations = {};
				}
				await loadLanguages();
				setTimeout(() => {
					message = '';
				}, 3000);
			} else {
				throw new Error(result.error || 'Failed to delete language');
			}
		} catch (err) {
			console.error('Error deleting language:', err);
			error = err instanceof Error ? err.message : 'Failed to delete language';
		} finally {
			deleting = false;
		}
	}

	function startEdit(key: string, value: string) {
		editingKey = key;
		editingValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
	}

	function cancelEdit() {
		editingKey = null;
		editingValue = '';
	}

	function saveEdit(key: string) {
		try {
			// Parse the value - if it's valid JSON, use it, otherwise treat as string
			let parsedValue: any;
			try {
				parsedValue = JSON.parse(editingValue);
			} catch {
				parsedValue = editingValue;
			}

			setNestedValue(translations, key, parsedValue);
			translations = { ...translations }; // Trigger reactivity
			cancelEdit();
		} catch (err) {
			error = 'Invalid value format';
		}
	}

	function setNestedValue(obj: any, path: string, value: any) {
		const parts = path.split('.');
		let current = obj;
		for (let i = 0; i < parts.length - 1; i++) {
			if (!(parts[i] in current)) {
				current[parts[i]] = {};
			}
			current = current[parts[i]];
		}
		current[parts[parts.length - 1]] = value;
	}

	function getNestedValue(obj: any, path: string): any {
		const parts = path.split('.');
		let current = obj;
		for (const part of parts) {
			if (current && typeof current === 'object' && part in current) {
				current = current[part];
			} else {
				return undefined;
			}
		}
		return current;
	}

	function toggleExpand(key: string) {
		if (expandedKeys.has(key)) {
			expandedKeys.delete(key);
		} else {
			expandedKeys.add(key);
		}
		expandedKeys = expandedKeys; // Trigger reactivity
	}

	function getAllKeys(obj: any, prefix = ''): string[] {
		const keys: string[] = [];
		for (const key in obj) {
			const fullKey = prefix ? `${prefix}.${key}` : key;
			if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
				keys.push(...getAllKeys(obj[key], fullKey));
			} else {
				keys.push(fullKey);
			}
		}
		return keys;
	}

	function filterKeys(keys: string[], search: string): string[] {
		if (!search) return keys;
		const lowerSearch = search.toLowerCase();
		return keys.filter(key => key.toLowerCase().includes(lowerSearch));
	}

	function getCategories(): string[] {
		const keys = Object.keys(translations);
		if (keys.length === 0) {
			return [];
		}
		
		console.log('[Translations] getCategories called with:', {
			keysCount: keys.length,
			keys: keys.slice(0, 5),
			translationsType: typeof translations,
			translationsConstructor: translations.constructor?.name
		});
		
		const categories: string[] = [];
		for (const key of keys) {
			const value = translations[key];
			const valueType = typeof value;
			const isNull = value === null;
			const isUndefined = value === undefined;
			const isArray = Array.isArray(value);
			const isObject = valueType === 'object' && !isNull && !isArray;
			
			console.log(`[Translations] Checking key "${key}":`, {
				valueType,
				isNull,
				isUndefined,
				isArray,
				isObject,
				valuePreview: value && typeof value === 'object' ? Object.keys(value).slice(0, 3) : String(value).substring(0, 50)
			});
			
			if (isObject) {
				categories.push(key);
			}
		}
		
		console.log('[Translations] getCategories result:', {
			categoriesCount: categories.length,
			categories: categories
		});
		
		return categories;
	}

	function getCategoryKeys(category: string): string[] {
		const categoryObj = translations[category];
		if (!categoryObj || typeof categoryObj !== 'object') return [];
		
		const keys: string[] = [];
		const extractKeys = (obj: any, prefix: string = '') => {
			for (const key in obj) {
				const fullKey = prefix ? `${prefix}.${key}` : key;
				if (typeof obj[key] === 'string') {
					keys.push(fullKey);
				} else if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
					extractKeys(obj[key], fullKey);
				}
			}
		};
		extractKeys(categoryObj);
		return keys;
	}

	function isCategoryExpanded(category: string): boolean {
		return expandedCategories.has(category);
	}

	function toggleCategory(category: string) {
		if (expandedCategories.has(category)) {
			expandedCategories.delete(category);
		} else {
			expandedCategories.add(category);
		}
		expandedCategories = expandedCategories; // Trigger reactivity
	}

	function getMissingCount(category: string): number {
		const keys = getCategoryKeys(category);
		return keys.filter(key => {
			const value = getNestedValue(translations, `${category}.${key}`);
			return !value || (typeof value === 'string' && value.trim() === '');
		}).length;
	}

	// Store categories explicitly instead of relying on reactive statement
	let categories: string[] = [];
	
	$: allKeys = getAllKeys(translations);
	$: filteredKeys = filterKeys(allKeys, searchTerm);
	$: {
		// Update categories when translations change
		if (Object.keys(translations).length > 0) {
			const newCategories = getCategories();
			if (newCategories.length !== categories.length || newCategories.some((cat, i) => cat !== categories[i])) {
				categories = newCategories;
			}
		} else {
			categories = [];
		}
	}
	$: filteredCategories = searchTerm 
		? categories.filter(cat => {
			const catKeys = getCategoryKeys(cat);
			return catKeys.some(key => key.toLowerCase().includes(searchTerm.toLowerCase()));
		})
		: categories;
</script>

<svelte:head>
	<title>Translation Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-7xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<h1 class="text-2xl font-bold text-gray-900">Translation Management</h1>
				<div class="flex gap-2">
					<button
						type="button"
						on:click={() => (showAddLanguageDialog = true)}
						class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
					>
						+ Add Language
					</button>
					<a href="/admin" class="text-blue-600 hover:text-blue-800 text-sm">Back to Admin</a>
				</div>
			</div>

			{#if message}
				<div class="mb-4 p-4 bg-green-50 text-green-800 border border-green-300 rounded-lg">
					{message}
				</div>
			{/if}

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-800 border border-red-300 rounded-lg">
					{error}
				</div>
			{/if}

			{#if autoTranslating && translationProgress.total > 0}
				<div class="mb-4 p-4 bg-blue-50 border border-blue-300 rounded-lg">
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-medium text-blue-900">
							Translating missing translations...
						</span>
						<span class="text-sm text-blue-700">
							{translationProgress.current} / {translationProgress.total}
						</span>
					</div>
					<div class="w-full bg-blue-200 rounded-full h-2.5">
						<div
							class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
							style="width: {Math.min((translationProgress.current / translationProgress.total) * 100, 100)}%"
						></div>
					</div>
					{#if translationProgress.currentKey}
						<p class="mt-2 text-xs text-blue-700 truncate">
							Translating: {translationProgress.currentKey}
						</p>
					{/if}
				</div>
			{/if}

			{#if loading && !selectedLanguage}
				<div class="text-center py-12">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
					<p class="mt-4 text-gray-600">Loading languages...</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<!-- Language List -->
					<div class="lg:col-span-1">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">Languages</h2>
						<div class="space-y-2">
							{#each languages as lang}
								<div
									class="p-3 rounded-lg border cursor-pointer transition-colors {selectedLanguage === lang.code
										? 'bg-blue-50 border-blue-500'
										: 'bg-gray-50 border-gray-200 hover:bg-gray-100'}"
									on:click={() => loadTranslations(lang.code)}
								>
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<span class="text-xl">{lang.flag}</span>
											<span class="font-medium text-gray-900">{lang.name}</span>
											<span class="text-sm text-gray-500">({lang.code})</span>
										</div>
										{#if lang.code !== 'en'}
											<button
												type="button"
												on:click|stopPropagation={() => openDeleteLanguageDialog(lang.code)}
												class="text-red-600 hover:text-red-800 text-sm"
												disabled={deleting}
											>
												Delete
											</button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Translation Editor -->
					<div class="lg:col-span-2">
						{#if selectedLanguage}
							<div class="mb-4">
								<div class="flex items-center justify-between mb-4">
									<h2 class="text-lg font-semibold text-gray-900">
										Editing: {languages.find(l => l.code === selectedLanguage)?.name || selectedLanguage}
									</h2>
									{#if selectedLanguage !== 'en'}
										<button
											type="button"
											on:click={openAutoTranslateDialog}
											disabled={autoTranslating || saving}
											class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
										>
											{#if autoTranslating}
												<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
												<span>Translating...</span>
											{:else}
												<span>🌐</span>
												<span>Auto Translate Missing</span>
											{/if}
										</button>
									{/if}
								</div>
								
								<div class="mb-4">
									<input
										type="text"
										bind:value={searchTerm}
										placeholder="Search translations..."
										class="w-full px-3 py-2 border border-gray-300 rounded-md"
									/>
								</div>

								{#if loading}
									<div class="text-center py-12">
										<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
										<p class="mt-4 text-gray-600">Loading translations...</p>
									</div>
								{:else}
									<div class="border border-gray-200 rounded-lg overflow-hidden">
										{#if filteredKeys.length === 0}
											<div class="text-center py-8">
												{#if Object.keys(translations).length === 0}
													<p class="text-gray-500 mb-2">No translations loaded</p>
													<p class="text-xs text-gray-400">Translations object is empty. Check console for errors.</p>
												{:else if searchTerm}
													<p class="text-gray-500">No translations match your search</p>
												{:else}
													<p class="text-gray-500">No translations found</p>
												{/if}
											</div>
										{:else}
											<div class="overflow-x-auto max-h-[600px] overflow-y-auto">
												<table class="min-w-full divide-y divide-gray-200">
													<thead class="bg-gray-50 sticky top-0 z-10">
														<tr>
															<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Keyword
															</th>
															<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Original (EN)
															</th>
															<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Translation
															</th>
															<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
																Actions
															</th>
														</tr>
													</thead>
													<tbody class="bg-white divide-y divide-gray-200">
														{#each filteredKeys as key}
															{@const value = getNestedValue(translations, key)}
															{@const englishValue = selectedLanguage !== 'en' ? getNestedValue(englishTranslations, key) : value}
															{@const isEditing = editingKey === key}
															{@const isMissing = !value || (typeof value === 'string' && value.trim() === '')}
															<tr class="{isMissing ? 'bg-yellow-50' : 'hover:bg-gray-50'}">
																<td class="px-4 py-3 whitespace-nowrap">
																	<div class="text-sm font-medium text-gray-900">{key}</div>
																</td>
																<td class="px-4 py-3">
																	<div class="text-sm text-gray-600 break-words max-w-md">
																		{englishValue ? (typeof englishValue === 'string' ? englishValue : JSON.stringify(englishValue)) : '-'}
																	</div>
																</td>
																<td class="px-4 py-3">
																	{#if isEditing}
																		<textarea
																			bind:value={editingValue}
																			class="w-full px-2 py-1 border border-gray-300 rounded text-sm"
																			rows={2}
																			placeholder={englishValue || 'Enter translation...'}
																		></textarea>
																		<div class="flex gap-2 mt-2">
																			<button
																				type="button"
																				on:click={() => saveEdit(key)}
																				class="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
																			>
																				Save
																			</button>
																			<button
																				type="button"
																				on:click={cancelEdit}
																				class="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
																			>
																				Cancel
																			</button>
																		</div>
																	{:else}
																		<div class="text-sm text-gray-600 break-words max-w-md">
																			{#if isMissing}
																				<span class="text-yellow-600 italic">Missing translation</span>
																			{:else}
																				{typeof value === 'string' ? value : JSON.stringify(value)}
																			{/if}
																		</div>
																	{/if}
																</td>
																<td class="px-4 py-3 whitespace-nowrap text-right">
																	{#if !isEditing}
																		<button
																			type="button"
																			on:click={() => startEdit(key, value || englishValue || '')}
																			class="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
																			title={isMissing ? 'Add Translation' : 'Edit Translation'}
																		>
																			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
																			</svg>
																		</button>
																	{/if}
																</td>
															</tr>
														{/each}
													</tbody>
												</table>
											</div>
										{/if}
									</div>

									<div class="mt-4 flex justify-end">
										<button
											type="button"
											on:click={saveTranslations}
											disabled={saving}
											class="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{saving ? 'Saving...' : 'Save Translations'}
										</button>
									</div>
								{/if}
							</div>
						{:else}
							<div class="text-center py-12 text-gray-500">
								<p>Select a language to edit translations</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Add Language Dialog -->
{#if showAddLanguageDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Add New Language</h3>
			
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Language Code</label>
					<input
						type="text"
						bind:value={newLanguageCode}
						placeholder="e.g., fr, de, es"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
						on:input={(e) => {
							newLanguageCode = e.currentTarget.value.toLowerCase();
							// Auto-fill name and flag if available
							if (languageMetadata[newLanguageCode]) {
								newLanguageName = languageMetadata[newLanguageCode].name;
								newLanguageFlag = languageMetadata[newLanguageCode].flag;
							}
						}}
					/>
					<p class="text-xs text-gray-500 mt-1">ISO 639-1 language code (2 letters)</p>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Language Name</label>
					<input
						type="text"
						bind:value={newLanguageName}
						placeholder="e.g., French, German, Spanish"
						class="w-full px-3 py-2 border border-gray-300 rounded-md"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Flag Emoji</label>
					<input
										type="text"
										bind:value={newLanguageFlag}
										placeholder="🇫🇷"
										class="w-full px-3 py-2 border border-gray-300 rounded-md"
									/>
				</div>
			</div>

			<div class="flex justify-end gap-2 mt-6">
				<button
					type="button"
					on:click={() => {
						showAddLanguageDialog = false;
						newLanguageCode = '';
						newLanguageName = '';
						newLanguageFlag = '🌐';
					}}
					class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
				>
					Cancel
				</button>
				<button
					type="button"
					on:click={createLanguage}
					disabled={saving || !newLanguageCode || !newLanguageName}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
				>
					{saving ? 'Creating...' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Auto-Translate Confirmation Dialog -->
<ConfirmDialog
	isOpen={showAutoTranslateDialog}
	title="Auto-Translate Missing Translations"
	message="This will automatically translate all missing translations from English to {languages.find(l => l.code === selectedLanguage)?.name || selectedLanguage || ''}. This may take a few moments. Continue?"
	confirmText={autoTranslating ? 'Translating...' : 'Continue'}
	cancelText="Cancel"
	variant="default"
	disabled={autoTranslating}
	on:confirm={confirmAutoTranslate}
	on:cancel={closeAutoTranslateDialog}
/>

<!-- Delete Language Confirmation Dialog -->
<ConfirmDialog
	isOpen={showDeleteLanguageDialog}
	title="Delete Language"
	message="Are you sure you want to delete language &quot;{languageToDelete}&quot;? This action cannot be undone."
	confirmText={deleting ? 'Deleting...' : 'Delete'}
	cancelText="Cancel"
	variant="danger"
	disabled={deleting}
	on:confirm={confirmDeleteLanguage}
	on:cancel={closeDeleteLanguageDialog}
/>
