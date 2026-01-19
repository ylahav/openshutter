<script lang="ts">
	export let node: any;
	export let depth = 0;

	function formatSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}
</script>

<div class="py-1 whitespace-nowrap" style="margin-left: {depth * 16}px;">
	<div class="flex items-center gap-2">
		<span>📁</span>
		<span class="font-semibold text-gray-900">{node.path || '/'}</span>
		<span class="text-xs text-gray-500">({node.totalFolders || 0} folders, {node.totalFiles || 0} files)</span>
	</div>
	{#if node.files && node.files.length > 0}
		{#each node.files as file}
			<div class="py-0.5 text-gray-700 whitespace-nowrap" style="margin-left: {(depth + 1) * 16}px;">
				<span>📄</span> <span class="text-gray-700">{file.name}</span> <span class="text-xs text-gray-400">({formatSize(file.size)})</span>
			</div>
		{/each}
	{/if}
	{#if node.folders && node.folders.length > 0}
		{#each node.folders as folder}
			<svelte:self node={folder} depth={depth + 1} />
		{/each}
	{/if}
</div>
