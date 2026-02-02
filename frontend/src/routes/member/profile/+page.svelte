<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import { setLanguage } from '$lib/stores/language';
	import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
	import { getRoleLabel } from '$lib/constants/roles';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

	interface UserProfile {
		_id: string;
		email: string;
		name: string | { en?: string; he?: string };
		bio?: { en?: string; he?: string };
		role: string;
		preferredLanguage?: string;
		createdAt: string;
	}

	let profile: UserProfile | null = null;
	let loading = true;
	let saving = false;
	let error: string | null = null;
	let success: string | null = null;

	let formData = {
		name: { en: '', he: '' } as { en?: string; he?: string },
		bio: { en: '', he: '' } as { en?: string; he?: string },
		preferredLanguage: 'en' as string
	};

	onMount(async () => {
		await fetchProfile();
	});

	async function fetchProfile() {
		try {
			loading = true;
			const response = await fetch('/api/auth/profile');
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			profile = result.user || result;
			if (!profile) return;
			const nameObj = profile.name;
			const nameMulti = typeof nameObj === 'string' ? { en: nameObj } : (nameObj || { en: '', he: '' });
			const prefLang =
				profile.preferredLanguage && SUPPORTED_LANGUAGES.some((l) => l.code === profile!.preferredLanguage)
					? profile.preferredLanguage
					: 'en';
			formData = {
				name: { en: nameMulti.en || '', he: nameMulti.he || '' },
				bio: profile.bio || { en: '', he: '' },
				preferredLanguage: prefLang
			};
			setLanguage(prefLang);
		} catch (err) {
			logger.error('Failed to fetch profile:', err);
			error = handleError(err, 'Failed to fetch profile');
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		saving = true;
		error = null;
		success = null;

		try {
			const response = await fetch('/api/auth/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: formData.name,
					bio: formData.bio,
					preferredLanguage: formData.preferredLanguage || undefined
				})
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			profile = result.user;
			success = 'Portfolio updated successfully!';
			if (formData.preferredLanguage) {
				setLanguage(formData.preferredLanguage);
			}
		} catch (err) {
			logger.error('Failed to update portfolio:', err);
			error = handleError(err, 'Failed to update portfolio');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Portfolio - My Account</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-4 text-gray-600">Loading...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-4xl mx-auto px-4">
			<div class="flex justify-between items-center mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Portfolio</h1>
					<p class="text-gray-600 mt-2">Set your name, bio, and preferred language</p>
				</div>
				<a
					href="/member"
					class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Back to My Account
				</a>
			</div>

			<div class="bg-white rounded-lg shadow-md p-6">
				{#if error}
					<div class="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
						<p class="text-sm text-red-800">{error}</p>
					</div>
				{/if}
				{#if success}
					<div class="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
						<p class="text-sm text-green-800">{success}</p>
					</div>
				{/if}

				<form on:submit={handleSubmit} class="space-y-6">
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">Name</h3>
						<MultiLangInput bind:value={formData.name} />
					</div>

					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">Bio</h3>
						<MultiLangHTMLEditor bind:value={formData.bio} placeholder="A brief description about yourself" height={150} />
					</div>

					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">Preferred language</h3>
						<select
							bind:value={formData.preferredLanguage}
							class="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
						>
							{#each SUPPORTED_LANGUAGES as lang}
								<option value={lang.code}>{lang.flag} {lang.name} ({lang.nativeName})</option>
							{/each}
						</select>
					</div>

					{#if profile}
						<div>
							<h3 class="text-lg font-medium text-gray-900 mb-4">Account</h3>
							<div class="bg-gray-50 rounded-md p-4">
								<dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<dt class="text-sm font-medium text-gray-500">Email</dt>
										<dd class="mt-1 text-sm text-gray-900">{profile.email}</dd>
									</div>
									<div>
										<dt class="text-sm font-medium text-gray-500">Role</dt>
										<dd class="mt-1 text-sm text-gray-900">{getRoleLabel(profile.role)}</dd>
									</div>
								</dl>
							</div>
						</div>
					{/if}

					<div class="flex justify-end">
						<button
							type="submit"
							disabled={saving}
							class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if saving}
								<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Saving...
							{:else}
								Save Changes
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
