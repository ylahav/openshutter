<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from '$stores/i18n';
	import {
		checkPwaAssetsReachable,
		dismissPwaInstallPrompt,
		isPwaInstallDismissed,
		isStandaloneDisplay,
		promptPwaInstall,
		pwaInstallAvailable,
		pwaInstallManualHint,
		scheduleManualInstallHint,
	} from '$lib/pwa/pwa-install';

	let showPrompt = $state(false);
	let showManual = $state(false);
	let assetsMissing = $state(false);

	onMount(() => {
		if (isStandaloneDisplay() || isPwaInstallDismissed()) return;

		const unsubPrompt = pwaInstallAvailable.subscribe((v) => {
			showPrompt = v && !isStandaloneDisplay() && !isPwaInstallDismissed();
		});
		const unsubManual = pwaInstallManualHint.subscribe((v) => {
			showManual = v && !showPrompt && !isStandaloneDisplay() && !isPwaInstallDismissed();
		});

		void checkPwaAssetsReachable().then((ok) => {
			assetsMissing = !ok;
		});

		const cancelHint = scheduleManualInstallHint(4000);

		return () => {
			unsubPrompt();
			unsubManual();
			cancelHint();
		};
	});

	async function install() {
		const outcome = await promptPwaInstall();
		if (outcome === 'accepted') showPrompt = false;
	}

	function dismiss() {
		dismissPwaInstallPrompt();
		showPrompt = false;
		showManual = false;
	}
</script>

{#if showPrompt}
	<div
		class="pwa-install-banner fixed bottom-0 inset-x-0 z-[9998] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none"
		role="region"
		aria-label={$t('pwa.installTitle')}
	>
		<div
			class="pointer-events-auto mx-auto max-w-lg rounded-xl border border-white/15 bg-neutral-900/95 text-white shadow-lg backdrop-blur-sm px-4 py-3 flex gap-3 items-start"
		>
			<div class="flex-1 min-w-0">
				<p class="font-medium text-sm">{$t('pwa.installTitle')}</p>
				<p class="text-xs text-white/75 mt-0.5">{$t('pwa.installBody')}</p>
			</div>
			<div class="flex shrink-0 gap-2">
				<button
					type="button"
					class="text-xs text-white/70 hover:text-white px-2 py-1.5 rounded"
					onclick={dismiss}
				>
					{$t('pwa.installDismiss')}
				</button>
				<button
					type="button"
					class="text-xs font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3 py-1.5 rounded-lg"
					onclick={install}
				>
					{$t('pwa.installAction')}
				</button>
			</div>
		</div>
	</div>
{:else if showManual}
	<div
		class="pwa-install-banner fixed bottom-0 inset-x-0 z-[9998] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none"
		role="region"
		aria-label={$t('pwa.installManualTitle')}
	>
		<div
			class="pointer-events-auto mx-auto max-w-lg rounded-xl border border-white/15 bg-neutral-900/95 text-white shadow-lg backdrop-blur-sm px-4 py-3"
		>
			<p class="font-medium text-sm">{$t('pwa.installManualTitle')}</p>
			{#if assetsMissing}
				<p class="text-xs text-amber-200/90 mt-1">{$t('pwa.installAssetsMissing')}</p>
			{:else}
				<p class="text-xs text-white/75 mt-1 whitespace-pre-line">{$t('pwa.installManualChrome')}</p>
			{/if}
			<div class="flex justify-end mt-2">
				<button
					type="button"
					class="text-xs text-white/70 hover:text-white px-2 py-1 rounded"
					onclick={dismiss}
				>
					{$t('pwa.installDismiss')}
				</button>
			</div>
		</div>
	</div>
{/if}
