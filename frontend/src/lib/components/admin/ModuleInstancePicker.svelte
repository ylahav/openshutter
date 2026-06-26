<!--
  ModuleInstancePicker — dropdown of named instances for a given moduleType, drawn
  from site_config.template.moduleInstances[type] (the generic registry). Selecting
  one writes `instanceRef` onto the placement's props; PageBuilderGrid then merges
  the named instance's stored props beneath the placement props at render time.

  Hidden for module types whose own registries already cover instance reuse
  (`menu` → menuInstances; `layoutShell` → layoutShellInstances) and for types
  that don't carry user-editable reusable props.
-->
<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { adminSelectSmClass } from '$lib/admin/admin-cerberus';

	let {
		moduleType,
		value,
		onChange
	}: {
		moduleType: string;
		value: string | undefined;
		onChange: (next: string | undefined) => void;
	} = $props();

	/** Module types whose instance reuse is handled by a sibling registry or that have no reusable props worth picking. */
	const HIDDEN = new Set([
		'menu',
		'layoutShell',
		'divider',
		'pageTitle',
		'logo',
		'siteTitle',
		'languageSelector',
		'themeToggle',
		'themeSelect',
		'userGreeting',
		'authButtons'
	]);

	const instancesForType = $derived.by(() => {
		if (!moduleType || HIDDEN.has(moduleType)) return [];
		const byName = $siteConfigData?.template?.moduleInstances?.[moduleType];
		if (!byName || typeof byName !== 'object') return [];
		return Object.keys(byName)
			.filter((k) => typeof k === 'string' && k.trim() !== '')
			.sort((a, b) => a.localeCompare(b));
	});

	function handleChange(e: Event) {
		const v = (e.currentTarget as HTMLSelectElement).value;
		onChange(v ? v : undefined);
	}
</script>

{#if !HIDDEN.has(moduleType) && instancesForType.length > 0}
	<div class="rounded-md border border-surface-200-800 bg-(--color-surface-100-900) px-3 py-2">
		<label
			for="module-instance-ref"
			class="block text-xs font-semibold text-(--color-surface-800-200) mb-1"
		>
			Use shared instance
		</label>
		<select
			id="module-instance-ref"
			class={adminSelectSmClass}
			value={value ?? ''}
			onchange={handleChange}
		>
			<option value="">— Inline props (no shared instance) —</option>
			{#each instancesForType as name (name)}
				<option value={name}>{name}</option>
			{/each}
		</select>
		<p class="mt-1 text-[11px] text-(--color-surface-600-400)">
			Manage instances at <a class="underline" href="/admin/modules">Admin → Modules</a>.
			Placement-level props below override the instance.
		</p>
	</div>
{/if}
