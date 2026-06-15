<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { activeTemplate } from '$stores/template';
	import { isKnownTemplatePack } from '$lib/template/packs/ids';
	import { t } from '$stores/i18n';

	let dismissed = $state(false);

	const isAdmin = $derived($page.url.pathname.startsWith('/admin'));
	const rawName = $derived(String($activeTemplate ?? '').trim());
	const unknown = $derived(
		browser &&
			!isAdmin &&
			rawName.length > 0 &&
			!isKnownTemplatePack(rawName)
	);
	const show = $derived(unknown && !dismissed);
</script>

{#if show}
	<div
		class="bg-amber-50 dark:bg-amber-950/90 border-b border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100 px-4 py-2.5 text-sm flex flex-wrap items-center justify-between gap-2"
		role="status"
	>
		<p class="min-w-0">
			{$t('templatePack.unknownFallback').replace(/\{name\}/g, rawName)}
		</p>
		<button
			type="button"
			class="shrink-0 px-2 py-1 rounded border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-medium"
			onclick={() => (dismissed = true)}
		>
			{$t('templatePack.dismiss')}
		</button>
	</div>
{/if}
