<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
import { logger } from '$lib/utils/logger';
import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
import { t } from '$stores/i18n';
	import type { PageData } from './$types';

	export let data: PageData;

	interface MenuItem {
		labelKey?: string;
		label?: string;
		href: string;
		type?: 'link' | 'login' | 'logout';
		showWhen?: 'always' | 'loggedIn' | 'loggedOut';
		external?: boolean;
	}

	const isOwner = data?.user?.role === 'owner';
	let loading = true;
	let saving = false;
	let error: string | null = null;
	let success: string | null = null;

	let pageLayout = { home: { gridRows: 2, gridColumns: 1 } };
	let headerConfig = { showLogo: true, showSiteTitle: true, showMenu: true };
	let menuItems: MenuItem[] = [];

	onMount(async () => {
		await fetchSettings();
	});

	async function fetchSettings() {
		try {
			loading = true;
			error = null;
			const response = await fetch('/api/owner/site-settings');
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			const raw = result.data ?? result;
			const t = raw.template && typeof raw.template === 'object' ? raw.template : {};
			pageLayout = t.pageLayout && typeof t.pageLayout === 'object' ? { home: { gridRows: t.pageLayout.home?.gridRows ?? 2, gridColumns: t.pageLayout.home?.gridColumns ?? 1 }, ...t.pageLayout } : { home: { gridRows: 2, gridColumns: 1 } };
			const hc = t.headerConfig && typeof t.headerConfig === 'object' ? t.headerConfig : {};
			headerConfig = { showLogo: true, showSiteTitle: true, showMenu: true, ...hc };
			menuItems = Array.isArray(hc.menu) ? hc.menu.map((i: MenuItem) => ({ ...i })) : [];
		} catch (err) {
			logger.error('Failed to fetch theme settings:', err);
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
					template: {
						pageLayout,
						headerConfig: { ...headerConfig, menu: menuItems },
					},
				}),
			});
			if (!response.ok) await handleApiErrorResponse(response);
			success = $t('owner.themeSaved');
		} catch (err) {
			logger.error('Failed to save theme:', err);
			error = handleError(err, $t('owner.requestFailed'));
		} finally {
			saving = false;
		}
	}

	function addMenuItem() {
		menuItems = [...menuItems, { href: '/', type: 'link', showWhen: 'always' }];
	}
	function removeMenuItem(index: number) {
		menuItems = menuItems.filter((_, i) => i !== index);
	}
	function moveItem(index: number, up: boolean) {
		const newItems = [...menuItems];
		const swap = up ? index - 1 : index + 1;
		if (swap < 0 || swap >= newItems.length) return;
		[newItems[index], newItems[swap]] = [newItems[swap], newItems[index]];
		menuItems = newItems;
	}
</script>

<svelte:head>
	<title>{$t('owner.theme')} - {$t('owner.ownerPanel')}</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-4 text-gray-600">{$t('loading.loading')}</p>
		</div>
	</div>
{:else if !isOwner}
	<div class="min-h-screen bg-gray-50 py-8 px-4">
		<p class="text-gray-600 mb-4">{$t('owner.themeEditorsOnly')}</p>
		<a href="/owner" class="text-blue-600 hover:underline">{$t('owner.backToDashboard')}</a>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-4xl mx-auto px-4">
			<div class="flex justify-between items-center mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">{$t('owner.theme')}</h1>
					<p class="text-gray-600 mt-2">{$t('owner.themeDescription')}</p>
				</div>
				<div class="flex gap-2">
					<a
						href="/owner/site-settings"
						class="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
					>
						{$t('owner.siteSettings')}
					</a>
					<button
						type="button"
						on:click={() => goto('/owner')}
						class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
					>
						{$t('owner.backToDashboard')}
					</button>
				</div>
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

				<form on:submit={handleSubmit} class="space-y-8">
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.themeHomeLayout')}</h3>
						<p class="text-sm text-gray-600 mb-3">{$t('owner.themeHomeLayoutHelp')}</p>
						<div class="flex gap-4 items-center">
							<label class="flex items-center gap-2">
								<span class="text-sm font-medium text-gray-700">{$t('owner.themeRows')}</span>
								<input type="number" min="1" max="10" bind:value={pageLayout.home.gridRows} class="w-20 px-2 py-1.5 border border-gray-300 rounded-md" />
							</label>
							<label class="flex items-center gap-2">
								<span class="text-sm font-medium text-gray-700">{$t('owner.themeColumns')}</span>
								<input type="number" min="1" max="6" bind:value={pageLayout.home.gridColumns} class="w-20 px-2 py-1.5 border border-gray-300 rounded-md" />
							</label>
						</div>
					</div>

					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.themeHeader')}</h3>
						<div class="space-y-2">
							<label class="flex items-center gap-2">
								<input type="checkbox" bind:checked={headerConfig.showLogo} />
								<span class="text-sm text-gray-700">{$t('owner.themeShowLogo')}</span>
							</label>
							<label class="flex items-center gap-2">
								<input type="checkbox" bind:checked={headerConfig.showSiteTitle} />
								<span class="text-sm text-gray-700">{$t('owner.themeShowSiteTitle')}</span>
							</label>
							<label class="flex items-center gap-2">
								<input type="checkbox" bind:checked={headerConfig.showMenu} />
								<span class="text-sm text-gray-700">{$t('owner.themeShowMenu')}</span>
							</label>
						</div>
					</div>

					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.themeMenu')}</h3>
						<p class="text-sm text-gray-600 mb-3">{$t('owner.themeMenuHelp')}</p>
						{#if menuItems.length > 0}
							<div class="space-y-3">
								{#each menuItems as item, index}
									<div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
										<div class="flex justify-between items-start mb-2">
											<span class="text-sm font-medium text-gray-700">
												{$t('owner.themeMenuItem')} #{index + 1}
											</span>
											<div class="flex gap-1">
												<button
													type="button"
													on:click={() => moveItem(index, true)}
													disabled={index === 0}
													class="text-gray-600 hover:text-gray-900 disabled:opacity-40"
													aria-label={$t('owner.themeMoveUp')}
												>
													↑
												</button>
												<button
													type="button"
													on:click={() => moveItem(index, false)}
													disabled={index === menuItems.length - 1}
													class="text-gray-600 hover:text-gray-900 disabled:opacity-40"
													aria-label={$t('owner.themeMoveDown')}
												>
													↓
												</button>
												<button
													type="button"
													on:click={() => removeMenuItem(index)}
													class="text-red-600 hover:text-red-800 text-sm"
												>
													{$t('owner.themeRemoveItem')}
												</button>
											</div>
										</div>
										<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<div>
												<label class="block text-xs font-medium text-gray-500 mb-0.5">
													{$t('owner.themeLabel')}
												</label>
												<input
													type="text"
													bind:value={item.label}
													class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
													placeholder={$t('owner.themeLabelPlaceholder')}
												/>
											</div>
											<div>
												<label class="block text-xs font-medium text-gray-500 mb-0.5">
													{$t('owner.themeHref')}
												</label>
												<input
													type="text"
													bind:value={item.href}
													class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
													placeholder="/"
												/>
											</div>
											<div>
												<label class="block text-xs font-medium text-gray-500 mb-0.5">
													{$t('owner.themeType')}
												</label>
												<select
													bind:value={item.type}
													class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
												>
													<option value="link">{$t('owner.themeTypeLink')}</option>
													<option value="login">{$t('owner.themeTypeLogin')}</option>
													<option value="logout">{$t('owner.themeTypeLogout')}</option>
												</select>
											</div>
											<div>
												<label class="block text-xs font-medium text-gray-500 mb-0.5">
													{$t('owner.themeShowWhen')}
												</label>
												<select
													bind:value={item.showWhen}
													class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
												>
													<option value="always">{$t('owner.themeShowAlways')}</option>
													<option value="loggedIn">{$t('owner.themeShowLoggedIn')}</option>
													<option value="loggedOut">{$t('owner.themeShowLoggedOut')}</option>
												</select>
											</div>
											<div class="sm:col-span-2">
												<label class="flex items-center gap-2">
													<input type="checkbox" bind:checked={item.external} />
													<span class="text-sm text-gray-700">
														{$t('owner.themeOpenInNewTab')}
													</span>
												</label>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-gray-500 mb-2">
								{$t('owner.themeNoMenuItems')}
							</p>
						{/if}
						<div class="mt-3 flex gap-2">
							<button
								type="button"
								on:click={addMenuItem}
								class="px-3 py-1.5 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300"
							>
								{$t('owner.themeAddItem')}
							</button>
							{#if menuItems.length === 0}
								<button
									type="button"
									on:click={() => {
										menuItems = [
											{ href: '/', label: $t('navigation.home'), type: 'link', showWhen: 'always' },
											{
												href: '/albums',
												label: $t('navigation.albums'),
												type: 'link',
												showWhen: 'always'
											},
											{ href: '/login', type: 'login', showWhen: 'loggedOut' }
										];
									}}
									class="px-3 py-1.5 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
								>
									{$t('owner.themeUseDefaults')}
								</button>
							{/if}
						</div>
					</div>

					<div class="flex justify-end">
						<button
							type="submit"
							disabled={saving}
							class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if saving}
								{$t('owner.saving')}
							{:else}
								{$t('owner.themeSave')}
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
