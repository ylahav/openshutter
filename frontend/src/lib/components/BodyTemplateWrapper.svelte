<script lang="ts">
	import { activeTemplate } from '$stores/template';
</script>

{#if $activeTemplate === 'minimal'}
	<main class="min-h-screen bg-white text-black">
		<slot />
	</main>
{:else if $activeTemplate === 'modern'}
	<main class="min-h-screen bg-linear-to-b from-slate-900 via-purple-900 to-slate-900 text-white">
		<slot />
	</main>
{:else if $activeTemplate === 'elegant'}
	<main class="min-h-screen bg-black text-white relative overflow-hidden" style="z-index: 1;">
		<!-- Animated background for elegant template -->
		<div class="fixed inset-0 opacity-30 pointer-events-none" style="z-index: 0;">
			<div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
			<div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
		</div>
		<div class="relative" style="z-index: 1;">
			<slot />
		</div>
	</main>
{:else}
	<!-- Default template -->
	<main class="min-h-screen bg-background text-foreground">
		<slot />
	</main>
{/if}
