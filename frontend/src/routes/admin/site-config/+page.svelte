<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { SiteConfig } from '$lib/types/site-config';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
	import { ROLE_OPTIONS } from '$lib/constants/roles';
	import { siteConfig } from '$stores/siteConfig';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { EXIF_DISPLAY_FIELDS } from '$lib/constants/exif-fields';
	import { IPTC_XMP_DISPLAY_FIELDS } from '$lib/constants/iptc-xmp-fields';

	let config: SiteConfig | null = null;
	let descriptionValue: any = {};
	let loading = true;
	let saving = false;
	let message = '';
	let activeTab = 'basic';
	let availableLanguages: Array<{ code: string; name: string; flag: string }> = [];

	const configTabs: { id: string; label: string }[] = [
		{ id: 'basic', label: 'Basic Settings' },
		{ id: 'languages', label: 'Languages' },
		{ id: 'branding', label: 'Branding' },
		{ id: 'seo', label: 'SEO' },
		{ id: 'contact', label: 'Contact' },
		{ id: 'home', label: 'Services' },
		{ id: 'navigation', label: 'Navigation' },
		{ id: 'exifMetadata', label: 'EXIF Metadata' },
		{ id: 'iptcXmpMetadata', label: 'IPTC/XMP Metadata' },
		{ id: 'sharing', label: 'Sharing' },
		{ id: 'email', label: 'Email' }
	];

	// Test email modal
	let showTestMailModal = false;
	let testTo = '';
	let testSubject = 'Test email';
	let testBody = 'This is a test email from OpenShutter.';
	let testMailResult: 'idle' | 'sending' | { success: true } | { success: false; error: string } = 'idle';

	// Menu items state
	interface MenuItem {
		labelKey?: string;
		label?: string;
		href: string;
		external?: boolean;
		roles?: string[]; // Array of allowed roles: 'admin', 'owner', 'guest'
		showWhen?: 'always' | 'loggedIn' | 'loggedOut';
		type?: 'link' | 'login' | 'logout';
	}
	let menuItems: MenuItem[] = [];

	onMount(async () => {
		await Promise.all([loadConfig(), loadAvailableLanguages()]);
	});

	async function loadConfig() {
		try {
			const response = await fetch('/api/admin/site-config');
			const result = await response.json().catch(() => ({}));

			if (!response.ok) {
				const serverMessage = result?.error || result?.message || `HTTP ${response.status}`;
				message = serverMessage;
				return;
			}

			// Handle the response format: { success: true, data: config } or direct config
			const data = result.success ? result.data : result;

			if (!data) {
				message = result?.error || 'No configuration data received';
				return;
			}

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
			descriptionValue = data.description || {};

			// Initialize menu items from config
			menuItems = data.template?.headerConfig?.menu || [];
		} catch (error) {
			logger.error('Error loading site config:', error);
			message = error instanceof Error ? error.message : 'Failed to load configuration';
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
			logger.error('Error loading available languages:', error);
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
					description: descriptionValue,
					logo: config.logo,
					favicon: config.favicon,
					languages: config.languages,
					seo: config.seo,
					theme: config.theme,
					contact: config.contact,
					homePage: config.homePage,
					features: config.features,
					exifMetadata: config.exifMetadata,
					iptcXmpMetadata: config.iptcXmpMetadata,
					mail: config.mail,
					welcomeEmail: config.welcomeEmail,
					template: {
						...(config.template || {}),
						headerConfig: {
							...(config.template?.headerConfig || {}),
							menu: menuItems.length > 0 ? menuItems : []
						}
					}
				})
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			const data = result?.success ? result.data : result;
			config = data;
			descriptionValue = data.description || {};
			// Reload menu items from saved config
			menuItems = data.template?.headerConfig?.menu || [];
			message = 'successfully';

			// Refresh the site config store so Header and Menu components pick up the changes
			await siteConfig.load();
			
			// Give the store a moment to update, then reload to ensure all components pick up changes
			// The reload ensures Header components on other pages also get the updated config
			setTimeout(() => {
				if (typeof window !== 'undefined') {
					window.location.reload();
				}
			}, 500);
		} catch (error) {
			logger.error('Error saving site config:', error);
			message = handleError(error, 'Failed to save configuration');
		} finally {
			saving = false;
		}
	}

	function updateConfig(field: string, value: any) {
		if (!config) return;
		config = { ...config, [field]: value } as SiteConfig;
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
		} as SiteConfig;
	}

	function openTestMailModal() {
		testTo = '';
		testSubject = 'Test email';
		testBody = 'This is a test email from OpenShutter.';
		testMailResult = 'idle';
		showTestMailModal = true;
	}

	function closeTestMailModal() {
		showTestMailModal = false;
		testMailResult = 'idle';
	}

	async function sendTestEmail(e: SubmitEvent) {
		e.preventDefault();
		if (!testTo.trim()) return;
		testMailResult = 'sending';
		try {
			const response = await fetch('/api/admin/site-config/test-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ to: testTo.trim(), subject: testSubject, body: testBody }),
			});
			const result = await response.json();
			if (result.success) {
				testMailResult = { success: true };
			} else {
				testMailResult = { success: false, error: result.error || 'Failed to send' };
			}
		} catch (err) {
			logger.error('Send test email error:', err);
			testMailResult = { success: false, error: handleError(err, 'Failed to send test email') };
		}
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
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			
			// Update config with the uploaded URL
			if (type === 'logo') {
				config = { ...config, logo: result.url } as SiteConfig;
			} else {
				config = { ...config, favicon: result.url } as SiteConfig;
			}

			message = `${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully!`;
			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (error) {
			logger.error(`Failed to upload ${type}:`, error);
			message = handleError(error, `Failed to upload ${type}`);
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
		<div class="text-center max-w-md px-4">
			<p class="text-red-600 font-medium">Failed to load configuration</p>
			{#if message}
				<p class="mt-2 text-sm text-gray-600">{message}</p>
			{/if}
			<a href="/admin" class="mt-4 inline-block text-blue-600 hover:text-blue-800">Back to Admin</a>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-6 lg:py-8">
		<div class="max-w-6xl mx-auto px-4">
			<div class="flex items-center justify-between mb-4">
				<h1 class="text-2xl font-bold text-gray-900">Site Configuration</h1>
				<a href="/admin" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium">← Back to Admin</a>
			</div>

			{#if message}
				<div
					class="mb-4 p-4 rounded-lg border-2 {message.includes('successfully')
						? 'bg-green-50 text-green-800 border-green-300 shadow-lg'
						: 'bg-red-50 text-red-800 border-red-300 shadow-lg'}"
				>
					<div class="flex items-center">
						{#if message.includes('successfully')}
							<svg
								class="w-6 h-6 text-green-600 mr-3 shrink-0"
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
								class="w-6 h-6 text-red-600 mr-3 shrink-0"
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

			<form on:submit|preventDefault={handleSubmit} class="flex flex-col lg:flex-row gap-6">
				<!-- Sidebar nav: dropdown on small screens, vertical list on lg+ -->
				<aside class="lg:w-52 shrink-0">
					<div class="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
						<label for="site-config-tab-select" class="sr-only">Configuration section</label>
						<select
							id="site-config-tab-select"
							class="lg:hidden w-full py-3 px-4 text-sm font-medium text-gray-700 border-0 border-b border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-t-lg"
							bind:value={activeTab}
							on:change={(e) => (activeTab = (e.currentTarget as HTMLSelectElement).value)}
						>
							{#each configTabs as tab}
								<option value={tab.id}>{tab.label}</option>
							{/each}
						</select>
						<nav class="hidden lg:block py-1" aria-label="Configuration sections">
							{#each configTabs as tab}
								<button
									type="button"
									class="w-full text-left py-2.5 px-4 text-sm font-medium {activeTab === tab.id
										? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600'
										: 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'}"
									on:click={() => (activeTab = tab.id)}
								>
									{tab.label}
								</button>
							{/each}
						</nav>
					</div>
				</aside>

				<!-- Tab content -->
				<div class="min-w-0 flex-1 bg-white rounded-lg shadow-md border border-gray-200 p-6">
					{#if activeTab === 'basic'}
						<div class="grid grid-cols-1 gap-6">
							<div>
								<label for="site-title" class="block text-sm font-medium text-gray-700 mb-2">
									Site Title
								</label>
								<MultiLangInput
									id="site-title"
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
								<label for="site-description" class="block text-sm font-medium text-gray-700 mb-2">
									Site Description
								</label>
								<MultiLangHTMLEditor
									id="site-description"
									value={descriptionValue}
									onChange={(value) => {
										descriptionValue = value;
									}}
									placeholder="Enter site description..."
									height={150}
									showLanguageTabs={true}
									defaultLanguage={config.languages?.defaultLanguage || 'en'}
								/>
							</div>
						</div>
					{:else if activeTab === 'languages'}
						<div class="space-y-4">
							<fieldset class="space-y-2">
								<legend class="block text-sm font-medium text-gray-700 mb-2">
									Active Languages
								</legend>
								<p class="text-sm text-gray-600 mb-3">
									Select which languages are available for content editing. Only selected languages
									will appear in multi-language fields.
								</p>
								<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
									{#each availableLanguages as lang}
										{@const isActive = config?.languages?.activeLanguages?.includes(lang.code) || false}
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												type="checkbox"
												checked={isActive}
												on:change={(e) => {
													if (!config) return;
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
							</fieldset>
							<div>
								<label for="defaultLanguage" class="block text-sm font-medium text-gray-700 mb-1">
									Default Language
								</label>
								<select
									id="defaultLanguage"
									value={config?.languages?.defaultLanguage || 'en'}
									on:change={(e) => {
										if (!config) return;
										updateLanguages(
											config.languages?.activeLanguages || ['en'],
											e.currentTarget.value
										);
									}}
									class="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								>
									{#each (config?.languages?.activeLanguages || ['en']) as langCode}
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
								<label for="logo-upload" class="block text-sm font-medium text-gray-700 mb-2">
									Logo
								</label>
								<div class="flex gap-4 items-start">
									<div class="flex-1">
										<input
											id="logo-upload"
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
												<label for="logo-url" class="block text-xs text-gray-600 mb-2">Current Logo URL (you can edit manually):</label>
												<input
													id="logo-url"
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
													(e.currentTarget as HTMLImageElement).style.display = 'none';
												}}
											/>
										</div>
									{/if}
								</div>
							</div>

							<!-- Favicon -->
							<div>
								<label for="favicon-upload" class="block text-sm font-medium text-gray-700 mb-2">
									Favicon
								</label>
								<div class="flex gap-4 items-start">
									<div class="flex-1">
										<input
											id="favicon-upload"
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
												<label for="favicon-url" class="block text-xs text-gray-600 mb-2">Current Favicon URL (you can edit manually):</label>
												<input
													id="favicon-url"
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
													(e.currentTarget as HTMLImageElement).style.display = 'none';
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
										<label for="primary-color" class="block text-sm font-medium text-gray-700 mb-2">
											Primary Color
										</label>
										<div class="flex gap-2">
											<input
												id="primary-color"
												type="color"
												value={config.theme?.primaryColor || '#0ea5e9'}
												on:input={(e) => {
													if (!config) return;
													config = {
														...(config),
														theme: {
															...config.theme,
															primaryColor: e.currentTarget.value
														}
													} as SiteConfig;
												}}
												class="w-16 h-10 border border-gray-300 rounded cursor-pointer"
											/>
											<input
												id="primary-color-hex"
												type="text"
												value={config.theme?.primaryColor || '#0ea5e9'}
												on:input={(e) => {
													if (!config) return;
													config = {
														...(config),
														theme: {
															...config.theme,
															primaryColor: e.currentTarget.value
														}
													} as SiteConfig;
												}}
												placeholder="#0ea5e9"
												class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
											/>
										</div>
									</div>

									<!-- Secondary Color -->
									<div>
										<label for="secondary-color" class="block text-sm font-medium text-gray-700 mb-2">
											Secondary Color
										</label>
										<div class="flex gap-2">
											<input
												id="secondary-color"
												type="color"
												value={config.theme?.secondaryColor || '#64748b'}
												on:input={(e) => {
													if (!config) return;
													config = {
														...(config),
														theme: {
															...config.theme,
															secondaryColor: e.currentTarget.value
														}
													} as SiteConfig;
												}}
												class="w-16 h-10 border border-gray-300 rounded cursor-pointer"
											/>
											<input
												id="secondary-color-hex"
												type="text"
												value={config.theme?.secondaryColor || '#64748b'}
												on:input={(e) => {
													if (!config) return;
													config = {
														...(config),
														theme: {
															...config.theme,
															secondaryColor: e.currentTarget.value
														}
													} as SiteConfig;
												}}
												placeholder="#64748b"
												class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
											/>
										</div>
									</div>

									<!-- Background Color -->
									<div>
										<label for="bg-color" class="block text-sm font-medium text-gray-700 mb-2">
											Background Color
										</label>
										<div class="flex gap-2">
											<input
												id="bg-color"
												type="color"
												value={config.theme?.backgroundColor || '#ffffff'}
												on:input={(e) => {
													if (!config) return;
													config = {
														...(config),
														theme: {
															...config.theme,
															backgroundColor: e.currentTarget.value
														}
													} as SiteConfig;
												}}
												class="w-16 h-10 border border-gray-300 rounded cursor-pointer"
											/>
											<input
												id="bg-color-hex"
												type="text"
												value={config.theme?.backgroundColor || '#ffffff'}
												on:input={(e) => {
													if (!config) return;
													config = {
														...(config),
														theme: {
															...config.theme,
															backgroundColor: e.currentTarget.value
														}
													} as SiteConfig;
												}}
												placeholder="#ffffff"
												class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
											/>
										</div>
									</div>

									<!-- Text Color -->
									<div>
										<label for="text-color" class="block text-sm font-medium text-gray-700 mb-2">
											Text Color
										</label>
										<div class="flex gap-2">
											<input
												id="text-color"
												type="color"
												value={config.theme?.textColor || '#1e293b'}
												on:input={(e) => {
													if (!config) return;
													config = {
														...(config),
														theme: {
															...config.theme,
															textColor: e.currentTarget.value
														}
													} as SiteConfig;
												}}
												class="w-16 h-10 border border-gray-300 rounded cursor-pointer"
											/>
											<input
												id="text-color-hex"
												type="text"
												value={config.theme?.textColor || '#1e293b'}
												on:input={(e) => {
													if (!config) return;
													config = {
														...(config),
														theme: {
															...config.theme,
															textColor: e.currentTarget.value
														}
													} as SiteConfig;
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
								<label for="meta-title" class="block text-sm font-medium text-gray-700 mb-2">
									Meta Title
								</label>
								<MultiLangInput
									id="meta-title"
									value={config.seo?.metaTitle || {}}
onChange={(value) => {
										if (!config) return;
										config = {
											...(config),
											seo: {
												...config.seo,
												metaTitle: value
											}
										} as SiteConfig;
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
								<label for="meta-description" class="block text-sm font-medium text-gray-700 mb-2">
									Meta Description
								</label>
								<MultiLangInput
									id="meta-description"
									value={config.seo?.metaDescription || {}}
onChange={(value) => {
										if (!config) return;
										config = {
											...(config),
											seo: {
												...config.seo,
												metaDescription: value
											}
										} as SiteConfig;
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
								<label for="meta-keywords" class="block text-sm font-medium text-gray-700 mb-2">
									Meta Keywords
								</label>
								<input
									id="meta-keywords"
									type="text"
									value={(config.seo?.metaKeywords || []).join(', ')}
									on:input={(e) => {
										if (!config) return;
										const keywords = e.currentTarget.value
											.split(',')
											.map((k) => k.trim())
											.filter((k) => k.length > 0);
										config = {
											...(config),
											seo: {
												...config.seo,
												metaKeywords: keywords
											}
										} as SiteConfig;
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
								<label for="og-image" class="block text-sm font-medium text-gray-700 mb-2">
									Open Graph Image URL
								</label>
								<input
									id="og-image"
									type="text"
									value={config.seo?.ogImage || ''}
on:input={(e) => {
												if (!config) return;
												config = {
													...(config),
													seo: {
														...config.seo,
														ogImage: e.currentTarget.value
											}
										} as SiteConfig;
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
											alt="Open Graph share preview"
											class="max-w-md h-32 object-contain border border-gray-200 rounded p-2 bg-gray-50"
											on:error={(e) => {
												(e.currentTarget as HTMLImageElement).style.display = 'none';
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
								<label for="contact-email" class="block text-sm font-medium text-gray-700 mb-2">
									Email
								</label>
								<input
									id="contact-email"
									type="email"
									value={config.contact?.email || ''}
									on:input={(e) => {
										if (!config) return;
										config = {
											...(config),
											contact: {
												...config.contact,
												email: e.currentTarget.value
											}
										} as SiteConfig;
									}}
									placeholder="contact@example.com"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>

							<!-- Phone -->
							<div>
								<label for="contact-phone" class="block text-sm font-medium text-gray-700 mb-2">
									Phone
								</label>
								<input
									id="contact-phone"
									type="tel"
									value={config.contact?.phone || ''}
									on:input={(e) => {
										if (!config) return;
										config = {
											...(config),
											contact: {
												...config.contact,
												phone: e.currentTarget.value
											}
										} as SiteConfig;
									}}
									placeholder="+1 (555) 123-4567"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>

							<!-- Address -->
							<div>
								<label for="contact-address" class="block text-sm font-medium text-gray-700 mb-2">
									Address
								</label>
								<MultiLangInput
									id="contact-address"
									value={config.contact?.address || {}}
									onChange={(value) => {
										if (!config) return;
										config = {
											...(config),
											contact: {
												...config.contact,
												address: value
											}
										} as SiteConfig;
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
										<label for="social-facebook" class="block text-sm font-medium text-gray-700 mb-2">
											Facebook URL
										</label>
										<input
											id="social-facebook"
											type="text"
											value={config.contact?.socialMedia?.facebook || ''}
											on:input={(e) => {
												if (!config) return;
												config = {
													...(config),
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															facebook: e.currentTarget.value
														}
													}
												} as SiteConfig;
											}}
											placeholder="https://facebook.com/yourpage"
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>

									<!-- Instagram -->
									<div>
										<label for="social-instagram" class="block text-sm font-medium text-gray-700 mb-2">
											Instagram URL
										</label>
										<input
											id="social-instagram"
											type="text"
											value={config.contact?.socialMedia?.instagram || ''}
											on:input={(e) => {
												if (!config) return;
												config = {
													...(config),
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															instagram: e.currentTarget.value
														}
													}
												} as SiteConfig;
											}}
											placeholder="https://instagram.com/yourprofile"
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>

									<!-- Twitter -->
									<div>
										<label for="social-twitter" class="block text-sm font-medium text-gray-700 mb-2">
											Twitter URL
										</label>
										<input
											id="social-twitter"
											type="text"
											value={config.contact?.socialMedia?.twitter || ''}
											on:input={(e) => {
												if (!config) return;
												config = {
													...(config),
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															twitter: e.currentTarget.value
														}
													}
												} as SiteConfig;
											}}
											placeholder="https://twitter.com/yourhandle"
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>

									<!-- LinkedIn -->
									<div>
										<label for="social-linkedin" class="block text-sm font-medium text-gray-700 mb-2">
											LinkedIn URL
										</label>
										<input
											id="social-linkedin"
											type="text"
											value={config.contact?.socialMedia?.linkedin || ''}
											on:input={(e) => {
												if (!config) return;
												config = {
													...(config),
													contact: {
														...config.contact,
														socialMedia: {
															...config.contact?.socialMedia,
															linkedin: e.currentTarget.value
														}
													}
												} as SiteConfig;
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
								<label for="home-contact-title" class="block text-sm font-medium text-gray-700 mb-2">
									Contact Section Title
								</label>
								<MultiLangInput
									id="home-contact-title"
									value={config.homePage?.contactTitle || {}}
									onChange={(value) => {
										if (!config) return;
										config = {
											...(config),
											homePage: {
												...config.homePage,
												contactTitle: value
											}
										} as SiteConfig;
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
											if (!config) return;
											const services = config.homePage?.services || [];
											config = {
												...(config),
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
											} as SiteConfig;
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
															if (!config) return;
															const services = config.homePage?.services || [];
															config = {
																...(config),
																homePage: {
																	...config.homePage,
																	services: services.filter((_, i) => i !== index)
																}
															} as SiteConfig;
														}}
														class="text-red-600 hover:text-red-800 text-sm font-medium"
													>
														Remove
													</button>
												</div>

												<div class="grid grid-cols-1 gap-4">
													<!-- Service Number -->
													<div>
														<label for="service-number-{index}" class="block text-sm font-medium text-gray-700 mb-2">
															Service Number
														</label>
														<input
															id="service-number-{index}"
															type="text"
															value={service.number || ''}
															on:input={(e) => {
																if (!config) return;
																const services = config.homePage?.services || [];
																services[index] = {
																	...services[index],
																	number: e.currentTarget.value
																};
																config = {
																	...(config),
																	homePage: {
																		...config.homePage,
																		services: [...services]
																	}
																} as SiteConfig;
															}}
															placeholder="01"
															class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
														/>
													</div>

													<!-- Service Title -->
													<div>
														<label for="service-title-{index}" class="block text-sm font-medium text-gray-700 mb-2">
															Service Title
														</label>
														<MultiLangInput
															id="service-title-{index}"
															value={service.title || {}}
															onChange={(value) => {
																if (!config) return;
																const services = config.homePage?.services || [];
																services[index] = {
																	...services[index],
																	title: value
																};
																config = {
																	...(config),
																	homePage: {
																		...config.homePage,
																		services: [...services]
																	}
																} as SiteConfig;
															}}
															placeholder="Enter service title..."
															showLanguageTabs={true}
															defaultLanguage={config.languages?.defaultLanguage || 'en'}
														/>
													</div>

													<!-- Service Description -->
													<div>
														<label for="service-desc-{index}" class="block text-sm font-medium text-gray-700 mb-2">
															Service Description
														</label>
														<MultiLangHTMLEditor
															id="service-desc-{index}"
															value={service.description || {}}
															onChange={(value) => {
																if (!config) return;
																const services = config.homePage?.services || [];
																services[index] = {
																	...services[index],
																	description: value
																};
																config = {
																	...(config),
																	homePage: {
																		...config.homePage,
																		services: [...services]
																	}
																} as SiteConfig;
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
											if (!config) return;
											config = {
												...(config),
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
											} as SiteConfig;
										}}
											class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
										>
											Add First Service
										</button>
									</div>
								{/if}
							</div>
						</div>
					{:else if activeTab === 'navigation'}
						<div class="space-y-6">
							<div>
								<h3 class="text-lg font-semibold text-gray-900 mb-2">Navigation Menu</h3>
								<p class="text-sm text-gray-600 mb-4">
									Configure your site's navigation menu. You can use translation keys (e.g., 'navigation.home') or direct labels.
								</p>
							</div>

							{#if menuItems.length > 0}
								<div class="space-y-3">
									{#each menuItems as item, index}
										<div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
											<div class="flex items-start justify-between mb-3">
												<span class="text-sm font-medium text-gray-700">Menu Item #{index + 1}</span>
												<div class="flex gap-2">
													{#if index > 0}
														<button
															type="button"
															on:click={() => {
																const newItems = [...menuItems];
																[newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
																menuItems = newItems;
															}}
															class="text-gray-600 hover:text-gray-900 text-sm"
															title="Move up"
														>
															↑
														</button>
													{/if}
													{#if index < menuItems.length - 1}
														<button
															type="button"
															on:click={() => {
																const newItems = [...menuItems];
																[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
																menuItems = newItems;
															}}
															class="text-gray-600 hover:text-gray-900 text-sm"
															title="Move down"
														>
															↓
														</button>
													{/if}
													<button
														type="button"
														on:click={() => {
															menuItems = menuItems.filter((_, i) => i !== index);
														}}
														class="text-red-600 hover:text-red-800 text-sm font-medium"
													>
														Remove
													</button>
												</div>
											</div>
											
											<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div>
													<label for="menu-labelKey-{index}" class="block text-sm font-medium text-gray-700 mb-1">
														Translation Key (optional)
													</label>
													<input
														id="menu-labelKey-{index}"
														type="text"
														value={item.labelKey || ''}
														on:input={(e) => {
															menuItems[index] = { ...menuItems[index], labelKey: e.currentTarget.value || undefined };
															menuItems = [...menuItems];
														}}
														placeholder="navigation.home"
														class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
													/>
													<p class="mt-1 text-xs text-gray-500">
														Use translation key (e.g., 'navigation.home') for i18n support
													</p>
												</div>
												
												<div>
													<label for="menu-label-{index}" class="block text-sm font-medium text-gray-700 mb-1">
														Direct Label (optional)
													</label>
													<input
														id="menu-label-{index}"
														type="text"
														value={item.label || ''}
														on:input={(e) => {
															menuItems[index] = { ...menuItems[index], label: e.currentTarget.value || undefined };
															menuItems = [...menuItems];
														}}
														placeholder="About"
														class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
													/>
													<p class="mt-1 text-xs text-gray-500">
														Direct text label (used if translation key is not provided)
													</p>
												</div>
												
												<div>
													<label for="menu-type-{index}" class="block text-sm font-medium text-gray-700 mb-1">
														Type
													</label>
													<select
														id="menu-type-{index}"
														value={item.type ?? 'link'}
														on:change={(e) => {
															const v = e.currentTarget.value as 'link' | 'login' | 'logout';
															menuItems[index] = {
																...menuItems[index],
																type: v,
																href: v === 'login' ? '/login' : v === 'logout' ? '#' : (menuItems[index].href || ''),
																showWhen: v === 'login' ? 'loggedOut' : v === 'logout' ? 'loggedIn' : (menuItems[index].showWhen ?? 'always')
															};
															menuItems = [...menuItems];
														}}
														class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
													>
														<option value="link">Link</option>
														<option value="login">Login</option>
														<option value="logout">Logout</option>
													</select>
													<p class="mt-1 text-xs text-gray-500">Login = link to sign in; Logout = button that signs out</p>
												</div>

												<div>
													<label for="menu-showWhen-{index}" class="block text-sm font-medium text-gray-700 mb-1">
														Show when
													</label>
													<select
														id="menu-showWhen-{index}"
														value={item.showWhen ?? 'always'}
														on:change={(e) => {
															menuItems[index] = { ...menuItems[index], showWhen: e.currentTarget.value as 'always' | 'loggedIn' | 'loggedOut' };
															menuItems = [...menuItems];
														}}
														class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
													>
														<option value="always">Always</option>
														<option value="loggedIn">Logged in only</option>
														<option value="loggedOut">Logged out only</option>
													</select>
													<p class="mt-1 text-xs text-gray-500">Show this item based on user login status</p>
												</div>

												<div>
													<label for="menu-href-{index}" class="block text-sm font-medium text-gray-700 mb-1">
														Link URL <span class="text-red-500">*</span>
													</label>
													<input
														id="menu-href-{index}"
														type="text"
														value={item.href}
														disabled={item.type === 'logout'}
														on:input={(e) => {
															menuItems[index] = { ...menuItems[index], href: e.currentTarget.value };
															menuItems = [...menuItems];
														}}
														placeholder={item.type === 'login' ? '/login' : item.type === 'logout' ? '—' : '/about'}
														required={item.type !== 'logout'}
														class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-500"
													/>
													<p class="mt-1 text-xs text-gray-500">
														{item.type === 'logout' ? 'Ignored for Logout' : 'Page URL or external link (e.g., /about)'}
													</p>
												</div>
												
												<fieldset class="space-y-2">
													<legend class="block text-sm font-medium text-gray-700 mb-1">
														Visible To Roles (optional)
													</legend>
													<div class="flex flex-wrap gap-2">
														{#each ROLE_OPTIONS as roleOpt}
															{@const isSelected = item.roles?.includes(roleOpt.value) || false}
															<label class="flex items-center space-x-1 cursor-pointer" title={roleOpt.description}>
																<input
																	type="checkbox"
																	checked={isSelected}
																	on:change={(e) => {
																		const currentRoles = item.roles || [];
																		const newRoles = e.currentTarget.checked
																			? [...currentRoles, roleOpt.value]
																			: currentRoles.filter((r: string) => r !== roleOpt.value);
																		menuItems[index] = { 
																			...menuItems[index], 
																			roles: newRoles.length > 0 ? newRoles : undefined 
																		};
																		menuItems = [...menuItems];
																	}}
																	class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
																/>
																<span class="text-sm text-gray-700">{roleOpt.label}</span>
															</label>
														{/each}
													</div>
													<p class="mt-1 text-xs text-gray-500">
														Leave unchecked to show to everyone. Check roles to restrict visibility.
													</p>
												</fieldset>
												
												<div class="flex items-end">
													<label class="flex items-center space-x-2 cursor-pointer">
														<input
															type="checkbox"
															checked={item.external || false}
															on:change={(e) => {
																menuItems[index] = { ...menuItems[index], external: e.currentTarget.checked || undefined };
																menuItems = [...menuItems];
															}}
															class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
														/>
														<span class="text-sm text-gray-700">Open in new tab (external link)</span>
													</label>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{:else}
								<div class="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
									<p class="text-gray-500 mb-4">No menu items configured yet.</p>
									<p class="text-sm text-gray-400 mb-4">
										If no menu items are configured, default menu items will be used.
									</p>
								</div>
							{/if}

							<div class="flex flex-wrap justify-between items-center gap-2 pt-4 border-t border-gray-200">
								<div class="flex flex-wrap gap-2">
									<button
										type="button"
										on:click={() => {
											menuItems = [
												...menuItems,
												{ href: '', label: '' }
											];
										}}
										class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
									>
										+ Add Menu Item
									</button>
									<button
										type="button"
										on:click={() => {
											menuItems = [
												...menuItems,
												{ type: 'login', labelKey: 'auth.signIn', href: '/login', showWhen: 'loggedOut' }
											];
										}}
										class="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
									>
										+ Add Login
									</button>
									<button
										type="button"
										on:click={() => {
											menuItems = [
												...menuItems,
												{ type: 'logout', labelKey: 'header.logout', href: '#', showWhen: 'loggedIn' }
											];
										}}
										class="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
									>
										+ Add Logout
									</button>
								</div>
								
								{#if menuItems.length > 0}
									<button
										type="button"
										on:click={() => {
											if (confirm('Are you sure you want to clear all menu items? Default menu will be used.')) {
												menuItems = [];
											}
										}}
										class="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
									>
										Clear All
									</button>
								{/if}
							</div>

							<div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
								<h4 class="text-sm font-semibold text-blue-900 mb-2">Tips:</h4>
								<ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
									<li>Use <strong>Type</strong> Login or Logout to add sign-in / sign-out buttons; use <strong>Show when</strong> to show items only when logged in or logged out</li>
									<li>Use <strong>Translation Key</strong> for multilingual support (e.g., 'navigation.home')</li>
									<li>Use <strong>Direct Label</strong> for simple text labels (e.g., 'About')</li>
									<li>If both are provided, Translation Key takes precedence</li>
									<li>Check <strong>roles</strong> to restrict menu visibility (e.g., check 'admin' to show only to admins)</li>
									<li>Leave roles unchecked to show the menu item to everyone</li>
									<li>Check "Open in new tab" for external links</li>
								</ul>
							</div>
						</div>
					{:else if activeTab === 'exifMetadata'}
						<div class="space-y-4">
							<div>
								<h3 class="text-lg font-semibold text-gray-900 mb-2">EXIF Metadata Display</h3>
								<p class="text-sm text-gray-600 mb-4">
									Select which EXIF metadata fields (when present in a photo) will be shown to visitors (e.g. in the photo lightbox). Leave all unchecked to show all available fields.
								</p>
								<div class="flex gap-2 mb-4">
									<button
										type="button"
										on:click={() => {
											if (!config) return;
											config = {
												...(config),
												exifMetadata: {
													...config.exifMetadata,
													displayFields: EXIF_DISPLAY_FIELDS.map((f) => f.id)
												}
											} as SiteConfig;
										}}
										class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
									>
										Select all
									</button>
									<button
										type="button"
										on:click={() => {
											if (!config) return;
											config = {
												...(config),
												exifMetadata: {
													...config.exifMetadata,
													displayFields: []
												}
											} as SiteConfig;
										}}
										class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
									>
										Deselect all
									</button>
								</div>
								<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
									{#each EXIF_DISPLAY_FIELDS as field}
										{@const isChecked = (config.exifMetadata?.displayFields ?? []).includes(field.id)}
										<label class="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={isChecked}
												on:change={(e) => {
													if (!config) return;
													const current = config.exifMetadata?.displayFields ?? [];
													const next = e.currentTarget.checked
														? [...current, field.id]
														: current.filter((id: string) => id !== field.id);
													config = {
														...config,
														exifMetadata: {
															...config.exifMetadata,
															displayFields: next
														}
													} as SiteConfig;
												}}
												class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											/>
											<span class="text-sm text-gray-700">{field.label}</span>
										</label>
									{/each}
								</div>
								<p class="text-xs text-gray-500 mt-2">
									If no fields are selected, all available EXIF fields will be displayed. Selected fields are only shown when the photo has that metadata.
								</p>
							</div>
						</div>
					{:else if activeTab === 'iptcXmpMetadata'}
						<div class="space-y-4">
							<div>
								<h3 class="text-lg font-semibold text-gray-900 mb-2">IPTC/XMP Metadata Display</h3>
								<p class="text-sm text-gray-600 mb-4">
									Select which IPTC/XMP metadata fields (when present in a photo) will be shown to visitors (e.g. in the photo lightbox). Leave all unchecked to show all available fields.
								</p>
								<div class="flex gap-2 mb-4">
									<button
										type="button"
										on:click={() => {
											if (!config) return;
											config = {
												...(config),
												iptcXmpMetadata: {
													...config.iptcXmpMetadata,
													displayFields: IPTC_XMP_DISPLAY_FIELDS.map((f) => f.id)
												}
											} as SiteConfig;
										}}
										class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
									>
										Select all
									</button>
									<button
										type="button"
										on:click={() => {
											if (!config) return;
											config = {
												...(config),
												iptcXmpMetadata: {
													...config.iptcXmpMetadata,
													displayFields: []
												}
											} as SiteConfig;
										}}
										class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
									>
										Deselect all
									</button>
								</div>
								<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
									{#each IPTC_XMP_DISPLAY_FIELDS as field}
										{@const isChecked = (config.iptcXmpMetadata?.displayFields ?? []).includes(field.id)}
										<label class="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={isChecked}
												on:change={(e) => {
													if (!config) return;
													const current = config.iptcXmpMetadata?.displayFields ?? [];
													const next = e.currentTarget.checked
														? [...current, field.id]
														: current.filter((id: string) => id !== field.id);
													config = {
														...config,
														iptcXmpMetadata: {
															...config.iptcXmpMetadata,
															displayFields: next
														}
													} as SiteConfig;
												}}
												class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
											/>
											<span class="text-sm text-gray-700">{field.label}</span>
										</label>
									{/each}
								</div>
								<p class="text-xs text-gray-500 mt-2">
									If no fields are selected, all available IPTC/XMP fields will be displayed. Selected fields are only shown when the photo has that metadata.
								</p>
							</div>
						</div>
					{:else if activeTab === 'sharing'}
						<div class="grid grid-cols-1 gap-6">
							<h3 class="text-lg font-semibold text-gray-900">Social Sharing</h3>
							<p class="text-sm text-gray-600 -mt-2">
								Control whether sharing is enabled and where share buttons appear. Choose which services to show (X, Facebook, WhatsApp, Copy link).
							</p>
							<div class="space-y-4">
								<label class="flex items-center space-x-2 cursor-pointer">
									<input
										id="sharing-enabled"
										type="checkbox"
										checked={config.features?.enableSharing ?? true}
										on:change={(e) => {
											if (!config) return;
											config = {
												...(config),
												features: {
													...config.features,
													enableSharing: e.currentTarget.checked
												}
											} as SiteConfig;
										}}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
									/>
									<span class="text-sm font-medium text-gray-700">Enable sharing</span>
								</label>
								<div class="border-t border-gray-200 pt-4">
									<p class="text-sm font-medium text-gray-700 mb-2">Where to show share buttons</p>
									<div class="space-y-2">
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												id="sharing-on-album"
												type="checkbox"
												checked={config.features?.sharingOnAlbum !== false}
												on:change={(e) => {
													if (!config) return;
													config = {
														...(config),
														features: {
															...config.features,
															sharingOnAlbum: e.currentTarget.checked
														}
													} as SiteConfig;
												}}
												class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
											/>
											<span class="text-sm text-gray-700">On album and gallery pages</span>
										</label>
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												id="sharing-on-photo"
												type="checkbox"
												checked={config.features?.sharingOnPhoto !== false}
												on:change={(e) => {
													if (!config) return;
													config = {
														...(config),
														features: {
															...config.features,
															sharingOnPhoto: e.currentTarget.checked
														}
													} as SiteConfig;
												}}
												class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
											/>
											<span class="text-sm text-gray-700">In photo lightbox (info panel)</span>
										</label>
									</div>
								</div>
								<div class="border-t border-gray-200 pt-4">
									<p class="text-sm font-medium text-gray-700 mb-2">Share options (check to show)</p>
									{#if config}
										{@const opts = config.features?.sharingOptions ?? ['twitter', 'facebook', 'whatsapp', 'copy']}
										<div class="flex flex-wrap gap-4">
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												id="share-twitter"
												type="checkbox"
												checked={opts.includes('twitter')}
												on:change={(e) => {
													if (!config) return;
													const current = config.features?.sharingOptions ?? ['twitter', 'facebook', 'whatsapp', 'copy'];
													const next = e.currentTarget.checked ? [...current.filter((x: string) => x !== 'twitter'), 'twitter'] : current.filter((x: string) => x !== 'twitter');
													config = { ...config, features: { ...config.features, sharingOptions: next } } as SiteConfig;
												}}
												class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
											/>
											<span class="text-sm text-gray-700">X (Twitter)</span>
										</label>
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												id="share-facebook"
												type="checkbox"
												checked={opts.includes('facebook')}
												on:change={(e) => {
													if (!config) return;
													const current = config.features?.sharingOptions ?? ['twitter', 'facebook', 'whatsapp', 'copy'];
													const next = e.currentTarget.checked ? [...current.filter((x: string) => x !== 'facebook'), 'facebook'] : current.filter((x: string) => x !== 'facebook');
													config = { ...config, features: { ...config.features, sharingOptions: next } } as SiteConfig;
												}}
												class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
											/>
											<span class="text-sm text-gray-700">Facebook</span>
										</label>
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												id="share-whatsapp"
												type="checkbox"
												checked={opts.includes('whatsapp')}
												on:change={(e) => {
													if (!config) return;
													const current = config.features?.sharingOptions ?? ['twitter', 'facebook', 'whatsapp', 'copy'];
													const next = e.currentTarget.checked ? [...current.filter((x: string) => x !== 'whatsapp'), 'whatsapp'] : current.filter((x: string) => x !== 'whatsapp');
													config = { ...config, features: { ...config.features, sharingOptions: next } } as SiteConfig;
												}}
												class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
											/>
											<span class="text-sm text-gray-700">WhatsApp</span>
										</label>
										<label class="flex items-center space-x-2 cursor-pointer">
											<input
												id="share-copy"
												type="checkbox"
												checked={opts.includes('copy')}
												on:change={(e) => {
													if (!config) return;
													const current = config.features?.sharingOptions ?? ['twitter', 'facebook', 'whatsapp', 'copy'];
													const next = e.currentTarget.checked ? [...current.filter((x: string) => x !== 'copy'), 'copy'] : current.filter((x: string) => x !== 'copy');
													config = { ...config, features: { ...config.features, sharingOptions: next } } as SiteConfig;
												}}
												class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
											/>
											<span class="text-sm text-gray-700">Copy link</span>
										</label>
									</div>
									{/if}
								</div>
							</div>
						</div>
					{:else if activeTab === 'email'}
						<div class="grid grid-cols-1 gap-6">
							<h3 class="text-lg font-semibold text-gray-900">SMTP Mail Server</h3>
							<p class="text-sm text-gray-600 -mt-2">
								Configure SMTP to send emails (e.g. welcome email when a new user is created). Leave blank to disable sending.
							</p>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label for="mail-host" class="block text-sm font-medium text-gray-700 mb-1">Host</label>
									<input
										id="mail-host"
										type="text"
										value={config.mail?.host ?? ''}
										on:input={(e) => {
											if (!config) return;
											config = {
												...(config),
												mail: { ...config.mail, host: e.currentTarget.value || undefined }
											} as SiteConfig;
										}}
										placeholder="smtp.example.com"
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								<div>
									<label for="mail-port" class="block text-sm font-medium text-gray-700 mb-1">Port</label>
									<input
										id="mail-port"
										type="number"
										value={config.mail?.port ?? ''}
										on:input={(e) => {
											if (!config) return;
											const v = e.currentTarget.value ? Number(e.currentTarget.value) : undefined;
											config = { ...(config), mail: { ...config.mail, port: v } } as SiteConfig;
										}}
										placeholder="587"
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
									<p class="mt-1 text-xs text-gray-500">Use 587 for STARTTLS (recommended) or 465 for SSL. Connection type is automatic.</p>
								</div>
								<div>
									<label for="mail-user" class="block text-sm font-medium text-gray-700 mb-1">User</label>
									<input
										id="mail-user"
										type="text"
										value={config.mail?.user ?? ''}
										on:input={(e) => {
											if (!config) return;
											config = {
												...(config),
												mail: { ...config.mail, user: e.currentTarget.value || undefined }
											} as SiteConfig;
										}}
										placeholder="noreply@example.com"
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								<div>
									<label for="mail-password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
									<input
										id="mail-password"
										type="password"
										value={config.mail?.password ?? ''}
										on:input={(e) => {
											if (!config) return;
											config = {
												...(config),
												mail: { ...config.mail, password: e.currentTarget.value || undefined }
											} as SiteConfig;
										}}
										placeholder="Leave blank to keep current"
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
									<p class="mt-1 text-xs text-gray-500">Leave blank to keep existing password. Backend masks stored value as ****.</p>
								</div>
								<div>
									<label for="mail-from" class="block text-sm font-medium text-gray-700 mb-1">From address</label>
									<input
										id="mail-from"
										type="text"
										value={config.mail?.from ?? ''}
										on:input={(e) => {
											if (!config) return;
											config = {
												...(config),
												mail: { ...config.mail, from: e.currentTarget.value || undefined }
											} as SiteConfig;
										}}
										placeholder="OpenShutter &lt;noreply@example.com&gt;"
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								<div class="flex items-end pb-2">
									<label class="flex items-center space-x-2 cursor-pointer">
										<input
											type="checkbox"
											checked={config.mail?.secure ?? false}
											on:change={(e) => {
												if (!config) return;
												config = {
													...(config),
													mail: { ...config.mail, secure: e.currentTarget.checked }
												} as SiteConfig;
											}}
											class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
										<span class="text-sm text-gray-700">Use SSL (port 465 only; otherwise ignored)</span>
									</label>
								</div>
							</div>

							<div class="border-t border-gray-200 pt-6">
								<h3 class="text-lg font-semibold text-gray-900 mb-2">Welcome Email</h3>
								<p class="text-sm text-gray-600 mb-4">
									Send a welcome email when a new user is created. Enable below and set subject/body. You can use placeholders in subject and body.
								</p>
								<label class="flex items-center space-x-2 cursor-pointer mb-4">
									<input
										type="checkbox"
										checked={config.welcomeEmail?.enabled ?? false}
										on:change={(e) => {
											if (!config) return;
											config = {
												...(config),
												welcomeEmail: { ...config.welcomeEmail, enabled: e.currentTarget.checked }
											} as SiteConfig;
										}}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
									/>
									<span class="text-sm font-medium text-gray-700">Send welcome email on new user creation</span>
								</label>
								<div class="space-y-4">
									<div>
										<label for="welcome-email-subject" class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
										<input
											id="welcome-email-subject"
											type="text"
											value={config.welcomeEmail?.subject ?? ''}
											on:input={(e) => {
												if (!config) return;
												config = {
													...config,
													welcomeEmail: { ...config.welcomeEmail, subject: e.currentTarget.value || undefined }
												} as SiteConfig;
											}}
											placeholder={'Welcome to {{siteTitle}}!'}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>
									<div>
										<label for="welcome-email-body" class="block text-sm font-medium text-gray-700 mb-1">Body (plain text or HTML)</label>
										<textarea
											id="welcome-email-body"
											value={config.welcomeEmail?.body ?? ''}
											on:input={(e) => {
												if (!config) return;
												config = {
													...config,
													welcomeEmail: { ...config.welcomeEmail, body: e.currentTarget.value || undefined }
												} as SiteConfig;
											}}
											placeholder={'Hi {{name}},\n\nWelcome! Your username is {{username}}. Log in here: {{loginUrl}}'}
											rows={8}
											class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
										></textarea>
										<p class="mt-1 text-xs text-gray-500">
											Placeholders: <code class="bg-gray-100 px-1 rounded">{'{{name}}'}</code>, <code class="bg-gray-100 px-1 rounded">{'{{username}}'}</code>, <code class="bg-gray-100 px-1 rounded">{'{{loginUrl}}'}</code>, <code class="bg-gray-100 px-1 rounded">{'{{siteTitle}}'}</code>, <code class="bg-gray-100 px-1 rounded">{'{{password}}'}</code> (initial password set at user creation; optional; sending passwords by email is less secure).
										</p>
									</div>
								</div>
							</div>

							<div class="border-t border-gray-200 pt-6">
								<button
									type="button"
									on:click={openTestMailModal}
									class="px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
								>
									Send test email
								</button>
								<p class="mt-2 text-xs text-gray-500">Uses current SMTP config. Save first if you changed it.</p>
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
				</div>
				</form>
		</div>

		<!-- Test email modal -->
		{#if showTestMailModal}
			<div
				class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
				role="dialog"
				aria-modal="true"
				aria-labelledby="test-email-title"
			>
				<div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
					<div class="p-4 border-b border-gray-200 flex items-center justify-between">
						<h2 id="test-email-title" class="text-lg font-semibold text-gray-900">Send test email</h2>
						<button
							type="button"
							on:click={closeTestMailModal}
							class="text-gray-400 hover:text-gray-600 p-1 rounded"
							aria-label="Close"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
						</button>
					</div>
					<div class="p-4 overflow-y-auto flex-1">
						{#if testMailResult === 'idle' || testMailResult === 'sending'}
							<form on:submit|preventDefault={sendTestEmail} class="space-y-4">
								<div>
									<label for="test-email-to" class="block text-sm font-medium text-gray-700 mb-1">To</label>
									<input
										id="test-email-to"
										type="email"
										bind:value={testTo}
										placeholder="recipient@example.com"
										required
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								<div>
									<label for="test-email-subject" class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
									<input
										id="test-email-subject"
										type="text"
										bind:value={testSubject}
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									/>
								</div>
								<div>
									<label for="test-email-body" class="block text-sm font-medium text-gray-700 mb-1">Body</label>
									<textarea
										id="test-email-body"
										bind:value={testBody}
										rows={5}
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
									></textarea>
								</div>
								<div class="flex gap-2 justify-end pt-2">
									<button
										type="button"
										on:click={closeTestMailModal}
										class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
									>
										Cancel
									</button>
									<button
										type="submit"
										disabled={testMailResult === 'sending'}
										class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{testMailResult === 'sending' ? 'Sending...' : 'Send'}
									</button>
								</div>
							</form>
						{:else}
							<div class="space-y-4">
								{#if testMailResult.success}
									<div class="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800">
										<p class="font-medium">Email sent successfully.</p>
										<p class="text-sm mt-1">Check the recipient inbox.</p>
									</div>
								{:else}
									<div class="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
										<p class="font-medium">Failed to send</p>
										<p class="text-sm mt-1">{testMailResult.error}</p>
									</div>
								{/if}
								<div class="flex justify-end">
									<button
										type="button"
										on:click={closeTestMailModal}
										class="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
									>
										Close
									</button>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
