<script lang="ts">
	import Menu from '$components/Menu.svelte';

	export let config: any = {};
	export let templateConfig: Record<string, any> = {};

	$: orientation = config?.orientation ?? 'horizontal';
</script>

<Menu orientation={orientation} />
