<script lang="ts">
	import Menu from '$pageBuilder/primitives/menu/Menu.svelte';

	let { config = {} }: { config?: Record<string, unknown> } = $props();

	const orientation = $derived((config?.orientation as string) ?? 'horizontal');
	const items = $derived(Array.isArray(config?.items) ? config.items : []);
	const normalizedConfig = $derived({
		...config,
		// Menu component reads items from config.menu
		menu: Array.isArray(config?.items) ? config.items : config?.menu
	});
</script>

<div class="pb-menuModule">
	<Menu
		orientation={orientation}
		config={normalizedConfig}
		{items}
		itemClass={config?.itemClass}
		activeItemClass={config?.activeItemClass}
		containerClass={config?.containerClass}
		separator={config?.separator}
		showActiveIndicator={config?.showActiveIndicator}
		showAuthButtons={config?.showAuthButtons}
	/>
</div>
