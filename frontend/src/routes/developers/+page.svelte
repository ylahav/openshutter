<script lang="ts">
	import type { PageData } from './$types';
	import { productName } from '$stores/siteConfig';
	import { t } from '$stores/i18n';

	export let data: PageData;
</script>

<svelte:head>
	<title>{$t('owner.developerPortal')} - {$productName}</title>
</svelte:head>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold text-gray-900">{$t('owner.developerPortal')}</h1>
		<p class="mt-2 text-gray-600">
			{$t('owner.developerPortalIntro')}
		</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<a
			href="/marketplace"
			class="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-primary-500 hover:shadow transition"
		>
			<div class="flex items-center gap-3 mb-3">
				<div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
					<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
					</svg>
				</div>
				<h2 class="text-xl font-semibold text-gray-900">{$t('owner.developerMarketplaceTitle')}</h2>
			</div>
			<p class="text-gray-600 text-sm">
				{$t('owner.developerMarketplaceDescription')}
			</p>
			<span class="inline-flex items-center mt-3 text-primary-600 font-medium text-sm">
				{$t('owner.developerMarketplaceCta')} →
			</span>
		</a>
		<a
			href="/developers/keys"
			class="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-primary-500 hover:shadow transition"
		>
			<div class="flex items-center gap-3 mb-3">
				<div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
					<svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
					</svg>
				</div>
				<h2 class="text-xl font-semibold text-gray-900">{$t('owner.developerKeysTitle')}</h2>
			</div>
			<p class="text-gray-600 text-sm">
				{$t('owner.developerKeysDescription')}
			</p>
			<span class="inline-flex items-center mt-3 text-primary-600 font-medium text-sm">
				{$t('owner.developerKeysCta')} →
			</span>
		</a>

		<a
			href="/developers/docs"
			class="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-primary-500 hover:shadow transition"
		>
			<div class="flex items-center gap-3 mb-3">
				<div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
					<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<h2 class="text-xl font-semibold text-gray-900">{$t('owner.developerDocsTitle')}</h2>
			</div>
			<p class="text-gray-600 text-sm">
				{$t('owner.developerDocsDescription')}
			</p>
			<span class="inline-flex items-center mt-3 text-primary-600 font-medium text-sm">
				{$t('owner.developerDocsCta')} →
			</span>
		</a>
	</div>

	<div class="bg-white rounded-lg border border-gray-200 p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-3">{$t('owner.developerQuickStartTitle')}</h2>
		<ol class="list-decimal list-inside space-y-2 text-gray-600 text-sm">
			<li>
				{$t('owner.developerQuickStartStep1')}
			</li>
			<li>
				{$t('owner.developerQuickStartStep2')}
			</li>
			<li>
				{$t('owner.developerQuickStartStep3')}
			</li>
			<li>
				{$t('owner.developerQuickStartStep4')}
			</li>
		</ol>
	</div>
</div>
