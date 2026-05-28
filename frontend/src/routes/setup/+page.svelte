<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { productName } from '$stores/siteConfig';
	import { logger } from '$lib/utils/logger';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	let loading = true;
	let showLandingPage = false;
	let error = $state<string | null>(null);
	let submitting = $state(false);

	// Form data
	let username = $state('admin@openshutter.org');
	let password = $state('');
	let confirmPassword = $state('');
	let siteTitle = $state('');
	let siteDescription = $state('');
	let logoPreview = $state<string | null>(null);

	$effect(() => {
		if (form?.error) {
			error = form.error;
		}
	});

	onMount(async () => {
		try {
			const response = await fetch('/api/init/check-default-password');
			const data = await response.json();
			
			if (data.showLandingPage) {
				showLandingPage = true;
			} else {
				// Conditions not met, redirect to home
				window.location.href = '/';
			}
		} catch (err) {
			logger.error('Failed to check setup status:', err);
			error = 'Failed to check setup status';
		} finally {
			loading = false;
		}
	});

	function handleLogoChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			const file = target.files[0];
			const reader = new FileReader();
			reader.onload = (e) => {
				logoPreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	function removeLogo() {
		logoPreview = null;
		const fileInput = document.getElementById('logo') as HTMLInputElement;
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function validateSetupForm(): string | null {
		if (!username || !username.trim()) {
			return 'Username is required';
		}
		if (!password) {
			return 'Password is required';
		}
		if (password.length < 6) {
			return 'Password must be at least 6 characters long';
		}
		if (password !== confirmPassword) {
			return 'Passwords do not match';
		}
		if (!siteTitle || !siteTitle.trim()) {
			return 'Site title is required';
		}
		return null;
	}

	const handleEnhance = () => {
		return async ({
			cancel,
		}: {
			cancel: () => void;
		}) => {
			error = null;
			const validationError = validateSetupForm();
			if (validationError) {
				error = validationError;
				cancel();
				return;
			}
			submitting = true;

			return async ({
				result,
				update,
			}: {
				result: { type: string; data?: { error?: string } };
				update: (opts?: { reset: boolean }) => Promise<void>;
			}) => {
				submitting = false;
				if (result.type === 'failure') {
					error = result.data?.error ?? 'Setup failed';
					await update({ reset: false });
				} else if (result.type === 'error') {
					error = 'An error occurred during setup. Please try again.';
					await update({ reset: false });
				}
			};
		};
	};
</script>

<svelte:head>
	<title>Initial Setup - {$productName}</title>
</svelte:head>

<div class="w-full min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	{#if loading}
		<div class="text-center">
			<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<p class="mt-4 text-gray-600">Checking setup status...</p>
		</div>
	{:else if error && !showLandingPage}
		<div class="max-w-md w-full">
			<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
				{error}
			</div>
		</div>
	{:else if showLandingPage}
		<div class="max-w-2xl w-full space-y-8">
			<div class="text-center">
				<h1 class="text-4xl font-extrabold text-gray-900 mb-4">
					Welcome to OpenShutter
				</h1>
				<p class="text-xl text-gray-600 mb-8">
					Let's set up your gallery. Configure your admin account and site settings.
				</p>
			</div>

			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={handleEnhance}
				class="bg-white shadow-md rounded-lg p-8 space-y-6"
			>
				{#if error}
					<div class="bg-red-50 border-l-4 border-red-400 p-4">
						<p class="text-sm text-red-700">{error}</p>
					</div>
				{/if}

				<!-- Admin User Section -->
				<div class="border-b border-gray-200 pb-6">
					<h2 class="text-2xl font-semibold text-gray-900 mb-4">
						Admin Account
					</h2>
					<p class="text-sm text-gray-600 mb-6">
						Set up your administrator account credentials.
					</p>

					<div class="space-y-4">
						<div>
							<label for="username" class="block text-sm font-medium text-gray-700 mb-1">
								Username / Email <span class="text-red-500">*</span>
							</label>
							<input
								id="username"
								name="username"
								type="email"
								required
								bind:value={username}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								placeholder="admin@example.com"
							/>
						</div>

						<div>
							<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
								Password <span class="text-red-500">*</span>
							</label>
							<input
								id="password"
								name="password"
								type="password"
								required
								bind:value={password}
								minlength="6"
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								placeholder="Enter a secure password"
							/>
							<p class="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
						</div>

						<div>
							<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
								Confirm Password <span class="text-red-500">*</span>
							</label>
							<input
								id="confirmPassword"
								type="password"
								required
								bind:value={confirmPassword}
								minlength="6"
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								placeholder="Confirm your password"
							/>
						</div>
					</div>
				</div>

				<!-- Site Configuration Section -->
				<div class="border-b border-gray-200 pb-6">
					<h2 class="text-2xl font-semibold text-gray-900 mb-4">
						Site Configuration
					</h2>
					<p class="text-sm text-gray-600 mb-6">
						Configure your site's basic information.
					</p>

					<div class="space-y-4">
						<div>
							<label for="siteTitle" class="block text-sm font-medium text-gray-700 mb-1">
								Site Title <span class="text-red-500">*</span>
							</label>
							<input
								id="siteTitle"
								name="title"
								type="text"
								required
								bind:value={siteTitle}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								placeholder="My Photo Gallery"
							/>
						</div>

						<div>
							<label for="siteDescription" class="block text-sm font-medium text-gray-700 mb-1">
								Site Description (Optional)
							</label>
							<textarea
								id="siteDescription"
								name="description"
								bind:value={siteDescription}
								rows="4"
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								placeholder="A beautiful photo gallery showcasing my work"
							></textarea>
						</div>

						<div>
							<label for="logo" class="block text-sm font-medium text-gray-700 mb-1">
								Logo (Optional)
							</label>
							<div class="space-y-2">
								{#if logoPreview}
									<div class="relative inline-block">
										<img src={logoPreview} alt="Logo preview" class="h-20 w-auto border border-gray-300 rounded" />
										<button
											type="button"
											on:click={removeLogo}
											class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
										>
											×
										</button>
									</div>
								{/if}
								<input
									id="logo"
									name="logo"
									type="file"
									accept="image/*"
									on:change={handleLogoChange}
									class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
								/>
								<p class="text-xs text-gray-500">Recommended: PNG or JPG, max 5MB</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Submit Button -->
				<div class="pt-4">
					<button
						type="submit"
						disabled={submitting}
						class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if submitting}
							<span class="flex items-center justify-center">
								<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Setting up...
							</span>
						{:else}
							Complete Setup
						{/if}
					</button>
				</div>
			</form>
		</div>
	{/if}
</div>
