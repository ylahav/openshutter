<script lang="ts">
	import { adminBtnPrimary } from '$lib/admin/admin-cerberus';
	import { t } from '$stores/i18n';

	let { status, error }: { status: number; error: Error & { message?: string } } = $props();
</script>

<div
	class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6 sm:p-8 max-w-lg"
	data-theme="cerberus"
>
	<p class="text-xs font-semibold uppercase tracking-wide text-(--color-surface-500-500) mb-2">
		{$t('admin.errorPageBadge')}
	</p>
	<h1 class="text-2xl font-bold text-(--color-surface-950-50) mb-2">{status}</h1>
	<p class="text-sm text-(--color-surface-700-300) leading-relaxed mb-6">
		{error?.message?.trim() || $t('admin.errorPageUnknown')}
	</p>
	<div class="flex flex-wrap gap-3">
		<a href="/admin" class={adminBtnPrimary}>{$t('admin.errorBackDashboard')}</a>
		<button type="button" class="btn preset-tonal" onclick={() => history.back()}>
			{$t('admin.errorGoBack')}
		</button>
	</div>
</div>
