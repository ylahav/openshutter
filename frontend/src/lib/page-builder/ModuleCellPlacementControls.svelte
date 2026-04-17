<!-- Shared "cell placement" UI for theme overrides and any editor that binds `editingModule`. -->
<script lang="ts">
	import type { PageModuleData } from '$lib/types/page-builder';
	import type { ModulePlacement as ModulePlacementType, ModulePlacementAxis } from '$lib/page-builder/module-cell-placement';
	import { normalizePlacement } from '$lib/page-builder/module-cell-placement';

	/** Must be `$bindable` so parent `bind:editingModule` receives placement updates (Svelte 5). */
	let { editingModule = $bindable() }: { editingModule: PageModuleData } = $props();

	const axisOptions: { value: ModulePlacementAxis; label: string }[] = [
		{ value: 'default', label: 'Default' },
		{ value: 'start', label: 'Start' },
		{ value: 'center', label: 'Center' },
		{ value: 'end', label: 'End' },
		{ value: 'stretch', label: 'Stretch' }
	];

	function horizontalLabel(v: ModulePlacementAxis): string {
		if (v === 'start') return 'Start (left)';
		if (v === 'end') return 'End (right)';
		return axisOptions.find((o) => o.value === v)?.label ?? v;
	}

	function verticalLabel(v: ModulePlacementAxis): string {
		if (v === 'start') return 'Top';
		if (v === 'center') return 'Middle';
		if (v === 'end') return 'Bottom';
		if (v === 'stretch') return 'Stretch (fill)';
		return axisOptions.find((o) => o.value === v)?.label ?? v;
	}

	function setAxis(axis: 'horizontal' | 'vertical', value: ModulePlacementAxis) {
		const nextRaw: ModulePlacementType = {
			...(editingModule.props?.placement as ModulePlacementType | undefined),
			[axis]: value
		};
		const normalized = normalizePlacement(nextRaw);
		const nextProps = { ...editingModule.props };
		if (normalized) nextProps.placement = normalized;
		else delete nextProps.placement;
		editingModule = { ...editingModule, props: nextProps };
	}

	const h = $derived(editingModule.props?.placement?.horizontal ?? 'default');
	const v = $derived(editingModule.props?.placement?.vertical ?? 'default');
</script>

<div class="space-y-3 border-t border-surface-200-800 pt-4">
	<h3 class="text-sm font-semibold text-(--color-surface-800-200)">Placement in grid cell</h3>
	<p class="text-xs text-(--color-surface-600-400)">
		Optional. Align this block inside its row/column (layout shells and page grids). Does not change module-specific
		options.
	</p>
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
		<div>
			<label class="block text-xs font-medium text-(--color-surface-800-200) mb-1" for="cell-place-h">
				Horizontal
			</label>
			<select
				id="cell-place-h"
				class="select w-full text-sm"
				value={h}
				on:change={(e) =>
					setAxis('horizontal', (e.currentTarget as HTMLSelectElement).value as ModulePlacementAxis)}
			>
				{#each axisOptions as opt}
					<option value={opt.value}>{horizontalLabel(opt.value)}</option>
				{/each}
			</select>
		</div>
		<div>
			<label class="block text-xs font-medium text-(--color-surface-800-200) mb-1" for="cell-place-v">
				Vertical
			</label>
			<select
				id="cell-place-v"
				class="select w-full text-sm"
				value={v}
				on:change={(e) =>
					setAxis('vertical', (e.currentTarget as HTMLSelectElement).value as ModulePlacementAxis)}
			>
				{#each axisOptions as opt}
					<option value={opt.value}>{verticalLabel(opt.value)}</option>
				{/each}
			</select>
		</div>
	</div>
</div>
