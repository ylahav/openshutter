<script lang="ts">
	import { getContext, setContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { page } from '$app/stores';
	import { siteConfigData } from '$stores/siteConfig';
	import type { PageModuleData } from '$lib/types/page-builder';
	import type { ModulePlacement } from '$lib/page-builder/module-cell-placement';
	import PageBuilderGrid from '../PageBuilderGrid.svelte';

	/** Legacy reference key into `siteConfig.template.layoutPresets`. */
	export let presetKey = '';
	/** Shared instance alias (preferred). Falls back to `presetKey` for legacy data. */
	export let instanceRef = '';
	export let className = '';
	/** Optional CSS `grid-template-columns` for each row (non-spanning layouts), e.g. `auto auto 1fr auto auto`. Skips equal-width flex on cells. */
	export let gridTemplateColumns = '';
	export let data: Record<string, unknown> = {};
	// svelte-ignore export_let_unused - passed by PageBuilderGrid; inner shell grid always uses compact width
	export let compact = false;

	const parentDepth = getContext<number>('pbNestDepth') ?? 0;
	setContext('pbNestDepth', parentDepth + 1);

	const layoutPresetsPreviewStore = getContext<Writable<Record<string, unknown> | null> | undefined>('pbLayoutPresetsPreview');

	$: resolvedRef = String(instanceRef || presetKey || '').trim();
	$: templateBag = ($siteConfigData?.template ?? {}) as Record<string, unknown>;
	$: presetRegistry = ((templateBag.layoutShellInstances || templateBag.layoutPresets) ?? null) as
		| Record<
				string,
				{
					gridRows?: number;
					gridColumns?: number;
					modules?: PageModuleData[];
					rowTemplateColumnsByRow?: Record<string, string>;
					cellPlacementByCell?: Record<string, ModulePlacement>;
				}
		  >
		| null;
	$: presetFromSite =
		resolvedRef && presetRegistry
			? presetRegistry[resolvedRef]
			: null;
	$: previewMap = layoutPresetsPreviewStore ? $layoutPresetsPreviewStore : null;
	$: presetFromPreview =
		resolvedRef && previewMap && previewMap[resolvedRef]
			? (previewMap[resolvedRef] as {
					gridRows?: number;
					gridColumns?: number;
					modules?: PageModuleData[];
					rowTemplateColumnsByRow?: Record<string, string>;
					cellPlacementByCell?: Record<string, ModulePlacement>;
			  })
			: null;
	$: preset = presetFromPreview ?? presetFromSite;
	$: shellClass = ['layout-shell', 'pb-layoutShell', String(className || '').trim()].filter(Boolean).join(' ');

	$: layout = {
		gridRows: Math.max(1, preset?.gridRows ?? 1),
		gridColumns: Math.max(1, preset?.gridColumns ?? 1)
	};

	$: childModules = (preset?.modules ?? []) as PageModuleData[];
	$: rowTemplateColumnsByRow = normalizeRowTemplates(preset?.rowTemplateColumnsByRow);
	$: cellPlacementByCell = normalizeCellPlacements(preset?.cellPlacementByCell);

	const normalizeType = (t: unknown): string => (t === 'albumGallery' ? 'albumView' : String(t ?? ''));
	$: normalizedChildren = childModules.map((m) => ({ ...m, type: normalizeType((m as any).type) }));
	$: isAdminRoute = $page.url.pathname.startsWith('/admin');

	function normalizeTemplateColumns(raw: string): string {
		const v = raw.trim();
		if (!v) return '';
		// Shorthand ratios like "1-3-1" -> "1fr 3fr 1fr".
		if (/^\d+(\.\d+)?(?:-\d+(\.\d+)?)+$/.test(v)) {
			return v
				.split('-')
				.map((n) => `${n}fr`)
				.join(' ');
		}
		return v;
	}

	function normalizeRowTemplates(input: unknown): Record<string, string> | undefined {
		if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
		const out: Record<string, string> = {};
		for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
			if (typeof v !== 'string') continue;
			const normalized = normalizeTemplateColumns(v);
			if (!normalized) continue;
			out[k] = normalized;
		}
		return Object.keys(out).length ? out : undefined;
	}

	function normalizeCellPlacements(input: unknown): Record<string, ModulePlacement> | undefined {
		if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
		const out: Record<string, ModulePlacement> = {};
		for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
			if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
			const row = v as Record<string, unknown>;
			const horizontal =
				row.horizontal === 'default' ||
				row.horizontal === 'start' ||
				row.horizontal === 'center' ||
				row.horizontal === 'end' ||
				row.horizontal === 'stretch'
					? row.horizontal
					: undefined;
			const vertical =
				row.vertical === 'default' ||
				row.vertical === 'start' ||
				row.vertical === 'center' ||
				row.vertical === 'end' ||
				row.vertical === 'stretch'
					? row.vertical
					: undefined;
			if (horizontal || vertical) out[k] = { horizontal, vertical };
		}
		return Object.keys(out).length ? out : undefined;
	}
</script>

{#if parentDepth > 6}
	<div class="pb-layoutShell__notice pb-layoutShell__notice--warning">Layout region nested too deeply.</div>
{:else if !resolvedRef}
	<div class="pb-layoutShell__notice pb-layoutShell__notice--muted">Layout shell: set a preset name in the theme editor.</div>
{:else if !preset && isAdminRoute}
	<div class="pb-layoutShell__notice pb-layoutShell__notice--muted">
		Layout shell <strong>{resolvedRef}</strong> is not defined in shared instances.
	</div>
{:else if !preset}
	<section
		class={shellClass}
		aria-hidden="true"
		data-layout-preset={resolvedRef}
	></section>
{:else}
	<section
		class={shellClass}
		aria-label={`Layout ${resolvedRef}`}
		data-layout-preset={resolvedRef}
	>
		<!-- Full-bleed: do not inherit page `compact`/max-width; shells are used for header/footer bars. -->
		<PageBuilderGrid
			modules={normalizedChildren}
			{layout}
			compact={true}
			pageContext={data}
			gridTemplateColumns={gridTemplateColumns.trim() || undefined}
			rowTemplateColumnsByRow={rowTemplateColumnsByRow}
			cellPlacementByCell={cellPlacementByCell}
		/>
	</section>
{/if}

<style lang="scss">
	.pb-layoutShell {
		width: 100%;
	}

	.pb-layoutShell__notice {
		padding: 0.75rem;
		border: 1px dashed var(--tp-border);
		border-radius: 0.25rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
	}

	.pb-layoutShell__notice--warning {
		color: #b45309;
		border-color: color-mix(in srgb, #b45309 45%, var(--tp-border));
	}

	.pb-layoutShell__notice--muted {
		opacity: 0.6;
		color: var(--tp-fg-muted);
	}
</style>
