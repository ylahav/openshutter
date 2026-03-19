<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage, setLanguage } from '$lib/stores/language';
	import { SUPPORTED_LANGUAGES } from '$lib/types/multi-lang';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { t } from '$stores/i18n';
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
		preferredLanguage?: string;
		storageConfig?: {
			useAdminConfig?: boolean;
			googleDrive?: {
				rootFolderId?: string;
				sharedDriveId?: string;
				folderPrefix?: string;
			};
		};
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
	preferredLanguage: 'en' as string,
	currentPassword: '',
	newPassword: '',
	confirmPassword: '',
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
			const p = profile;
			const displayName = MultiLangUtils.getTextValue(p.name, $currentLanguage);
			const prefLang = p.preferredLanguage && SUPPORTED_LANGUAGES.some((l) => l.code === p.preferredLanguage)
				? p.preferredLanguage
				: 'en';
			formData = {
				name: displayName || '',
				email: p.email || '',
				bio: p.bio || { en: '', he: '' },
				profileImage: p.profileImage,
				preferredLanguage: prefLang,
				currentPassword: '',
				newPassword: '',
				confirmPassword: ''
			};
			// Apply preferred language so UI uses it (and persist to localStorage via store)
			setLanguage(prefLang);
		} catch (err) {
			logger.error('Failed to fetch profile:', err);
			error = handleError(err, $t('owner.requestFailed'));
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
					throw new Error($t('owner.passwordsDoNotMatch'));
				}
				if (formData.newPassword.length < 6) {
					throw new Error($t('owner.passwordTooShort'));
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
					preferredLanguage: formData.preferredLanguage || undefined,
					currentPassword: formData.currentPassword || undefined,
					newPassword: formData.newPassword || undefined
				})
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			profile = result.user;
			success = $t('owner.profileUpdatedSuccessfully');

			// Apply preferred language immediately so UI updates
			if (formData.preferredLanguage) {
				setLanguage(formData.preferredLanguage);
			}
			// If password was changed, refresh session so JWT has updated forcePasswordChange
			if (formData.newPassword) {
				try {
					const refreshRes = await fetch('/api/auth/refresh-session', { method: 'POST' });
					if (refreshRes.ok) {
						// Session cookie updated; next navigation will have correct user state
					}
				} catch (_) {
					// Non-fatal; user is still updated
				}
			}

			// Clear password fields
			formData = {
				...formData,
				currentPassword: '',
				newPassword: '',
				confirmPassword: ''
			};
		} catch (err) {
			logger.error('Failed to update profile:', err);
			error = handleError(err, $t('owner.requestFailed'));
		} finally {
			saving = false;
		}
	}

	function setSaving(value: boolean) {
		saving = value;
	}
</script>

<svelte:head>
	<title>{$t('owner.profileManagement')} - {$t('owner.ownerPanel')}</title>
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
					<h1 class="text-3xl font-bold text-gray-900">{$t('owner.profileManagement')}</h1>
					<p class="text-gray-600 mt-2">{$t('owner.editProfileDescription')}</p>
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
					{$t('owner.backToDashboard')}
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
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.basicInformation')}</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label for="name" class="block text-sm font-medium text-gray-700 mb-2">
									{$t('owner.name')}
								</label>
								<input
									type="text"
									id="name"
									bind:value={formData.name}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									placeholder={$t('owner.enterYourName')}
								/>
							</div>

							<div>
								<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
									{$t('owner.email')}
								</label>
								<input
									type="email"
									id="email"
									bind:value={formData.email}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									placeholder={$t('owner.enterYourEmail')}
								/>
							</div>
						</div>
					</div>

					<!-- Profile Image -->
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.profileImage')}</h3>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								{$t('owner.profileImageUrl')}
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
								placeholder={$t('owner.enterImageUrl')}
							/>
							<p class="mt-1 text-sm text-gray-500">
								{$t('owner.profileImageNote')}
							</p>
						</div>
					</div>

					<!-- Bio/Description -->
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.bio')}</h3>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								{$t('owner.bioDescription')}
							</label>
							<MultiLangHTMLEditor
								bind:value={formData.bio}
								placeholder={$t('owner.enterBioDescription')}
								height={150}
							/>
							<p class="mt-1 text-sm text-gray-500">{$t('owner.bioHelp')}</p>
						</div>
					</div>

					<!-- Password Change -->
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.changePassword')}</h3>
						<div class="space-y-4">
							<div>
								<label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-2">
									{$t('owner.currentPassword')}
								</label>
								<input
									type="password"
									id="currentPassword"
									bind:value={formData.currentPassword}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									placeholder={$t('owner.enterCurrentPassword')}
								/>
								<p class="mt-1 text-sm text-gray-500">{$t('owner.currentPasswordHelp')}</p>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
										{$t('owner.newPassword')}
									</label>
									<input
										type="password"
										id="newPassword"
										bind:value={formData.newPassword}
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
										placeholder={$t('owner.enterNewPassword')}
									/>
								</div>

								<div>
									<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
										{$t('owner.confirmPassword')}
									</label>
									<input
										type="password"
										id="confirmPassword"
										bind:value={formData.confirmPassword}
										class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
										placeholder={$t('owner.confirmNewPassword')}
									/>
								</div>
							</div>
						</div>
					</div>

					<!-- Preferred language -->
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.preferredLanguage')}</h3>
						<p class="text-sm text-gray-600 mb-3">{$t('owner.preferredLanguageHelp')}</p>
						<select
							bind:value={formData.preferredLanguage}
							class="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
						>
							{#each SUPPORTED_LANGUAGES as lang}
								<option value={lang.code}>{lang.flag} {lang.name} ({lang.nativeName})</option>
							{/each}
						</select>
					</div>

					<!-- Account Information -->
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.accountInformation')}</h3>
						<div class="bg-gray-50 rounded-md p-4">
							<dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<dt class="text-sm font-medium text-gray-500">{$t('owner.role')}</dt>
									<dd class="mt-1 text-sm text-gray-900 capitalize">{profile?.role}</dd>
								</div>
								<div>
									<dt class="text-sm font-medium text-gray-500">{$t('owner.memberSince')}</dt>
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
								{$t('owner.saving')}
							{:else}
								{$t('owner.saveChanges')}
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
