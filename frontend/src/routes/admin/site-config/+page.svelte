<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { SiteConfig } from '$lib/types/site-config';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';

	let config: SiteConfig | null = null;
	let loading = true;
	let saving = false;
	let message = '';
	let activeTab = 'basic';
	let availableLanguages: Array<{ code: string; name: string; flag: string }> = [];

	onMount(async () => {
		await Promise.all([loadConfig(), loadAvailableLanguages()]);
	});

	async function loadConfig() {
		try {
			const response = await fetch('/api/admin/site-config');
			if (!response.ok) {
				throw new Error('Failed to load configuration');
			}
			const data = await response.json();
			// Ensure socialMedia object is properly initialized
			if (data.contact && (!data.contact.socialMedia || typeof data.contact.socialMedia !== 'object')) {
				data.contact.socialMedia = {
					facebook: '',
					instagram: '',
					twitter: '',
					linkedin: ''
				};
			}
			config = data;
		} catch (error) {
			console.error('Error loading site config:', error);
			message = 'Failed to load configuration';
		} finally {
			loading = false;
		}
	}

	async function loadAvailableLanguages() {
		try {
			const response = await fetch('/api/admin/languages');
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					availableLanguages = data.data;
				} else {
					// Fallback to default languages
					availableLanguages = SUPPORTED_LANGUAGES.map((lang) => ({
						code: lang.code,
						name: lang.name,
						flag: lang.flag || ''
					}));
				}
			} else {
				// Fallback to default languages
				availableLanguages = SUPPORTED_LANGUAGES.map((lang) => ({
					code: lang.code,
					name: lang.name,
					flag: lang.flag || ''
				}));
			}
		} catch (error) {
			console.error('Error loading available languages:', error);
			// Fallback to default languages
			availableLanguages = SUPPORTED_LANGUAGES.map((lang) => ({
				code: lang.code,
				name: lang.name,
				flag: lang.flag || ''
			}));
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!config) return;

		saving = true;
		message = '';

		try {
			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title: config.title,
					description: config.description,
					logo: config.logo,
					favicon: config.favicon,
					languages: config.languages,
					seo: config.seo,
					theme: config.theme,
					contact: config.contact,
					homePage: config.homePage,
					features: config.features,
					template: config.template
				})
			});

			if (!response.ok) {
				throw new Error('Failed to save configuration');
			}

			const data = await response.json();
			config = data;
			message = 'successfully';

			// Redirect after 2 seconds
			setTimeout(() => {
				goto('/admin');
			}, 2000);
		} catch (error) {
			console.error('Error saving site config:', error);
			message = 'Failed to save configuration';
		} finally {
			saving = false;
		}
	}

	function updateConfig(field: string, value: any) {
		if (!config) return;
		config = { ...config, [field]: value };
	}

	function updateLanguages(activeLanguages: string[], defaultLanguage: string) {
		if (!config) return;
		config = {
			...config,
			languages: {
				...config.languages,
				activeLanguages,
				defaultLanguage
			}
		};
	}

	async function handleFileUpload(file: File, type: 'logo' | 'favicon') {
		if (!config) return;

		// Validate file size (5MB limit)
		const maxSize = 5 * 1024 * 1024;
		if (file.size > maxSize) {
			message = 'File size must be less than 5MB';
			return;
		}

		// Validate file type
		const allowedTypes = type === 'logo'
			? ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
			: ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/jpeg'];
		
		if (!allowedTypes.includes(file.type)) {
			message = `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`;
			return;
		}

		try {
			// Create FormData
			const formData = new FormData();
			formData.append('file', file);

			// Upload file
			const response = await fetch('/api/admin/site-config/upload-asset', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Upload failed');
			}

			const result = await response.json();
			
			// Update config with the uploaded URL
			if (type === 'logo') {
				config = { ...config, logo: result.url };
			} else {
				config = { ...config, favicon: result.url };
			}

			message = `${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully!`;
			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (error) {
			console.error(`Failed to upload ${type}:`, error);
			message = `Failed to upload ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`;
		}
	}
</script>

<svelte:head>
	<title>Site Configuration - Admin</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-4 text-gray-600">Loading configuration...</p>
		</div>
	</div>
{:else if !config}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<p class="text-red-600">Failed to load configuration</p>
			<a href="/admin" class="mt-4 text-blue-600 hover:text-blue-800">Back to Admin</a>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-4xl mx-auto px-4">
			<div class="bg-white rounded-lg shadow-md p-6">
				<div class="flex items-center justify-between mb-6">
					<h1 class="text-2xl font-bold text-gray-900">Site Configuration</h1>
					<a href="/admin" class="text-blue-600 hover:text-blue-800 text-sm">Back to Admin</a>
				</div>

				{#if message}
					<div
						class="mb-6 p-6 rounded-lg border-2 {message.includes('successfully')
							? 'bg-green-50 text-green-800 border-green-300 shadow-lg'
							: 'bg-red-50 text-red-800 border-red-300 shadow-lg'}"
					>
						<div class="flex items-center">
							{#if message.includes('successfully')}
								<svg
									class="w-6 h-6 text-green-600 mr-3"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							{:else}
								<svg
									class="w-6 h-6 text-red-600 mr-3"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							{/if}
							<div>
								<h3
									class="text-lg font-semibold {message.includes('successfully')
										? 'text-green-800'
										: 'text-red-800'}"
								>
									{message.includes('successfully') ? 'Success!' : 'Error'}
								</h3>
								<p
									class="text-sm {message.includes('successfully')
										? 'text-green-700'
										: 'text-red-700'}"
								>
									{message.includes('successfully')
										? 'Your site configuration has been saved successfully. Redirecting to admin dashboard...'
										: message}
								</p>
							</div>
						</div>
					</div>
				{/if}

				<form on:submit|preventDefault={handleSubmit} class="space-y-6">
					<!-- Tabs -->
					<div class="border-b border-gray-200 mb-4">
						<nav class="-mb-px flex space-x-8">
							<button
								type="button"
								class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'basic'
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
								on:click={() => (activeTab = 'basic')}
							>
								Basic Settings
							</button>
							<button
								type="button"
								class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'languages'
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
								on:click={() => (activeTab = 'languages')}
							>
								Languages
							</button>
							<button
								type="button"
								class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'branding'
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
								on:click={() => (activeTab = 'branding')}
							>
								Branding
							</button>
							<button
								type="button"
								class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'seo'
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
								on:click={() => (activeTab = 'seo')}
							>
								SEO
							</button>
							<button
								type="button"
								class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'contact'
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
								on:click={() => (activeTab = 'contact')}
							>
								Contact
							</button>
							<button
								type="button"
								class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'home'
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
								on:click={() => (activeTab = 'home')}
							>
								Services
							</button>
						</nav>
					</div>

					<!-- Tab Content -->
					{#if activeTab === 'basic'}
						<div class="grid grid-cols-1 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Site Title
								</label>
								<MultiLangInput
									value={config.title || {}}
									onChange={(value) => updateConfig('title', value)}
									placeholder="Enter site title..."
									required={true}
									maxLength={100}
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Site Description
								</label>
								<MultiLangHTMLEditor
									value={config.description || {}}
									onChange={(value) => updateConfig('description', value)}
									placeholder="Enter site description..."
									height={150}
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
							</div>
						</div>
					{:else if activeTab === 'languages'}
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Active Languages
								</label>
								<p class="text-sm text-gray-600 mb-3">
									Select which languages are available for content editing. Only selected languages
									will appear in multi-language fields.
								</p>
								<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
									{#each availableLanguages as lang}
										{@const isActive = config.languages?.activeLanguages?.includes(lang.code) || false}
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												type="checkbox"
												checked={isActive}
												on:change={(e) => {
													const currentLanguages = config.languages?.activeLanguages || [];
													const newLanguages = e.currentTarget.checked
														? [...currentLanguages, lang.code]
														: currentLanguages.filter((l: string) => l !== lang.code);
													updateLanguages(
														newLanguages,
														config.languages?.defaultLanguage || 'en'
													);
												}}
												class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											/>
											<span class="text-lg">{lang.flag}</span>
											<span class="text-sm text-gray-700">{lang.name}</span>
										</label>
									{/each}
								</div>
							</div>
							<div>
								<label for="defaultLanguage" class="block text-sm font-medium text-gray-700 mb-1">
									Default Language
								</label>
								<select
									id="defaultLanguage"
									value={config.languages?.defaultLanguage || 'en'}
									on:change={(e) => {
										updateLanguages(
											config.languages?.activeLanguages || ['en'],
											e.currentTarget.value
										);
									}}
									class="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								>
									{#each (config.languages?.activeLanguages || ['en']) as langCode}
										{@const lang = availableLanguages.find((l) => l.code === langCode)}
										<option value={langCode}>{lang?.name || langCode}</option>
									{/each}
								</select>
								<p class="text-xs text-gray-500 mt-1">
									The default language will be used when content is not available in the user's
									preferred language.
								</p>
							</div>
						</div>
					{:else if activeTab === 'branding'}
						<div class="grid grid-cols-1 gap-6">
							<!-- Logo -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Logo
								</label>
								<div class="flex gap-4 items-start">
									<div class="flex-1">
										<input
											type="file"
											accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
											on:change={async (e) => {
												const file = e.currentTarget.files?.[0];
												if (file) {
													await handleFileUpload(file, 'logo');
												}
											}}
											class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
										/>
										<p class="mt-1 text-xs text-gray-500">
											Upload your logo image. Recommended size: 200x50px or similar aspect ratio. Max size: 5MB.
										</p>
										{#if config.logo}
											<div class="mt-3">
												<label class="block text-xs text-gray-600 mb-2">Current Logo URL (you can edit manually):</label>
												<input
													type="text"
													value={config.logo}
													on:input={(e) => updateConfig('logo', e.currentTarget.value)}
													placeholder="/api/storage/serve/..."
													class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
												/>
											</div>
										{/if}
									</div>
									{#if config.logo}
										<div class="mt-8">
											<p class="text-xs text-gray-600 mb-2">Preview:</p>
											<img
												src={config.logo}
												alt="Logo preview"
												class="max-h-16 object-contain border border-gray-200 rounded p-2 bg-gray-50"
												on:error={(e) => {
													e.currentTarget.style.display = 'none';
												}}
											/>
										</div>
									{/if}
								</div>
							</div>

							<!-- Favicon -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Favicon
								</label>
								<div class="flex gap-4 items-start">
									<div class="flex-1">
										<input
											type="file"
											accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/jpeg"
											on:change={async (e) => {
												const file = e.currentTarget.files?.[0];
												if (file) {
													await handleFileUpload(file, 'favicon');
												}
											}}
											class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
										/>
										<p class="mt-1 text-xs text-gray-500">
											Upload your favicon. Recommended size: 32x32px or 16x16px (ICO or PNG format). Max size: 5MB.
										</p>
										{#if config.favicon}
											<div class="mt-3">
												<label class="block text-xs text-gray-600 mb-2">Current Favicon URL (you can edit manually):</label>
												<input
													type="text"
													value={config.favicon}
													on:input={(e) => updateConfig('favicon', e.currentTarget.value)}
													placeholder="/api/storage/serve/..."
													class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
												/>
											</div>
										{/if}
									</div>
									{#if config.favicon}
										<div class="mt-8">
											<p class="text-xs text-gray-600 mb-2">Preview:</p>
											<img
												src={config.favicon}
												alt="Favicon preview"
												class="w-8 h-8 object-contain border border-gray-200 rounded p-1 bg-gray-50"
												on:error={(e) => {
													e.currentTarget.style.display = 'none';
												}}
											/>
										</div>
									{/if}
								</div>
							</div>

							<!-- Theme Colors -->
							<div class="border-t border-gray-200 pt-6">
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Theme Colors</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<!-- Primary Color -->
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Primary Color
										</label>
										<div class="flex gap-2">
											<input
												type="color"
												value={config.theme?.primaryColor || '#0ea5e9'}
												on:input={(e) => {
													config = {
														...config,
														theme: {
															...config.theme,
															primaryColor: e.currentTarget.value
														}
													};
												}}
												class="w-16 h-10 border border-gray-300 rounded cursor-pointer"
											/>
											<input
												type="text"
												value={config.theme?.primaryColor || '#0ea5e9'}
												on:input={(e) => {
													config = {
														...config,
														theme: {
															...config.theme,
															primaryColor: e.currentTarget.value
														}
													};
												}}
												placeholder="#0ea5e9"
												class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
											/>
										</div>
									</div>

									<!-- Secondary Color -->
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Secondary Color
										</label>
										<div class="flex gap-2">
											<input
												type="color"
												value={config.theme?.secondaryColor || '#64748b'}
												on:input={(e) => {
													config = {
														...config,
														theme: {
															...config.theme,
															secondaryColor: e.currentTarget.value
														}
													};
												}}
												class="w-16 h-10 border border-gray-300 rounded cursor-pointer"
											/>
											<input
												type="text"
												value={config.theme?.secondaryColor || '#64748b'}
												on:input={(e) => {
													config = {
														...config,
														theme: {
															...config.theme,
															secondaryColor: e.currentTarget.value
														}
													};
												}}
												placeholder="#64748b"
												class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
											/>
										</div>
									</div>

									<!-- Background Color -->
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Background Color
										</label>
										<div class="flex gap-2">
											<input
												type="color"
												value={config.theme?.backgroundColor || '#ffffff'}
												on:input={(e) => {
													config = {
														...config,
														theme: {
															...config.theme,
															backgroundColor: e.currentTarget.value
														}
													};
												}}
												class="w-16 h-10 border border-gray-300 rounded cursor-pointer"
											/>
											<input
												type="text"
												value={config.theme?.backgroundColor || '#ffffff'}
												on:input={(e) => {
													config = {
														...config,
														theme: {
															...config.theme,
															backgroundColor: e.currentTarget.value
														}
													};
												}}
												placeholder="#ffffff"
												class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
											/>
										</div>
									</div>

									<!-- Text Color -->
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Text Color
										</label>
										<div class="flex gap-2">
											<input
												type="color"
												value={config.theme?.textColor || '#1e293b'}
												on:input={(e) => {
													config = {
														...config,
														theme: {
															...config.theme,
															textColor: e.currentTarget.value
														}
													};
												}}
												class="w-16 h-10 border border-gray-300 rounded cursor-pointer"
											/>
											<input
												type="text"
												value={config.theme?.textColor || '#1e293b'}
												on:input={(e) => {
													config = {
														...config,
														theme: {
															...config.theme,
															textColor: e.currentTarget.value
														}
													};
												}}
												placeholder="#1e293b"
												class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
											/>
										</div>
									</div>
								</div>

								<!-- Color Preview -->
								<div class="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
									<p class="text-sm font-medium text-gray-700 mb-3">Color Preview:</p>
									<div
										class="p-4 rounded-lg"
										style="background-color: {config.theme?.backgroundColor || '#ffffff'}; color: {config.theme?.textColor || '#1e293b'};"
									>
										<div
											class="inline-block px-4 py-2 rounded-md text-white font-medium mb-2"
											style="background-color: {config.theme?.primaryColor || '#0ea5e9'};"
										>
											Primary Button
										</div>
										<div
											class="inline-block px-4 py-2 rounded-md text-white font-medium ml-2"
											style="background-color: {config.theme?.secondaryColor || '#64748b'};"
										>
											Secondary Button
										</div>
										<p class="mt-3">
											This is how your text will look with the selected colors.
										</p>
									</div>
								</div>
							</div>
						</div>
					{:else if activeTab === 'seo'}
						<div class="grid grid-cols-1 gap-6">
							<!-- Meta Title -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Meta Title
								</label>
								<MultiLangInput
									value={config.seo?.metaTitle || {}}
									onChange={(value) => {
										config = {
											...config,
											seo: {
												...config.seo,
												metaTitle: value
											}
										};
									}}
									placeholder="OpenShutter Gallery - Beautiful Photo Gallery"
									maxLength={60}
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
								<p class="mt-1 text-xs text-gray-500">
									Recommended length: 50-60 characters per language. This appears in browser tabs and search results.
								</p>
							</div>

							<!-- Meta Description -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Meta Description
								</label>
								<MultiLangInput
									value={config.seo?.metaDescription || {}}
									onChange={(value) => {
										config = {
											...config,
											seo: {
												...config.seo,
												metaDescription: value
											}
										};
									}}
									placeholder="Discover amazing photos in our beautiful gallery"
									maxLength={160}
									multiline={true}
									rows={3}
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
								<p class="mt-1 text-xs text-gray-500">
									Recommended length: 150-160 characters per language. This appears in search engine results.
								</p>
							</div>

							<!-- Meta Keywords -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Meta Keywords
								</label>
								<input
									type="text"
									value={(config.seo?.metaKeywords || []).join(', ')}
									on:input={(e) => {
										const keywords = e.currentTarget.value
											.split(',')
											.map((k) => k.trim())
											.filter((k) => k.length > 0);
										config = {
											...config,
											seo: {
												...config.seo,
												metaKeywords: keywords
											}
										};
									}}
									placeholder="gallery, photos, photography, images, art"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="mt-1 text-xs text-gray-500">
									Enter keywords separated by commas. These help search engines understand your content.
								</p>
							</div>

							<!-- OG Image -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Open Graph Image URL
								</label>
								<input
									type="text"
									value={config.seo?.ogImage || ''}
									on:input={(e) => {
										config = {
											...config,
											seo: {
												...config.seo,
												ogImage: e.currentTarget.value
											}
										};
									}}
									placeholder="/api/storage/serve/... or https://example.com/image.jpg"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="mt-1 text-xs text-gray-500">
									Optional. Image shown when your site is shared on social media. Recommended size: 1200x630px.
								</p>
								{#if config.seo?.ogImage}
									<div class="mt-3">
										<p class="text-xs text-gray-600 mb-2">Preview:</p>
										<img
											src={config.seo.ogImage}
											alt="OG Image preview"
											class="max-w-md h-32 object-contain border border-gray-200 rounded p-2 bg-gray-50"
											on:error={(e) => {
												e.currentTarget.style.display = 'none';
											}}
										/>
									</div>
								{/if}
							</div>
						</div>
					{:else if activeTab === 'contact'}
						<div class="grid grid-cols-1 gap-6">
							<!-- Email -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Email
								</label>
								<input
									type="email"
									value={config.contact?.email || ''}
									on:input={(e) => {
										config = {
											...config,
											contact: {
												...config.contact,
												email: e.currentTarget.value
											}
										};
									}}
									placeholder="contact@example.com"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>

							<!-- Phone -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Phone
								</label>
								<input
									type="tel"
									value={config.contact?.phone || ''}
									on:input={(e) => {
										config = {
											...config,
											contact: {
												...config.contact,
												phone: e.currentTarget.value
											}
										};
									}}
									placeholder="+1 (555) 123-4567"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>

							<!-- Address -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Address
								</label>
								<MultiLangInput
									value={config.contact?.address || {}}
									onChange={(value) => {
										config = {
											...config,
											contact: {
												...config.contact,
												address: value
											}
										};
									}}
									placeholder="Enter address..."
									multiline={true}
									rows={3}
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
							</div>

							<!-- Social Media -->
							<div class="border-t border-gray-200 pt-6">
								<h3 class="text-lg font-semibold text-gray-900 mb-4">Social Media</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<!-- Facebook -->
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Facebook URL
										</label>
										<input
											type="text"
											value={config.contact?.socialMedia?.facebook || ''}
											on:input={(e) => {
												config = {
													...config,
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															facebook: e.currentTarget.value
														}
													}
												};
											}}
											placeholder="https://facebook.com/yourpage"
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>

									<!-- Instagram -->
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Instagram URL
										</label>
										<input
											type="text"
											value={config.contact?.socialMedia?.instagram || ''}
											on:input={(e) => {
												config = {
													...config,
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															instagram: e.currentTarget.value
														}
													}
												};
											}}
											placeholder="https://instagram.com/yourprofile"
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>

									<!-- Twitter -->
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											Twitter URL
										</label>
										<input
											type="text"
											value={config.contact?.socialMedia?.twitter || ''}
											on:input={(e) => {
												config = {
													...config,
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															twitter: e.currentTarget.value
														}
													}
												};
											}}
											placeholder="https://twitter.com/yourhandle"
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>

									<!-- LinkedIn -->
									<div>
										<label class="block text-sm font-medium text-gray-700 mb-2">
											LinkedIn URL
										</label>
										<input
											type="text"
											value={config.contact?.socialMedia?.linkedin || ''}
											on:input={(e) => {
												config = {
													...config,
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															linkedin: e.currentTarget.value
														}
													}
												};
											}}
											placeholder="https://linkedin.com/company/yourcompany"
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>
								</div>
							</div>
						</div>
					{:else if activeTab === 'home'}
						<div class="grid grid-cols-1 gap-6">
							<!-- Contact Title -->
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Contact Section Title
								</label>
								<MultiLangInput
									value={config.homePage?.contactTitle || {}}
									onChange={(value) => {
										config = {
											...config,
											homePage: {
												...config.homePage,
												contactTitle: value
											}
										};
									}}
									placeholder="Get In Touch"
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
							</div>

							<!-- Services -->
							<div class="border-t border-gray-200 pt-6">
								<div class="flex items-center justify-between mb-4">
									<h3 class="text-lg font-semibold text-gray-900">Services</h3>
									<button
										type="button"
										on:click={() => {
											const services = config.homePage?.services || [];
											config = {
												...config,
												homePage: {
													...config.homePage,
													services: [
														...services,
														{
															number: String(services.length + 1),
															title: {},
															description: {}
														}
													]
												}
											};
										}}
										class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
									>
										+ Add Service
									</button>
								</div>

								{#if config.homePage?.services && config.homePage.services.length > 0}
									<div class="space-y-4">
										{#each config.homePage.services as service, index}
											<div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
												<div class="flex items-start justify-between mb-4">
													<h4 class="text-sm font-semibold text-gray-900">Service #{index + 1}</h4>
													<button
														type="button"
														on:click={() => {
															const services = config.homePage?.services || [];
															config = {
																...config,
																homePage: {
																	...config.homePage,
																	services: services.filter((_, i) => i !== index)
																}
															};
														}}
														class="text-red-600 hover:text-red-800 text-sm font-medium"
													>
														Remove
													</button>
												</div>

												<div class="grid grid-cols-1 gap-4">
													<!-- Service Number -->
													<div>
														<label class="block text-sm font-medium text-gray-700 mb-2">
															Service Number
														</label>
														<input
															type="text"
															value={service.number || ''}
															on:input={(e) => {
																const services = config.homePage?.services || [];
																services[index] = {
																	...services[index],
																	number: e.currentTarget.value
																};
																config = {
																	...config,
																	homePage: {
																		...config.homePage,
																		services: [...services]
																	}
																};
															}}
															placeholder="01"
															class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
														/>
													</div>

													<!-- Service Title -->
													<div>
														<label class="block text-sm font-medium text-gray-700 mb-2">
															Service Title
														</label>
														<MultiLangInput
															value={service.title || {}}
															onChange={(value) => {
																const services = config.homePage?.services || [];
																services[index] = {
																	...services[index],
																	title: value
																};
																config = {
																	...config,
																	homePage: {
																		...config.homePage,
																		services: [...services]
																	}
																};
															}}
															placeholder="Enter service title..."
															showLanguageTabs={true}
															defaultLanguage={config.languages?.defaultLanguage || 'en'}
														/>
													</div>

													<!-- Service Description -->
													<div>
														<label class="block text-sm font-medium text-gray-700 mb-2">
															Service Description
														</label>
														<MultiLangHTMLEditor
															value={service.description || {}}
															onChange={(value) => {
																const services = config.homePage?.services || [];
																services[index] = {
																	...services[index],
																	description: value
																};
																config = {
																	...config,
																	homePage: {
																		...config.homePage,
																		services: [...services]
																	}
																};
															}}
															placeholder="Enter service description..."
															height={120}
															showLanguageTabs={true}
															defaultLanguage={config.languages?.defaultLanguage || 'en'}
														/>
													</div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<div class="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
										<p class="text-gray-500 mb-4">No services added yet.</p>
										<button
											type="button"
											on:click={() => {
												config = {
													...config,
													homePage: {
														...config.homePage,
														services: [
															{
																number: '01',
																title: {},
																description: {}
															}
														]
													}
												};
											}}
											class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
										>
											Add First Service
										</button>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Submit Button -->
					<div class="flex justify-end pt-6 border-t border-gray-200">
						<button
							type="submit"
							disabled={saving}
							class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{saving ? 'Saving...' : 'Save Configuration'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
