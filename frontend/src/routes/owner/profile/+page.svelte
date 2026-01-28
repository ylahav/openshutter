<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

	interface UserProfile {
		_id: string;
		email: string;
		name: string | { en?: string; he?: string };
		bio?: { en?: string; he?: string };
		profileImage?: {
			url: string;
			alt?: string | { en?: string; he?: string };
			storageProvider: string;
			storagePath: string;
		};
		role: string;
		createdAt: string;
	}

	let profile: UserProfile | null = null;
	let loading = true;
	let saving = false;
	let error: string | null = null;
	let success: string | null = null;

	let formData = {
		name: '' as string,
		email: '',
		bio: { en: '', he: '' } as { en?: string; he?: string },
		profileImage: undefined as UserProfile['profileImage'],
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
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
			const displayName = MultiLangUtils.getTextValue(profile.name, $currentLanguage);
			formData = {
				name: displayName || '',
				email: profile.email || '',
				bio: profile.bio || { en: '', he: '' },
				profileImage: profile.profileImage,
				currentPassword: '',
				newPassword: '',
				confirmPassword: ''
			};
		} catch (err) {
			logger.error('Failed to fetch profile:', err);
			error = handleError(err, 'Failed to fetch profile');
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		setSaving(true);
		error = null;
		success = null;

		try {
			// Validate password fields if changing password
			if (formData.newPassword || formData.confirmPassword) {
				if (formData.newPassword !== formData.confirmPassword) {
					throw new Error('Passwords do not match');
				}
				if (formData.newPassword.length < 6) {
					throw new Error('Password must be at least 6 characters');
				}
			}

			// Prepare name as multi-language object
			const nameUpdate =
				profile?.name && typeof profile.name === 'object'
					? MultiLangUtils.setValue(profile.name, $currentLanguage, formData.name)
					: { [$currentLanguage]: formData.name };

			const response = await fetch('/api/auth/profile', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: nameUpdate,
					email: formData.email,
					bio: formData.bio,
					profileImage: formData.profileImage,
					currentPassword: formData.currentPassword || undefined,
					newPassword: formData.newPassword || undefined
				})
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			profile = result.user;
			success = 'Profile updated successfully!';

			// Clear password fields
			formData = {
				...formData,
				currentPassword: '',
				newPassword: '',
				confirmPassword: ''
			};
		} catch (err) {
			logger.error('Failed to update profile:', err);
			error = handleError(err, 'Failed to update profile');
		} finally {
			saving = false;
		}
	}

	function setSaving(value: boolean) {
		saving = value;
	}
</script>

<svelte:head>
	<title>Profile Management - Owner</title>
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
			<!-- Header -->
			<div class="flex justify-between items-center mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Profile Management</h1>
					<p class="text-gray-600 mt-2">Edit your personal information and profile settings</p>
				</div>
				<button
					on:click={() => goto('/owner')}
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
					Back to Dashboard
				</button>
			</div>

			<!-- Profile Form -->
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
					<!-- Basic Information -->
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label for="name" class="block text-sm font-medium text-gray-700 mb-2"> Name </label>
								<input
									type="text"
									id="name"
									bind:value={formData.name}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									placeholder="Enter your name"
								/>
							</div>

							<div>
								<label for="email" class="block text-sm font-medium text-gray-700 mb-2"> Email </label>
								<input
									type="email"
									id="email"
									bind:value={formData.email}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									placeholder="Enter your email"
								/>
							</div>
						</div>
					</div>

					<!-- Profile Image -->
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">Profile Image</h3>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Profile Image URL
							</label>
                <input
                  type="url"
                  value={formData.profileImage?.url || ''}
                  on:input={(e) => {
                    formData.profileImage = {
										url: e.currentTarget.value,
										storageProvider: 'local',
										storagePath: ''
									};
								}}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								placeholder="Enter image URL"
							/>
							<p class="mt-1 text-sm text-gray-500">
								Note: Full image upload functionality will be available in a future update
							</p>
						</div>
					</div>

					<!-- Bio/Description -->
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">Bio</h3>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2"> Bio Description </label>
							<MultiLangHTMLEditor
								bind:value={formData.bio}
								placeholder="Enter bio description..."
								height={150}
							/>
							<p class="mt-1 text-sm text-gray-500">A brief description about yourself</p>
						</div>
					</div>

					<!-- Password Change -->
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
						<div class="space-y-4">
							<div>
								<label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-2">
									Current Password
								</label>
								<input
									type="password"
									id="currentPassword"
									bind:value={formData.currentPassword}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									placeholder="Enter current password"
								/>
								<p class="mt-1 text-sm text-gray-500">Required when changing password</p>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
										New Password
									</label>
									<input
										type="password"
										id="newPassword"
										bind:value={formData.newPassword}
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
										placeholder="Enter new password"
									/>
								</div>

								<div>
									<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
										Confirm Password
									</label>
									<input
										type="password"
										id="confirmPassword"
										bind:value={formData.confirmPassword}
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
										placeholder="Confirm new password"
									/>
								</div>
							</div>
						</div>
					</div>

					<!-- Account Information -->
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
						<div class="bg-gray-50 rounded-md p-4">
							<dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<dt class="text-sm font-medium text-gray-500">Role</dt>
									<dd class="mt-1 text-sm text-gray-900 capitalize">{profile?.role}</dd>
								</div>
								<div>
									<dt class="text-sm font-medium text-gray-500">Member Since</dt>
									<dd class="mt-1 text-sm text-gray-900">
										{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}
									</dd>
								</div>
							</dl>
						</div>
					</div>

					<!-- Submit Button -->
					<div class="flex justify-end">
						<button
							type="submit"
							disabled={saving}
							class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if saving}
								<svg
									class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
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
