<script lang="ts">
	/** Visitor pack id — wireframe suggests layout feel (not literal screenshots). */
	let { packId }: { packId: string } = $props();

	const id = $derived(String(packId || 'noir').toLowerCase());</script>

<div
	class="relative h-28 w-full overflow-hidden rounded-t-lg border-b border-surface-200-800 bg-(--color-surface-100-900)"
	aria-hidden="true"
>
	{#if id === 'noir'}
		<svg class="h-full w-full" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
			<rect width="160" height="90" fill="#0a0a0a" />
			<rect x="0" y="0" width="36" height="90" fill="#121212" stroke="#262626" stroke-width="1" />
			<rect x="44" y="10" width="104" height="12" rx="2" fill="#262626" />
			<rect x="44" y="30" width="50" height="50" rx="2" fill="#171717" stroke="#333" stroke-width="1" />
			<rect x="100" y="30" width="52" height="24" rx="2" fill="#141414" />
			<rect x="100" y="58" width="52" height="22" rx="2" fill="#141414" />
		</svg>
	{:else if id === 'studio'}
		<svg class="h-full w-full" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
			<rect width="160" height="90" fill="#0f172a" />
			<rect x="0" y="0" width="160" height="14" fill="#1e293b" />
			<rect x="8" y="22" width="44" height="30" rx="2" fill="#1e3a8a" opacity="0.45" />
			<rect x="58" y="22" width="44" height="30" rx="2" fill="#2563eb" opacity="0.35" />
			<rect x="108" y="22" width="44" height="30" rx="2" fill="#1d4ed8" opacity="0.4" />
			<rect x="8" y="58" width="74" height="24" rx="2" fill="#1e293b" />
			<rect x="86" y="58" width="66" height="24" rx="2" fill="#1e293b" />
		</svg>
	{:else if id === 'atelier'}
		<svg class="h-full w-full" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
			<rect width="160" height="90" fill="#1a1008" />
			<rect x="10" y="10" width="92" height="38" rx="2" fill="#2c1810" stroke="#5c4033" stroke-width="1" />
			<rect x="108" y="10" width="42" height="70" rx="2" fill="#24150c" stroke="#6b4a2a" stroke-width="1" />
			<rect x="10" y="54" width="92" height="26" rx="2" fill="#221208" />
		</svg>
	{:else}
		<svg class="h-full w-full" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
			<rect width="160" height="90" fill="#18181b" />
			<rect x="20" y="18" width="120" height="54" rx="4" fill="#27272a" stroke="#3f3f46" stroke-width="1" />
		</svg>
	{/if}
</div>
