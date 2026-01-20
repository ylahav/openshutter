<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { siteConfigData, siteConfig } from '$stores/siteConfig';

  export const data = undefined as any; // From +layout.server.ts, not used in this component

	interface TemplateConfig {
		templateName: string;
		displayName: string;
		description: string;
		version: string;
		author: string;
		thumbnail: string;
		category: string;
		features: {
			responsive: boolean;
			darkMode: boolean;
			animations: boolean;
			seoOptimized: boolean;
		};
		colors: {
			primary: string;
			secondary: string;
			accent: string;
			background: string;
			text: string;
			muted: string;
		};
	}

	let templates: TemplateConfig[] = [];
	let loading = true;
	let saving = false;
	let message = '';
	let error = '';

	$: activeTemplate = $siteConfigData?.template?.activeTemplate || 'modern';

	onMount(async () => {
		await loadTemplates();
	});

	async function loadTemplates() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/admin/templates');
			const result = await response.json();
			
			if (!response.ok) {
				// Handle error response
				const errorMsg = result.error || result.message || `HTTP ${response.status}: ${response.statusText}`;
				throw new Error(errorMsg);
			}
			
			// Handle both wrapped {success, data} and direct array formats
			let loadedTemplates: TemplateConfig[] = [];
			if (result.success !== undefined) {
				// Wrapped format: {success: true, data: [...]}
				if (result.success && Array.isArray(result.data)) {
					loadedTemplates = result.data;
				} else if (!result.success) {
					throw new Error(result.error || result.message || 'Failed to load templates');
				}
			} else if (Array.isArray(result)) {
				// Direct array format
				loadedTemplates = result;
			} else {
				throw new Error('Invalid response format from server');
			}
			
			// Filter out 'default' template as it's a duplicate of 'minimal'
			templates = loadedTemplates.filter((t) => t.templateName !== 'default');
			
			if (templates.length === 0) {
				error = 'No templates found. Please check backend configuration.';
			}
		} catch (err) {
			console.error('Error loading templates:', err);
			error = `Failed to load templates: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			loading = false;
		}
	}

	async function setActiveTemplate(templateName: string) {
		if (templateName === activeTemplate) {
			return;
		}

		saving = true;
		message = '';
		error = '';

		try {
			// Update site config with new active template
			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					template: {
						activeTemplate: templateName
					}
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to update template');
			}

			message = `Template "${templateName}" activated successfully!`;
			siteConfig.load(); // Refresh site config store

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error setting active template:', err);
			error = `Failed to set active template: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			saving = false;
		}
	}

	function getCategoryColor(category: string): string {
		const colors: Record<string, string> = {
			minimal: 'gray',
			modern: 'blue',
			classic: 'purple',
			dark: 'slate',
			custom: 'indigo',
			elegant: 'pink'
		};
		return colors[category] || 'gray';
	}
</script>

<svelte:head>
	<title>Template Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Template Management</h1>
					<p class="text-gray-600 mt-2">Choose and manage your gallery templates</p>
				</div>
				<a
					href="/admin"
					class="text-blue-600 hover:text-blue-800 text-sm font-medium"
				>
					← Back to Admin
				</a>
			</div>

			{#if message}
				<div class="mb-4 p-4 rounded-md bg-green-50 text-green-700">{message}</div>
			{/if}

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading templates...</p>
				</div>
			{:else if templates.length === 0}
				<div class="text-center py-8">
					<p class="text-gray-600">No templates available.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each templates as template}
						{@const isActive = template.templateName === activeTemplate}
						{@const categoryColor = getCategoryColor(template.category)}
						<div
							class="bg-white border-2 rounded-lg overflow-hidden transition-all hover:shadow-lg {isActive
								? 'border-blue-500 shadow-md'
								: 'border-gray-200'}"
						>
							<!-- Template Preview/Thumbnail -->
							<div class="h-48 bg-gradient-to-br {template.colors.primary} flex items-center justify-center relative">
								{#if template.thumbnail && template.thumbnail !== '/templates/default/thumbnail.jpg'}
									<img
										src={template.thumbnail}
										alt={template.displayName}
										class="w-full h-full object-cover"
									/>
								{:else}
									<div class="text-white text-4xl font-bold">{template.displayName}</div>
								{/if}
								{#if isActive}
									<div
										class="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold"
									>
										Active
									</div>
								{/if}
							</div>

							<!-- Template Info -->
							<div class="p-4">
								<div class="flex items-start justify-between mb-2">
									<div>
										<h3 class="text-lg font-semibold text-gray-900">{template.displayName}</h3>
										<p class="text-sm text-gray-500">{template.description}</p>
									</div>
									<span
										class="px-2 py-1 text-xs font-medium rounded bg-{categoryColor}-100 text-{categoryColor}-800"
									>
										{template.category}
									</span>
								</div>

								<!-- Template Features -->
								<div class="flex flex-wrap gap-2 mt-3 mb-4">
									{#if template.features.responsive}
										<span class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Responsive</span>
									{/if}
									{#if template.features.darkMode}
										<span class="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">Dark Mode</span>
									{/if}
									{#if template.features.animations}
										<span class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Animations</span>
									{/if}
									{#if template.features.seoOptimized}
										<span class="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">SEO</span>
									{/if}
								</div>

								<!-- Template Colors Preview -->
								<div class="flex gap-1 mb-4">
									<div
										class="w-6 h-6 rounded-full border border-gray-300"
										style="background-color: {template.colors.primary}"
										title="Primary: {template.colors.primary}"
									></div>
									<div
										class="w-6 h-6 rounded-full border border-gray-300"
										style="background-color: {template.colors.secondary}"
										title="Secondary: {template.colors.secondary}"
									></div>
									<div
										class="w-6 h-6 rounded-full border border-gray-300"
										style="background-color: {template.colors.accent}"
										title="Accent: {template.colors.accent}"
									></div>
									<div
										class="w-6 h-6 rounded-full border border-gray-300"
										style="background-color: {template.colors.background}"
										title="Background: {template.colors.background}"
									></div>
								</div>

								<!-- Template Meta -->
								<div class="text-xs text-gray-500 mb-4">
									<p>Version: {template.version}</p>
									<p>Author: {template.author}</p>
								</div>

								<!-- Actions -->
								<div class="flex gap-2">
									{#if isActive}
										<button
											type="button"
											disabled
											class="flex-1 px-4 py-2 bg-gray-200 text-gray-600 rounded-md cursor-not-allowed text-sm font-medium"
										>
											Currently Active
										</button>
									{:else}
										<button
											type="button"
											on:click={() => setActiveTemplate(template.templateName)}
											disabled={saving}
											class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
										>
											{#if saving}
												Activating...
											{:else}
												Activate Template
											{/if}
										</button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Current Active Template Info -->
				<div class="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
					<h2 class="text-lg font-semibold text-gray-900 mb-2">Current Active Template</h2>
					<p class="text-gray-700">
						The <strong>{activeTemplate}</strong> template is currently active and being used for your gallery.
					</p>
					<p class="text-sm text-gray-600 mt-2">
						To change the template, click "Activate Template" on any template card above.
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
