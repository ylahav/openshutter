<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import '$lib/templates/styles/main.scss';
</script>

{#if $activeTemplate === 'noir'}
	<main
		class="tpl-pack-noir min-h-screen w-full relative overflow-x-hidden transition-colors duration-300 bg-(--tp-canvas) text-(--tp-fg) [font-family:var(--os-font-body)]"
	>
		<div class="@container w-full">
			<slot />
		</div>
	</main>
{:else if $activeTemplate === 'studio'}
	<main
		class="tpl-pack-studio min-h-screen w-full relative overflow-x-hidden transition-colors duration-300 bg-(--tp-canvas) text-(--tp-fg) [font-family:var(--os-font-body)]"
	>
		<div class="@container w-full">
			<slot />
		</div>
	</main>
{:else if $activeTemplate === 'atelier'}
	<main
		class="tpl-pack-atelier min-h-screen w-full relative overflow-x-hidden transition-colors duration-300 bg-(--tp-canvas) text-(--tp-fg) [font-family:var(--os-font-body)]"
	>
		<div class="@container w-full">
			<slot />
		</div>
	</main>
{:else}
	<!-- Fallback (normalized packs should always be noir / studio / atelier). -->
	<main class="min-h-screen w-full bg-background text-foreground">
		<div class="@container os-shell-container">
			<slot />
		</div>
	</main>
{/if}
