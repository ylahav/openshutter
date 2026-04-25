<script lang="ts">
	import Menu from '$components/ui/menu/Menu.svelte';

	export let config: any = {};

	$: orientation = config?.orientation ?? 'horizontal';
	$: items = Array.isArray(config?.items) ? config.items : [];
	$: normalizedConfig = {
		...config,
		// Menu component reads items from config.menu
		menu: Array.isArray(config?.items) ? config.items : config?.menu
	};
</script>

<div class="pb-menuModule">
	<Menu
		orientation={orientation}
		config={normalizedConfig}
		items={items}
		itemClass={config?.itemClass}
		activeItemClass={config?.activeItemClass}
		containerClass={config?.containerClass}
		separator={config?.separator}
		showActiveIndicator={config?.showActiveIndicator}
		showAuthButtons={config?.showAuthButtons}
	/>
</div>
