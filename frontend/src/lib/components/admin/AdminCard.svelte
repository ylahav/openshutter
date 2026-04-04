<script lang="ts">
	/** Optional extra classes (padding is included). */
	let className = '';
	export { className as class };
</script>

<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-5 space-y-5 min-w-0 {className}">
	<slot />
</div>
