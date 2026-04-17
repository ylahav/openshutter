<script lang="ts">
	import { getContext, setContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { page } from '$app/stores';
	import { siteConfigData } from '$stores/siteConfig';
	import type { PageModuleData } from '$lib/types/page-builder';
	import PageBuilderGrid from '../PageBuilderGrid.svelte';

	/** Legacy reference key into `siteConfig.template.layoutPresets`. */
	export let presetKey = '';
	/** Shared instance alias (preferred). Falls back to `presetKey` for legacy data. */
	export let instanceRef = '';
	export let className = '';
	export let data: Record<string, unknown> = {};
	// svelte-ignore export_let_unused - passed by PageBuilderGrid; inner shell grid always uses compact width
	export let compact = false;

	const parentDepth = getContext<number>('pbNestDepth') ?? 0;
	setContext('pbNestDepth', parentDepth + 1);

	const layoutPresetsPreviewStore = getContext<Writable<Record<string, unknown> | null> | undefined>('pbLayoutPresetsPreview');

	$: resolvedRef = String(instanceRef || presetKey || '').trim();
	$: templateBag = ($siteConfigData?.template ?? {}) as Record<string, unknown>;
	$: presetRegistry = ((templateBag.layoutShellInstances || templateBag.layoutPresets) ?? null) as
		| Record<string, { gridRows?: number; gridColumns?: number; modules?: PageModuleData[] }>
		| null;
	$: presetFromSite =
		resolvedRef && presetRegistry
			? presetRegistry[resolvedRef]
			: null;
	$: previewMap = layoutPresetsPreviewStore ? $layoutPresetsPreviewStore : null;
	$: presetFromPreview =
		resolvedRef && previewMap && previewMap[resolvedRef]
			? (previewMap[resolvedRef] as { gridRows?: number; gridColumns?: number; modules?: PageModuleData[] })
			: null;
	$: preset = presetFromPreview ?? presetFromSite;

	$: layout = {
		gridRows: Math.max(1, preset?.gridRows ?? 1),
		gridColumns: Math.max(1, preset?.gridColumns ?? 1)
	};

	$: childModules = (preset?.modules ?? []) as PageModuleData[];

	const normalizeType = (t: unknown): string => (t === 'albumGallery' ? 'albumView' : String(t ?? ''));
	$: normalizedChildren = childModules.map((m) => ({ ...m, type: normalizeType((m as any).type) }));
	$: isAdminRoute = $page.url.pathname.startsWith('/admin');
</script>

{#if parentDepth > 6}
	<div class="p-3 text-sm text-amber-600 border border-dashed rounded">Layout region nested too deeply.</div>
{:else if !resolvedRef}
	<div class="p-3 text-sm opacity-60 border border-dashed rounded">Layout shell: set a preset name in the theme editor.</div>
{:else if !preset && isAdminRoute}
	<div class="p-3 text-sm opacity-60 border border-dashed rounded">
		Layout shell <strong>{resolvedRef}</strong> is not defined in shared instances.
	</div>
{:else if !preset}
	<section
		class="layout-shell w-full {className}"
		aria-hidden="true"
		data-layout-preset={resolvedRef}
	></section>
{:else}
	<section
		class="layout-shell w-full {className}"
		aria-label={`Layout ${resolvedRef}`}
		data-layout-preset={resolvedRef}
	>
		<!-- Full-bleed: do not inherit page `compact`/max-width; shells are used for header/footer bars. -->
		<PageBuilderGrid modules={normalizedChildren} {layout} compact={true} pageContext={data} />
	</section>
{/if}
