<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import '$lib/styles/globals.css';
	import '$templates/styles/main.scss';
	import { browser } from '$app/environment';

	const loadedPackStyles = new Set<string>();

	async function ensurePackStyles(templateName: string) {
		if (loadedPackStyles.has(templateName)) return;
		if (templateName === 'noir') {
			await import('$templates/noir/styles/styles.scss');
		} else if (templateName === 'studio') {
			await import('$templates/studio/styles/styles.scss');
		} else if (templateName === 'atelier') {
			await import('$templates/atelier/styles.scss');
		} else {
			await import('$templates/noir/styles/styles.scss');
		}
		loadedPackStyles.add(templateName);
	}

	$: if (browser) {
		void ensurePackStyles($activeTemplate || 'noir');
	}
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
