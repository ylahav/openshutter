<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

	interface TemplateComponentVisibility {
		hero: boolean;
		languageSelector: boolean;
		authButtons: boolean;
		footerMenu: boolean;
		statistics: boolean;
		promotion: boolean;
	}

	let loading = true;
	let saving = false;
	let message: string | null = null;
	let error: string | null = null;
	let activeTemplate = 'default';
	let localVisibility: TemplateComponentVisibility = {
		hero: true,
		languageSelector: true,
		authButtons: true,
		footerMenu: true,
		statistics: true,
		promotion: true
	};

	const componentLabels = {
		hero: 'Hero Section',
		languageSelector: 'Language Selector',
		authButtons: 'Login/Logout Buttons',
		footerMenu: 'Footer Menu',
		statistics: 'Statistics Section',
		promotion: 'Promotion Section'
	};

	const componentDescriptions = {
		hero: 'The main hero section displayed on the home page',
		languageSelector: 'Language selection dropdown in the header',
		authButtons: 'Login and logout buttons in the header',
		footerMenu: 'Footer menu and links at the bottom of pages',
		statistics: 'Statistics section showing album and photo counts below the albums grid',
		promotion: 'Promotion section with call-to-action buttons below the statistics'
	};

	onMount(async () => {
		await loadConfig();
	});

	async function loadConfig() {
		try {
			loading = true;
			const response = await fetch('/api/admin/site-config');
			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					const config = result.data;
					activeTemplate = config.template?.activeTemplate || 'default';
					if (config.template?.componentVisibility) {
						localVisibility = { ...localVisibility, ...config.template.componentVisibility };
					}
				}
			}
		} catch (err) {
			logger.error('Failed to load config:', err);
			error = handleError(err, 'Failed to load template configuration');
		} finally {
			loading = false;
		}
	}

	function handleVisibilityChange(component: keyof TemplateComponentVisibility, value: boolean) {
		localVisibility = {
			...localVisibility,
			[component]: value
		};
	}

	async function handleSave() {
		try {
			saving = true;
			message = null;
			error = null;

			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					template: {
						activeTemplate: activeTemplate,
						componentVisibility: localVisibility
					}
				})
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			if (result.success) {
				message = 'Template configuration saved successfully!';
			} else {
				throw new Error(result.error || 'Failed to save template configuration');
			}
		} catch (err) {
			console.error('Error saving template configuration:', err);
			error = 'Failed to save template configuration';
		} finally {
			saving = false;
		}
	}

	async function handleReset() {
		try {
			saving = true;
			message = null;
			error = null;

			const response = await fetch('/api/admin/site-config', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					template: {
						activeTemplate: activeTemplate,
						componentVisibility: undefined
					}
				})
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			if (result.success) {
				message = 'Template configuration reset to defaults!';
				localVisibility = {
					hero: true,
					languageSelector: true,
					authButtons: true,
					footerMenu: true,
					statistics: true,
					promotion: true
				};
			} else {
				throw new Error(result.error || 'Failed to reset template configuration');
			}
		} catch (err) {
			logger.error('Error resetting template configuration:', err);
			error = handleError(err, 'Failed to reset template configuration');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Template Configuration - Admin</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-4xl mx-auto px-4">
			<div class="bg-white rounded-lg shadow p-6">
				<div class="animate-pulse">
					<div class="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
					<div class="space-y-4">
						{#each [1, 2, 3, 4, 5, 6] as i}
							<div class="h-16 bg-gray-200 rounded"></div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-8">
		<Header />

		<div class="max-w-4xl mx-auto px-4">
			<div class="bg-white rounded-lg shadow">
				<!-- Header -->
				<div class="px-6 py-4 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<div>
							<h1 class="text-2xl font-bold text-gray-900">Template Configuration</h1>
							<p class="text-gray-600 mt-1">Configure which components are visible in your template</p>
						</div>
						<button
							on:click={() => goto('/admin')}
							class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
						>
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 19l-7-7m0 0l7-7m-7 7h18"
								/>
							</svg>
							Back to Admin
						</button>
					</div>
				</div>

				<!-- Content -->
				<div class="p-6">
					{#if error}
						<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
							<p class="text-red-800">{error}</p>
						</div>
					{/if}

					{#if message}
						<div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
							<p class="text-green-800">{message}</p>
						</div>
					{/if}

					<!-- Current Template Info -->
					<div class="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
						<h3 class="text-lg font-semibold text-blue-900 mb-2">Current Template</h3>
						<p class="text-blue-800">
							<span class="font-medium">Active Template:</span> {activeTemplate}
						</p>
						<p class="text-blue-800 text-sm mt-1">
							Configure which components should be visible in this template. Changes will apply immediately.
						</p>
					</div>

					<!-- Component Visibility Settings -->
					<div class="space-y-6">
						<h3 class="text-lg font-semibold text-gray-900">Component Visibility</h3>

						{#each Object.entries(componentLabels) as [component, label]}
							<div class="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
								<div class="flex-shrink-0">
									<input
										type="checkbox"
										id={component}
										checked={localVisibility[component as keyof TemplateComponentVisibility]}
										on:change={(e) =>
											handleVisibilityChange(
												component as keyof TemplateComponentVisibility,
												e.currentTarget.checked
											)}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
									/>
								</div>
								<div class="flex-1">
									<label for={component} class="text-sm font-medium text-gray-900 cursor-pointer">
										{label}
									</label>
									<p class="text-sm text-gray-600 mt-1">
										{componentDescriptions[component as keyof typeof componentDescriptions]}
									</p>
								</div>
								<div class="flex-shrink-0">
									<span
										class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {localVisibility[component as keyof TemplateComponentVisibility]
											? 'bg-green-100 text-green-800'
											: 'bg-red-100 text-red-800'}"
									>
										{localVisibility[component as keyof TemplateComponentVisibility]
											? 'Visible'
											: 'Hidden'}
									</span>
								</div>
							</div>
						{/each}
					</div>

					<!-- Action Buttons -->
					<div class="mt-8 flex items-center justify-between">
						<button
							on:click={handleReset}
							disabled={saving}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Reset to Defaults
						</button>

						<button
							on:click={handleSave}
							disabled={saving}
							class="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{saving ? 'Saving...' : 'Save Configuration'}
						</button>
					</div>
				</div>
			</div>
		</div>

		<Footer />
	</div>
{/if}
