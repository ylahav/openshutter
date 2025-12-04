<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { siteConfigData, siteConfig } from '$stores/siteConfig';

	export let data; // From +layout.server.ts, contains user info

	interface TemplateConfig {
		templateName: string;
		displayName: string;
		colors: {
			primary: string;
			secondary: string;
			accent: string;
			background: string;
			text: string;
			muted: string;
		};
		fonts: {
			heading: string;
			body: string;
		};
		layout: {
			maxWidth: string;
			containerPadding: string;
			gridGap: string;
		};
		visibility?: {
			hero?: boolean;
			languageSelector?: boolean;
			authButtons?: boolean;
			footerMenu?: boolean;
			statistics?: boolean;
			promotion?: boolean;
		};
		componentsConfig?: {
			header?: {
				showLogo?: boolean;
				showSiteTitle?: boolean;
				enableThemeToggle?: boolean;
				enableLanguageSelector?: boolean;
				showGreeting?: boolean;
				showAuthButtons?: boolean;
			};
		};
	}

	let templates: TemplateConfig[] = [];
	let activeTemplate: TemplateConfig | null = null;
	let loading = true;
	let saving = false;
	let resetting = false;
	let message = '';
	let error = '';
	let activeTab = 'colors';
	let hasChanges = false;

	// Local overrides state
	let localOverrides: {
		customColors?: Record<string, string>;
		customFonts?: Record<string, string>;
		customLayout?: Record<string, string>;
		componentVisibility?: Record<string, boolean>;
		headerConfig?: Record<string, any>;
	} = {};

	$: currentTemplateName = $siteConfigData?.template?.activeTemplate || 'modern';
	$: siteTemplateOverrides = $siteConfigData?.template || {};

	onMount(async () => {
		await loadTemplates();
		initializeLocalOverrides();
	});

	function initializeLocalOverrides() {
		localOverrides = {
			customColors: { ...siteTemplateOverrides.customColors },
			customFonts: { ...siteTemplateOverrides.customFonts },
			customLayout: { ...siteTemplateOverrides.customLayout },
			componentVisibility: { ...siteTemplateOverrides.componentVisibility },
			headerConfig: { ...siteTemplateOverrides.headerConfig }
		};
	}

	async function loadTemplates() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/admin/templates');
			if (!response.ok) {
				throw new Error('Failed to load templates');
			}
			const data = await response.json();
			templates = Array.isArray(data) ? data : [];
			activeTemplate = templates.find((t) => t.templateName === currentTemplateName) || templates[0] || null;
		} catch (err) {
			console.error('Error loading templates:', err);
			error = `Failed to load templates: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			loading = false;
		}
	}

	function updateColor(colorType: string, value: string) {
		if (!localOverrides.customColors) {
			localOverrides.customColors = {};
		}
		localOverrides.customColors[colorType] = value;
		localOverrides = { ...localOverrides };
		hasChanges = true;
	}

	function updateFont(fontType: string, value: string) {
		if (!localOverrides.customFonts) {
			localOverrides.customFonts = {};
		}
		localOverrides.customFonts[fontType] = value;
		localOverrides = { ...localOverrides };
		hasChanges = true;
	}

	function updateLayout(layoutType: string, value: string) {
		if (!localOverrides.customLayout) {
			localOverrides.customLayout = {};
		}
		localOverrides.customLayout[layoutType] = value;
		localOverrides = { ...localOverrides };
		hasChanges = true;
	}

	function updateVisibility(component: string, value: boolean) {
		if (!localOverrides.componentVisibility) {
			localOverrides.componentVisibility = {};
		}
		localOverrides.componentVisibility[component] = value;
		localOverrides = { ...localOverrides };
		hasChanges = true;
	}

	function updateHeaderConfig(configType: string, value: any) {
		if (!localOverrides.headerConfig) {
			localOverrides.headerConfig = {};
		}
		localOverrides.headerConfig[configType] = value;
		localOverrides = { ...localOverrides };
		hasChanges = true;
	}

	function getEffectiveColor(colorType: string): string {
		return localOverrides.customColors?.[colorType] || activeTemplate?.colors[colorType] || '#000000';
	}

	function getEffectiveFont(fontType: string): string {
		return localOverrides.customFonts?.[fontType] || activeTemplate?.fonts[fontType] || 'Inter';
	}

	function getEffectiveLayout(layoutType: string): string {
		return localOverrides.customLayout?.[layoutType] || activeTemplate?.layout[layoutType] || '';
	}

	function getEffectiveVisibility(component: string): boolean {
		return localOverrides.componentVisibility?.[component] !== undefined
			? localOverrides.componentVisibility[component]
			: activeTemplate?.visibility?.[component] ?? true;
	}

	function getEffectiveHeaderConfig(configType: string): boolean {
		return localOverrides.headerConfig?.[configType] !== undefined
			? localOverrides.headerConfig[configType]
			: activeTemplate?.componentsConfig?.header?.[configType] ?? true;
	}

	function hasOverrides(): boolean {
		return !!(
			(localOverrides.customColors && Object.keys(localOverrides.customColors).length > 0) ||
			(localOverrides.customFonts && Object.keys(localOverrides.customFonts).length > 0) ||
			(localOverrides.customLayout && Object.keys(localOverrides.customLayout).length > 0) ||
			(localOverrides.componentVisibility && Object.keys(localOverrides.componentVisibility).length > 0) ||
			(localOverrides.headerConfig && Object.keys(localOverrides.headerConfig).length > 0)
		);
	}

	async function saveOverrides() {
		saving = true;
		message = '';
		error = '';

		try {
			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					template: {
						activeTemplate: currentTemplateName,
						...localOverrides
					}
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to save overrides');
			}

			message = 'Template overrides saved successfully!';
			hasChanges = false;
			siteConfig.load(); // Refresh site config store

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error saving overrides:', err);
			error = `Failed to save overrides: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			saving = false;
		}
	}

	async function resetOverrides() {
		if (!confirm('Are you sure you want to reset all template overrides to default?')) {
			return;
		}

		resetting = true;
		message = '';
		error = '';

		try {
			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					template: {
						activeTemplate: currentTemplateName,
						customColors: {},
						customFonts: {},
						customLayout: {},
						componentVisibility: {},
						headerConfig: {}
					}
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to reset overrides');
			}

			message = 'Template overrides reset to default!';
			localOverrides = {};
			hasChanges = false;
			siteConfig.load(); // Refresh site config store

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error resetting overrides:', err);
			error = `Failed to reset overrides: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			resetting = false;
		}
	}

	function cancelChanges() {
		if (hasChanges && !confirm('You have unsaved changes. Are you sure you want to cancel?')) {
			return;
		}
		initializeLocalOverrides();
		hasChanges = false;
	}
</script>

<svelte:head>
	<title>Template Overrides - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<!-- Header -->
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center gap-4">
					<a
						href="/admin/templates"
						class="text-blue-600 hover:text-blue-800 text-sm font-medium"
					>
						← Back to Templates
					</a>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">Template Overrides</h1>
						<p class="text-gray-600 mt-1">
							Customize your active template:
							<span class="font-semibold">{activeTemplate?.displayName || currentTemplateName}</span>
						</p>
					</div>
				</div>
				<div class="flex gap-2">
					{#if hasChanges}
						<button
							type="button"
							on:click={cancelChanges}
							class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
						>
							Cancel
						</button>
					{/if}
					{#if hasOverrides()}
						<button
							type="button"
							on:click={resetOverrides}
							disabled={resetting}
							class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
						>
							{#if resetting}
								Resetting...
							{:else}
								Reset to Default
							{/if}
						</button>
					{/if}
					<button
						type="button"
						on:click={saveOverrides}
						disabled={!hasChanges || saving}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Saving...
						{:else}
							Save Changes
						{/if}
					</button>
				</div>
			</div>

			{#if message}
				<div class="mb-4 p-4 rounded-md bg-green-50 text-green-700">{message}</div>
			{/if}

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			{#if hasOverrides()}
				<div class="mb-4 p-4 rounded-md bg-blue-50 text-blue-700 text-sm">
					This template has custom overrides applied. Changes will be merged with the base template
					configuration.
				</div>
			{/if}

			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading template overrides...</p>
				</div>
			{:else if !activeTemplate}
				<div class="text-center py-8">
					<p class="text-gray-600">No active template found.</p>
				</div>
			{:else}
				<!-- Tabs -->
				<div class="border-b border-gray-200 mb-6">
					<nav class="-mb-px flex space-x-8">
						<button
							type="button"
							on:click={() => (activeTab = 'colors')}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'colors'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
						>
							🎨 Colors
						</button>
						<button
							type="button"
							on:click={() => (activeTab = 'fonts')}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'fonts'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
						>
							🔤 Fonts
						</button>
						<button
							type="button"
							on:click={() => (activeTab = 'layout')}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'layout'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
						>
							📐 Layout
						</button>
						<button
							type="button"
							on:click={() => (activeTab = 'visibility')}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'visibility'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
						>
							👁️ Visibility
						</button>
						<button
							type="button"
							on:click={() => (activeTab = 'header')}
							class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'header'
								? 'border-blue-500 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
						>
							⚙️ Header
						</button>
					</nav>
				</div>

				<!-- Tab Content -->
				{#if activeTab === 'colors'}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-gray-900">Color Customization</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							{#each ['primary', 'secondary', 'accent', 'background', 'text', 'muted'] as colorType}
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-2">
										{colorType.charAt(0).toUpperCase() + colorType.slice(1)} Color
									</label>
									<div class="flex gap-2">
										<input
											type="color"
											value={getEffectiveColor(colorType)}
											on:input={(e) => updateColor(colorType, e.target.value)}
											class="w-16 h-10 border border-gray-300 rounded cursor-pointer"
										/>
										<input
											type="text"
											value={getEffectiveColor(colorType)}
											on:input={(e) => updateColor(colorType, e.target.value)}
											placeholder="#000000"
											class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
									</div>
									<p class="mt-1 text-xs text-gray-500">
										Default: {activeTemplate.colors[colorType]}
									</p>
								</div>
							{/each}
						</div>
					</div>
				{:else if activeTab === 'fonts'}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-gray-900">Font Customization</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Heading Font
								</label>
								<input
									type="text"
									value={getEffectiveFont('heading')}
									on:input={(e) => updateFont('heading', e.target.value)}
									placeholder="Inter"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="mt-1 text-xs text-gray-500">Default: {activeTemplate.fonts.heading}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Body Font
								</label>
								<input
									type="text"
									value={getEffectiveFont('body')}
									on:input={(e) => updateFont('body', e.target.value)}
									placeholder="Inter"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="mt-1 text-xs text-gray-500">Default: {activeTemplate.fonts.body}</p>
							</div>
						</div>
					</div>
				{:else if activeTab === 'layout'}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-gray-900">Layout Customization</h2>
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Max Width
								</label>
								<input
									type="text"
									value={getEffectiveLayout('maxWidth')}
									on:input={(e) => updateLayout('maxWidth', e.target.value)}
									placeholder="1200px"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="mt-1 text-xs text-gray-500">Default: {activeTemplate.layout.maxWidth}</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Container Padding
								</label>
								<input
									type="text"
									value={getEffectiveLayout('containerPadding')}
									on:input={(e) => updateLayout('containerPadding', e.target.value)}
									placeholder="1rem"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="mt-1 text-xs text-gray-500">
									Default: {activeTemplate.layout.containerPadding}
								</p>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Grid Gap
								</label>
								<input
									type="text"
									value={getEffectiveLayout('gridGap')}
									on:input={(e) => updateLayout('gridGap', e.target.value)}
									placeholder="1.5rem"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
								<p class="mt-1 text-xs text-gray-500">Default: {activeTemplate.layout.gridGap}</p>
							</div>
						</div>
					</div>
				{:else if activeTab === 'visibility'}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-gray-900">Component Visibility</h2>
						<div class="space-y-4">
							{#each [
								{ key: 'hero', label: 'Hero Section', desc: 'Show the hero section on the home page' },
								{
									key: 'languageSelector',
									label: 'Language Selector',
									desc: 'Show the language selection dropdown'
								},
								{ key: 'authButtons', label: 'Auth Buttons', desc: 'Show login/logout buttons' },
								{ key: 'footerMenu', label: 'Footer Menu', desc: 'Show footer navigation menu' },
								{ key: 'statistics', label: 'Statistics', desc: 'Show site statistics' },
								{ key: 'promotion', label: 'Promotion', desc: 'Show promotional content' }
							] as component}
								<div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
									<div>
										<label class="text-sm font-medium text-gray-900">{component.label}</label>
										<p class="text-xs text-gray-500 mt-1">{component.desc}</p>
									</div>
									<label class="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											checked={getEffectiveVisibility(component.key)}
											on:change={(e) => updateVisibility(component.key, e.target.checked)}
											class="sr-only peer"
										/>
										<div
											class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
										></div>
									</label>
								</div>
							{/each}
						</div>
					</div>
				{:else if activeTab === 'header'}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-gray-900">Header Configuration</h2>
						<div class="space-y-4">
							{#each [
								{ key: 'showLogo', label: 'Show Logo', desc: 'Display the site logo in the header' },
								{
									key: 'showSiteTitle',
									label: 'Show Site Title',
									desc: 'Display the site title in the header'
								},
								{
									key: 'enableThemeToggle',
									label: 'Enable Theme Toggle',
									desc: 'Show dark/light mode toggle button'
								},
								{
									key: 'enableLanguageSelector',
									label: 'Enable Language Selector',
									desc: 'Show language selection dropdown'
								},
								{ key: 'showAuthButtons', label: 'Show Auth Buttons', desc: 'Display login/logout buttons' },
								{
									key: 'showGreeting',
									label: 'Show Greeting',
									desc: 'Display welcome message for logged-in users'
								}
							] as config}
								<div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
									<div>
										<label class="text-sm font-medium text-gray-900">{config.label}</label>
										<p class="text-xs text-gray-500 mt-1">{config.desc}</p>
									</div>
									<label class="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											checked={getEffectiveHeaderConfig(config.key)}
											on:change={(e) => updateHeaderConfig(config.key, e.target.checked)}
											class="sr-only peer"
										/>
										<div
											class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
										></div>
									</label>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

