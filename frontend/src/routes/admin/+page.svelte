<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { productName } from '$stores/siteConfig';
	import { t } from '$stores/i18n';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import type { AdminDashboardSummary } from '$lib/types/admin-dashboard';

	export let data: PageData;

	let retrying = false;

	function formatBytes(n: number): string {
		if (!Number.isFinite(n) || n <= 0) return '0 B';
		const gb = n / 1024 ** 3;
		if (gb >= 1) return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
		const mb = n / 1024 ** 2;
		if (mb >= 1) return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
		const kb = n / 1024;
		if (kb >= 1) return `${kb >= 10 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
		return `${Math.round(n)} B`;
	}

	function replaceParams(s: string, params: Record<string, string | number>): string {
		let out = s;
		for (const [k, v] of Object.entries(params)) {
			out = out.split(`{${k}}`).join(String(v));
		}
		return out;
	}

	async function retryDashboard() {
		retrying = true;
		try {
			await invalidateAll();
		} finally {
			retrying = false;
		}
	}

	$: welcomeName = (data.user?.name?.trim() || data.user?.email || '').trim();
	$: dash = data.dashboard as AdminDashboardSummary | null | undefined;
	$: loadFailed = data.dashboardLoadFailed === true;
	$: backendUnreachable = data.dashboardBackendUnreachable === true;
	$: stats = dash?.stats;
	$: storageQuota =
		dash?.storage?.quotaBytes != null && dash.storage.quotaBytes > 0 ? dash.storage.quotaBytes : null;
	$: storagePct =
		storageQuota != null && dash
			? Math.min(100, Math.round((dash.storage.usedBytes / storageQuota) * 1000) / 10)
			: null;
	$: storagePercentRounded =
		storageQuota != null && dash
			? Math.min(100, Math.round((dash.storage.usedBytes / storageQuota) * 100))
			: null;
</script>

<svelte:head>
	<title>{$t('admin.sidebarDashboard')} - {$productName}</title>
</svelte:head>

<div class="py-6 md:py-8">
	<div class="max-w-6xl mx-auto px-4">
		<header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h1 class="text-2xl md:text-3xl font-bold text-(--color-surface-950-50)">
					{$t('admin.sidebarDashboard')}
				</h1>
				{#if welcomeName}
					<p class="mt-1 text-lg text-(--color-surface-700-300)">
						{replaceParams($t('admin.dashboardWelcome'), { name: welcomeName })}
					</p>
				{/if}
				<p class="mt-1 text-sm text-(--color-surface-600-400)">{$t('admin.dashboardSubtitle')}</p>
			</div>
			<div class="shrink-0">
				<a
					href="/admin/albums"
					class="inline-flex items-center justify-center rounded-lg bg-(--color-primary-600) px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-(--color-primary-700) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500) focus:ring-offset-2"
				>
					{$t('admin.dashboardNewAlbum')}
				</a>
			</div>
		</header>

		{#if data.user?.role === 'admin'}
			{#if loadFailed || !dash}
				<div
					class="rounded-xl border border-(--color-surface-200-700) bg-[color-mix(in_oklab,var(--color-surface-950)_4%,transparent)] px-4 py-6 text-center dark:bg-[color-mix(in_oklab,var(--color-surface-50)_6%,transparent)]"
					role="alert"
				>
					<p class="text-(--color-surface-700-300)">
						{backendUnreachable ? $t('admin.dashboardBackendUnreachable') : $t('admin.dashboardLoadError')}
					</p>
					{#if backendUnreachable}
						<p class="mt-2 text-sm text-(--color-surface-600-400)">
							{$t('admin.dashboardBackendUnreachableHint')}
						</p>
					{/if}
					<button
						type="button"
						class="mt-3 inline-flex items-center rounded-lg border border-(--color-surface-300-600) bg-(--color-surface-50-900) px-4 py-2 text-sm font-medium text-(--color-surface-900-100) hover:bg-(--color-surface-100-800) disabled:opacity-50"
						disabled={retrying}
						on:click={retryDashboard}
					>
						{retrying ? '…' : $t('admin.dashboardRetry')}
					</button>
				</div>
			{:else if dash && stats}
				<div class="space-y-6">
			{#each dash.alerts as alert (alert.id)}
				{#if alert.id === 'no_featured'}
					<div
						class="mb-6 flex flex-col gap-3 rounded-xl border border-sky-300/80 bg-sky-50 px-4 py-3 text-sky-950 sm:flex-row sm:items-center sm:justify-between dark:border-sky-700/80 dark:bg-sky-950/40 dark:text-sky-100"
						role="region"
						aria-label={$t('admin.sidebarDashboard')}
					>
						<p class="text-sm font-medium leading-snug">
							{replaceParams($t('admin.dashboardAlertNoFeatured'), { count: stats.featuredAlbums })}
						</p>
						<a
							href={alert.fixPath}
							class="shrink-0 text-sm font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-900 dark:text-sky-200 dark:hover:text-white"
						>
							{$t('admin.dashboardFixThis')}
						</a>
					</div>
				{/if}
			{/each}

			<div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
				<div
					class="rounded-xl border border-(--color-surface-200-700) bg-[color-mix(in_oklab,var(--color-surface-950)_5%,transparent)] p-4 dark:bg-[color-mix(in_oklab,var(--color-surface-50)_6%,transparent)]"
				>
					<p class="text-xs font-medium text-(--color-surface-500-400)">
						{$t('admin.dashboardStatPhotos')}
					</p>
					<p class="mt-1 text-2xl font-semibold tabular-nums text-(--color-surface-950-50)">
						{stats.totalPhotos.toLocaleString()}
					</p>
				</div>
				<div
					class="rounded-xl border border-(--color-surface-200-700) bg-[color-mix(in_oklab,var(--color-surface-950)_5%,transparent)] p-4 dark:bg-[color-mix(in_oklab,var(--color-surface-50)_6%,transparent)]"
				>
					<p class="text-xs font-medium text-(--color-surface-500-400)">
						{$t('admin.dashboardStatAlbums')}
					</p>
					<p class="mt-1 text-2xl font-semibold tabular-nums text-(--color-surface-950-50)">
						{stats.totalAlbums.toLocaleString()}
					</p>
					<p class="mt-0.5 text-xs text-(--color-surface-600-400)">
						{replaceParams($t('admin.dashboardStatAlbumsPublished'), {
							count: stats.publishedAlbums.toLocaleString(),
						})}
					</p>
				</div>
				<div
					class="rounded-xl border border-(--color-surface-200-700) bg-[color-mix(in_oklab,var(--color-surface-950)_5%,transparent)] p-4 dark:bg-[color-mix(in_oklab,var(--color-surface-50)_6%,transparent)]"
				>
					<p class="text-xs font-medium text-(--color-surface-500-400)">
						{$t('admin.dashboardStatPublicAlbums')}
					</p>
					<p class="mt-1 text-2xl font-semibold tabular-nums text-(--color-surface-950-50)">
						{stats.publicAlbums.toLocaleString()}
					</p>
				</div>
				<div
					class="rounded-xl border border-(--color-surface-200-700) bg-[color-mix(in_oklab,var(--color-surface-950)_5%,transparent)] p-4 dark:bg-[color-mix(in_oklab,var(--color-surface-50)_6%,transparent)]"
				>
					<p class="text-xs font-medium text-(--color-surface-500-400)">
						{$t('admin.dashboardStatFeatured')}
					</p>
					<p class="mt-1 text-2xl font-semibold tabular-nums text-(--color-surface-950-50)">
						{stats.featuredAlbums.toLocaleString()}
					</p>
					{#if stats.featuredAlbums === 0 && stats.publishedAlbums > 0}
						<p class="mt-0.5 text-xs font-medium text-red-600 dark:text-red-400">
							{$t('admin.dashboardStatFeaturedHint')}
						</p>
					{/if}
				</div>
				<div
					class="col-span-2 rounded-xl border border-(--color-surface-200-700) bg-[color-mix(in_oklab,var(--color-surface-950)_5%,transparent)] p-4 lg:col-span-1 dark:bg-[color-mix(in_oklab,var(--color-surface-50)_6%,transparent)]"
				>
					<p class="text-xs font-medium text-(--color-surface-500-400)">
						{$t('admin.dashboardStatTagsApplied')}
					</p>
					<p class="mt-1 text-2xl font-semibold tabular-nums text-(--color-surface-950-50)">
						{stats.tagsApplied.toLocaleString()}
					</p>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
				<section
					class="lg:col-span-7 rounded-xl border border-(--color-surface-200-700) bg-[color-mix(in_oklab,var(--color-surface-950)_4%,transparent)] p-4 md:p-5 dark:bg-[color-mix(in_oklab,var(--color-surface-50)_5%,transparent)]"
				>
					<div class="mb-4 flex items-center justify-between gap-2">
						<h2 class="text-lg font-semibold text-(--color-surface-950-50)">
							{$t('admin.dashboardRecentAlbums')}
						</h2>
						<a
							href="/admin/albums"
							class="text-sm font-medium text-(--color-primary-600) hover:text-(--color-primary-700) rtl-flip"
						>
							{$t('admin.dashboardViewAllAlbums')}
						</a>
					</div>
					{#if dash.recentAlbums.length === 0}
						<p class="text-sm text-(--color-surface-600-400)">{$t('admin.dashboardNoRecentAlbums')}</p>
					{:else}
						<ul class="divide-y divide-(--color-surface-200-700)">
							{#each dash.recentAlbums as album (album._id)}
								<li>
									<a
										href="/admin/albums/{album._id}/edit"
										class="flex gap-3 py-3 first:pt-0 hover:bg-[color-mix(in_oklab,var(--color-surface-950)_4%,transparent)] dark:hover:bg-[color-mix(in_oklab,var(--color-surface-50)_5%,transparent)] -mx-2 px-2 rounded-lg transition-colors"
									>
										<div
											class="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-(--color-surface-200-700)"
										>
											{#if album.coverImageUrl}
												<img
													src={album.coverImageUrl}
													alt=""
													class="h-full w-full object-cover"
													loading="lazy"
												/>
											{/if}
										</div>
										<div class="min-w-0 flex-1">
											<p class="truncate font-medium text-(--color-surface-950-50)">
												{getAlbumName(album as { name: unknown; alias?: string }) || album.alias}
											</p>
											<p class="mt-0.5 text-xs text-(--color-surface-600-400)">
												{album.photoCount.toLocaleString()}
												{$t('albums.photos')}
												·
												{replaceParams($t('admin.dashboardLevel'), { level: album.level })}
											</p>
										</div>
										<div class="shrink-0 self-center">
											{#if album.isPublished}
												<span
													class="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100"
												>
													{$t('admin.dashboardPublished')}
												</span>
											{:else}
												<span
													class="inline-flex rounded-full bg-(--color-surface-200-600) px-2 py-0.5 text-xs font-medium text-(--color-surface-800-200)"
												>
													{$t('admin.dashboardDraft')}
												</span>
											{/if}
										</div>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<div class="flex flex-col gap-6 lg:col-span-5">
					<section
						class="rounded-xl border border-(--color-surface-200-700) bg-[color-mix(in_oklab,var(--color-surface-950)_4%,transparent)] p-4 md:p-5 dark:bg-[color-mix(in_oklab,var(--color-surface-50)_5%,transparent)]"
					>
						<h2 class="mb-3 text-lg font-semibold text-(--color-surface-950-50)">
							{$t('admin.dashboardQuickActions')}
						</h2>
						<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
							<a
								href="/admin/albums"
								class="inline-flex items-center justify-center rounded-lg border border-(--color-surface-200-600) bg-(--color-surface-50-900) px-3 py-2.5 text-center text-xs font-medium text-(--color-surface-900-100) hover:bg-(--color-surface-100-800)"
								>{$t('admin.dashboardQuickNewAlbum')}</a>
							<a
								href="/admin/tags"
								class="inline-flex items-center justify-center rounded-lg border border-(--color-surface-200-600) bg-(--color-surface-50-900) px-3 py-2.5 text-center text-xs font-medium text-(--color-surface-900-100) hover:bg-(--color-surface-100-800)"
								>{$t('admin.dashboardQuickAddTag')}</a>
							<a
								href="/admin/people"
								class="inline-flex items-center justify-center rounded-lg border border-(--color-surface-200-600) bg-(--color-surface-50-900) px-3 py-2.5 text-center text-xs font-medium text-(--color-surface-900-100) hover:bg-(--color-surface-100-800)"
								>{$t('admin.dashboardQuickAddPerson')}</a>
							<a
								href="/admin/locations"
								class="inline-flex items-center justify-center rounded-lg border border-(--color-surface-200-600) bg-(--color-surface-50-900) px-3 py-2.5 text-center text-xs font-medium text-(--color-surface-900-100) hover:bg-(--color-surface-100-800)"
								>{$t('admin.dashboardQuickAddLocation')}</a>
							<a
								href="/admin/import-sync"
								class="inline-flex items-center justify-center rounded-lg border border-(--color-surface-200-600) bg-(--color-surface-50-900) px-3 py-2.5 text-center text-xs font-medium text-(--color-surface-900-100) hover:bg-(--color-surface-100-800)"
								>{$t('admin.dashboardQuickImport')}</a>
							<a
								href="/admin/backup-restore"
								class="inline-flex items-center justify-center rounded-lg border border-(--color-surface-200-600) bg-(--color-surface-50-900) px-3 py-2.5 text-center text-xs font-medium text-(--color-surface-900-100) hover:bg-(--color-surface-100-800)"
								>{$t('admin.dashboardQuickExport')}</a>
						</div>
					</section>

					<section
						class="rounded-xl border border-(--color-surface-200-700) bg-[color-mix(in_oklab,var(--color-surface-950)_4%,transparent)] p-4 md:p-5 dark:bg-[color-mix(in_oklab,var(--color-surface-50)_5%,transparent)]"
					>
						<div class="mb-2 flex items-center justify-between gap-2">
							<h2 class="text-lg font-semibold text-(--color-surface-950-50)">
								{$t('admin.dashboardStorageTitle')}
							</h2>
							<a
								href="/admin/storage"
								class="text-sm font-medium text-(--color-primary-600) hover:text-(--color-primary-700) rtl-flip"
							>
								{$t('admin.dashboardStorageManage')}
							</a>
						</div>
						{#if storageQuota != null}
							<p class="text-sm text-(--color-surface-600-400)">
								{replaceParams($t('admin.dashboardStorageUsedOfTotal'), {
									used: formatBytes(dash.storage.usedBytes),
									total: formatBytes(storageQuota),
								})}
							</p>
							{#if storagePercentRounded != null}
								<p class="mt-0.5 text-xs font-medium text-(--color-surface-500-400)">
									{replaceParams($t('admin.dashboardStoragePercentUsed'), {
										pct: storagePercentRounded,
									})}
								</p>
							{/if}
							<div
								class="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-(--color-surface-200-700)"
								role="progressbar"
								aria-valuenow={storagePct ?? 0}
								aria-valuemin="0"
								aria-valuemax="100"
							>
								<div
									class="h-full rounded-full bg-(--color-primary-600) transition-[width]"
									style={`width: ${storagePct ?? 0}%`}
								/>
							</div>
						{:else}
							<p class="text-sm text-(--color-surface-600-400)">
								{replaceParams($t('admin.dashboardStorageUsedOnly'), {
									used: formatBytes(dash.storage.usedBytes),
								})}
							</p>
							<p class="mt-1 text-xs leading-snug text-(--color-surface-500-400)">
								{$t('admin.dashboardStorageQuotaHint')}
							</p>
							<div
								class="mt-3 h-2 w-full rounded-full bg-(--color-surface-200-700)"
								aria-hidden="true"
							></div>
						{/if}
					</section>
				</div>
			</div>
				</div>
			{:else}
				<p class="text-sm text-(--color-surface-600-400)">{$t('admin.manageGallerySettings')}</p>
			{/if}
		{:else}
			<p class="text-sm text-(--color-surface-600-400)">{$t('admin.manageGallerySettings')}</p>
		{/if}
	</div>
</div>

<style>
	:global([dir='rtl'] .rtl-flip) {
		transform: scaleX(-1);
	}
</style>
