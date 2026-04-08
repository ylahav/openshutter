<script lang="ts">
	import { getContext, setContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { siteConfigData } from '$stores/siteConfig';
	import type { PageModuleData } from '$lib/types/page-builder';
	import PageBuilderGrid from '../PageBuilderGrid.svelte';

	/** Key into `siteConfig.template.layoutPresets` — shared across pages. */
	export let presetKey = '';
	export let data: Record<string, unknown> = {};
	export let compact = false;

	const parentDepth = getContext<number>('pbNestDepth') ?? 0;
	setContext('pbNestDepth', parentDepth + 1);

	const layoutPresetsPreviewStore = getContext<Writable<Record<string, unknown> | null> | undefined>('pbLayoutPresetsPreview');

	$: presetFromSite =
		presetKey && $siteConfigData?.template?.layoutPresets
			? ($siteConfigData.template.layoutPresets as Record<string, { gridRows?: number; gridColumns?: number; modules?: PageModuleData[] }>)[presetKey]
			: null;
	$: previewMap = layoutPresetsPreviewStore ? $layoutPresetsPreviewStore : null;
	$: presetFromPreview =
		presetKey && previewMap && previewMap[presetKey]
			? (previewMap[presetKey] as { gridRows?: number; gridColumns?: number; modules?: PageModuleData[] })
			: null;
	$: preset = presetFromPreview ?? presetFromSite;

	$: layout = {
		gridRows: Math.max(1, preset?.gridRows ?? 1),
		gridColumns: Math.max(1, preset?.gridColumns ?? 1)
	};

	$: childModules = (preset?.modules ?? []) as PageModuleData[];

	const normalizeType = (t: unknown): string => (t === 'albumGallery' ? 'albumView' : String(t ?? ''));
	$: normalizedChildren = childModules.map((m) => ({ ...m, type: normalizeType((m as any).type) }));
</script>

{#if parentDepth > 6}
	<div class="p-3 text-sm text-amber-600 border border-dashed rounded">Layout region nested too deeply.</div>
{:else if !presetKey?.trim()}
	<div class="p-3 text-sm opacity-60 border border-dashed rounded">Layout shell: set a preset name in the theme editor.</div>
{:else if !preset}
	<div class="p-3 text-sm opacity-60 border border-dashed rounded">
		Preset <strong>{presetKey}</strong> is not defined under template layout presets.
	</div>
{:else}
	<section class="layout-shell w-full" aria-label={`Layout ${presetKey}`} data-layout-preset={presetKey}>
		<PageBuilderGrid modules={normalizedChildren} {layout} {compact} pageContext={data} />
	</section>
{/if}
