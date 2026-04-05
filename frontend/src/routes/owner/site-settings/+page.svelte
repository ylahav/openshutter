<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import type { MultiLangText, MultiLangHTML } from '$lib/types/multi-lang';
import { logger } from '$lib/utils/logger';
import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
import { t } from '$stores/i18n';
	import type { PageData } from './$types';

	export let data: PageData;

	const isOwner = data?.user?.role === 'owner';
	let loading = true;
	let saving = false;
	let uploadingLogo = false;
	let error: string | null = null;
	let success: string | null = null;

	let activeTab: 'branding' | 'hero' | 'seo' | 'contact' = 'branding';
	let formData = {
		siteName: {} as MultiLangText,
		description: {} as MultiLangHTML,
		logo: '' as string,
		favicon: '' as string,
		hero: {
			title: {} as MultiLangText,
			subtitle: {} as MultiLangText,
			ctaLabel: {} as MultiLangText,
			ctaUrl: '',
			backgroundStyle: 'light' as string,
			backgroundImage: '',
		},
		seo: { metaTitle: {} as MultiLangText, metaDescription: {} as MultiLangText },
		contact: { email: '', socialMedia: { facebook: '', instagram: '', twitter: '' } as Record<string, string> },
		footer: { copyrightText: '', termsUrl: '', privacyUrl: '' },
	};

	onMount(async () => {
		await fetchSettings();
	});

	async function fetchSettings() {
		try {
			loading = true;
			error = null;
			const response = await fetch('/api/owner/site-settings');
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			const raw = result.data ?? result;
			const hero = raw.hero && typeof raw.hero === 'object' ? raw.hero : {};
			const seo = raw.seo && typeof raw.seo === 'object' ? raw.seo : {};
			const contact = raw.contact && typeof raw.contact === 'object' ? raw.contact : {};
			const footer = raw.footer && typeof raw.footer === 'object' ? raw.footer : {};
			formData = {
				siteName: (raw.siteName && typeof raw.siteName === 'object') ? raw.siteName : {},
				description: (raw.description && typeof raw.description === 'object') ? raw.description : {},
				logo: typeof raw.logo === 'string' ? raw.logo : '',
				favicon: typeof raw.favicon === 'string' ? raw.favicon : '',
				hero: {
					title: (hero.title && typeof hero.title === 'object') ? hero.title : {},
					subtitle: (hero.subtitle && typeof hero.subtitle === 'object') ? hero.subtitle : {},
					ctaLabel: (hero.ctaLabel && typeof hero.ctaLabel === 'object') ? hero.ctaLabel : {},
					ctaUrl: typeof hero.ctaUrl === 'string' ? hero.ctaUrl : '',
					backgroundStyle: typeof hero.backgroundStyle === 'string' ? hero.backgroundStyle : 'light',
					backgroundImage: typeof hero.backgroundImage === 'string' ? hero.backgroundImage : '',
				},
				seo: {
					metaTitle: (seo.metaTitle && typeof seo.metaTitle === 'object') ? seo.metaTitle : {},
					metaDescription: (seo.metaDescription && typeof seo.metaDescription === 'object') ? seo.metaDescription : {},
				},
				contact: {
					email: typeof contact.email === 'string' ? contact.email : '',
					socialMedia: contact.socialMedia && typeof contact.socialMedia === 'object' ? { facebook: '', instagram: '', twitter: '', ...contact.socialMedia } : { facebook: '', instagram: '', twitter: '' },
				},
				footer: {
					copyrightText: typeof footer.copyrightText === 'string' ? footer.copyrightText : '',
					termsUrl: typeof footer.termsUrl === 'string' ? footer.termsUrl : '',
					privacyUrl: typeof footer.privacyUrl === 'string' ? footer.privacyUrl : '',
				},
			};
		} catch (err) {
			logger.error('Failed to fetch site settings:', err);
			error = handleError(err, $t('owner.requestFailed'));
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
			const response = await fetch('/api/owner/site-settings', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteName: formData.siteName,
					description: formData.description,
					logo: formData.logo.trim(),
					favicon: formData.favicon.trim(),
					hero: formData.hero,
					seo: formData.seo,
					contact: formData.contact,
					footer: formData.footer,
				}),
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			success = $t('owner.siteSettingsSaved');
		} catch (err) {
			logger.error('Failed to update site settings:', err);
			error = handleError(err, $t('owner.requestFailed'));
		} finally {
			saving = false;
		}
	}

	async function handleLogoUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input?.files?.[0];
		if (!file) return;
		uploadingLogo = true;
		error = null;
		try {
			const formDataUpload = new FormData();
			formDataUpload.append('file', file);
			const response = await fetch('/api/owner/site-settings/upload-logo', {
				method: 'POST',
				body: formDataUpload,
			});
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			const url = result?.url ?? result?.data?.url;
			if (typeof url === 'string') {
				formData.logo = url;
			}
		} catch (err) {
			logger.error('Logo upload failed:', err);
			error = handleError(err, $t('owner.failedToUploadLogo'));
		} finally {
			uploadingLogo = false;
			input.value = '';
		}
	}
</script>

<svelte:head>
	<title>{$t('owner.siteSettings')} - {$t('owner.ownerPanel')}</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-4 text-gray-600">Loading...</p>
		</div>
	</div>
{:else if !isOwner}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-4xl mx-auto px-4">
			<p class="text-gray-600 mb-4">{$t('owner.siteSettingsEditorsOnly')}</p>
			<a href="/owner" class="text-blue-600 hover:underline">{$t('owner.backToDashboard')}</a>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-4xl mx-auto px-4">
			<div class="flex justify-between items-center mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">{$t('owner.siteSettings')}</h1>
					<p class="text-gray-600 mt-2">
						{$t('owner.siteSettingsHero')}
					</p>
				</div>
				<button
					on:click={() => goto('/owner')}
					class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					{$t('owner.backToDashboard')}
				</button>
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

				<div class="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
					<button type="button" class="px-3 py-1.5 rounded text-sm font-medium {activeTab === 'branding' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}" on:click={() => activeTab = 'branding'}>{$t('owner.siteSettingsBrandingTab')}</button>
					<button type="button" class="px-3 py-1.5 rounded text-sm font-medium {activeTab === 'hero' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}" on:click={() => activeTab = 'hero'}>{$t('owner.siteSettingsHeroTab')}</button>
					<button type="button" class="px-3 py-1.5 rounded text-sm font-medium {activeTab === 'seo' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}" on:click={() => activeTab = 'seo'}>{$t('owner.siteSettingsSeoTab')}</button>
					<button type="button" class="px-3 py-1.5 rounded text-sm font-medium {activeTab === 'contact' ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'}" on:click={() => activeTab = 'contact'}>{$t('owner.siteSettingsContactTab')}</button>
					<a href="/owner/theme" class="ml-auto px-3 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-gray-100">
						{$t('owner.siteSettingsThemeLink')}
					</a>
				</div>

				<form on:submit={handleSubmit} class="space-y-6">
					{#if activeTab === 'branding'}
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.siteName')}</h3>
						<p class="text-sm text-gray-600 mb-3">
							{$t('owner.siteNameHelp')}
						</p>
						<MultiLangInput
							bind:value={formData.siteName}
							placeholder={$t('owner.siteNamePlaceholder')}
							className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.siteDescription')}</h3>
						<p class="text-sm text-gray-600 mb-3">
							{$t('owner.siteDescriptionHelp')}
						</p>
						<MultiLangHTMLEditor
							bind:value={formData.description}
							placeholder={$t('owner.siteDescriptionPlaceholder')}
							height={150}
						/>
					</div>

					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">
							{$t('owner.siteLogo')}
							<span class="text-sm font-normal text-gray-500">({$t('owner.optional')})</span>
						</h3>
						<p class="text-sm text-gray-600 mb-3">
							{$t('owner.siteLogoHelp')}
						</p>
						<div class="space-y-3">
							<div class="flex flex-wrap items-center gap-3">
								<label class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
									<input
										type="file"
										accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
										class="sr-only"
										on:change={handleLogoUpload}
										disabled={uploadingLogo}
									/>
									{#if uploadingLogo}
										<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
											<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
										</svg>
									{/if}
									{uploadingLogo ? $t('owner.uploading') : $t('owner.uploadImage')}
								</label>
							</div>
							<div>
								<label for="logo-url" class="block text-sm font-medium text-gray-700 mb-1">
									{$t('owner.orPasteLogoUrl')}
								</label>
								<input
									id="logo-url"
									type="url"
									bind:value={formData.logo}
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									placeholder="https://example.com/logo.png"
								/>
							</div>
						</div>
						{#if formData.logo && formData.logo.trim()}
							<div class="mt-2 flex items-center gap-3">
								<span class="text-sm text-gray-500">{$t('owner.preview')}</span>
								<img
									src={formData.logo}
									alt={$t('owner.logoPreviewAlt')}
									class="h-10 object-contain max-w-[200px] bg-gray-50 rounded border border-gray-200"
									on:error={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
								/>
							</div>
						{/if}
					</div>

					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">
							{$t('owner.favicon')}
							<span class="text-sm font-normal text-gray-500">({$t('owner.optional')})</span>
						</h3>
						<p class="text-sm text-gray-600 mb-2">{$t('owner.faviconHelp')}</p>
						<input
							type="url"
							bind:value={formData.favicon}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							placeholder="https://example.com/favicon.ico"
						/>
					</div>
					{/if}

					{#if activeTab === 'hero'}
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.heroTitle')}</h3>
						<p class="text-sm text-gray-600 mb-3">
							{$t('owner.heroHelp')}
						</p>
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">{$t('owner.heroTitleLabel')}</label>
								<MultiLangInput
									bind:value={formData.hero.title}
									placeholder={$t('owner.heroTitlePlaceholder')}
									className="w-full px-3 py-2 border border-gray-300 rounded-md"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">{$t('owner.heroSubtitleLabel')}</label>
								<MultiLangInput
									bind:value={formData.hero.subtitle}
									placeholder={$t('owner.heroSubtitlePlaceholder')}
									className="w-full px-3 py-2 border border-gray-300 rounded-md"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">{$t('owner.heroCtaLabel')}</label>
								<MultiLangInput
									bind:value={formData.hero.ctaLabel}
									placeholder={$t('owner.heroCtaPlaceholder')}
									className="w-full px-3 py-2 border border-gray-300 rounded-md"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">{$t('owner.heroCtaUrlLabel')}</label>
								<input
									type="text"
									bind:value={formData.hero.ctaUrl}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
									placeholder="/albums"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">{$t('owner.heroBackgroundLabel')}</label>
								<select
									bind:value={formData.hero.backgroundStyle}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
								>
									<option value="light">{$t('owner.heroBackgroundLight')}</option>
									<option value="dark">{$t('owner.heroBackgroundDark')}</option>
									<option value="image">{$t('owner.heroBackgroundImage')}</option>
									<option value="galleryLeading">{$t('owner.heroBackgroundGalleryLeading')}</option>
								</select>
							</div>
							{#if formData.hero.backgroundStyle === 'image'}
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">
										{$t('owner.heroBackgroundImageUrl')}
									</label>
									<input
										type="url"
										bind:value={formData.hero.backgroundImage}
										class="w-full px-3 py-2 border border-gray-300 rounded-md"
										placeholder="https://..."
									/>
								</div>
							{/if}
						</div>
					</div>
					{/if}

					{#if activeTab === 'seo'}
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">
							{$t('owner.seoTitle')}
							<span class="text-sm font-normal text-gray-500">({$t('owner.optional')})</span>
						</h3>
						<p class="text-sm text-gray-600 mb-3">{$t('owner.seoHelp')}</p>
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">
									{$t('owner.seoMetaTitle')}
								</label>
								<MultiLangInput
									bind:value={formData.seo.metaTitle}
									placeholder={$t('owner.seoMetaTitlePlaceholder')}
									className="w-full px-3 py-2 border border-gray-300 rounded-md"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">
									{$t('owner.seoMetaDescription')}
								</label>
								<MultiLangInput
									bind:value={formData.seo.metaDescription}
									placeholder={$t('owner.seoMetaDescriptionPlaceholder')}
									className="w-full px-3 py-2 border border-gray-300 rounded-md"
								/>
							</div>
						</div>
					</div>
					{/if}

					{#if activeTab === 'contact'}
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">
							{$t('owner.contactTitle')}
							<span class="text-sm font-normal text-gray-500">({$t('owner.optional')})</span>
						</h3>
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">
									{$t('owner.contactEmail')}
								</label>
								<input type="email" bind:value={formData.contact.email} class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="contact@example.com" />
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									{$t('owner.socialLinks')}
								</label>
								<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
									<input
										type="url"
										bind:value={formData.contact.socialMedia.facebook}
										class="px-3 py-2 border border-gray-300 rounded-md"
										placeholder={$t('owner.facebookUrlPlaceholder')}
									/>
									<input
										type="url"
										bind:value={formData.contact.socialMedia.instagram}
										class="px-3 py-2 border border-gray-300 rounded-md"
										placeholder={$t('owner.instagramUrlPlaceholder')}
									/>
									<input
										type="url"
										bind:value={formData.contact.socialMedia.twitter}
										class="px-3 py-2 border border-gray-300 rounded-md"
										placeholder={$t('owner.twitterUrlPlaceholder')}
									/>
								</div>
							</div>
						</div>
					</div>
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">
							{$t('owner.footerTitle')}
							<span class="text-sm font-normal text-gray-500">({$t('owner.optional')})</span>
						</h3>
						<div class="space-y-4">
							<div>
								<label
									for="owner-site-footer-copyright"
									class="block text-sm font-medium text-gray-700 mb-1"
								>
									{$t('owner.copyright')}
								</label>
								<input
									id="owner-site-footer-copyright"
									type="text"
									bind:value={formData.footer.copyrightText}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
									placeholder="© 2025 My Gallery"
								/>
							</div>
							<div>
								<label
									for="owner-site-footer-terms-url"
									class="block text-sm font-medium text-gray-700 mb-1"
								>
									{$t('owner.termsOfServiceUrl')}
								</label>
								<input
									id="owner-site-footer-terms-url"
									type="url"
									bind:value={formData.footer.termsUrl}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
									placeholder="https://..."
								/>
							</div>
							<div>
								<label
									for="owner-site-footer-privacy-url"
									class="block text-sm font-medium text-gray-700 mb-1"
								>
									{$t('owner.privacyPolicyUrl')}
								</label>
								<input
									id="owner-site-footer-privacy-url"
									type="url"
									bind:value={formData.footer.privacyUrl}
									class="w-full px-3 py-2 border border-gray-300 rounded-md"
									placeholder="https://..."
								/>
							</div>
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
