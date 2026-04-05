<script lang="ts">
	import { activeTemplate } from '$stores/template';
</script>

{#if $activeTemplate === 'minimal'}
	<!-- Full-bleed canvas lives on <main>; do not put min-h-screen backgrounds on template roots inside .os-shell-container (they would only cover the max-width column). -->
	<main class="min-h-screen w-full bg-white dark:bg-neutral-950 text-black dark:text-gray-100">
		<div class="@container os-shell-container max-w-[var(--os-max-width)]">
			<slot />
		</div>
	</main>
{:else if $activeTemplate === 'modern'}
	<main
		class="min-h-screen w-full bg-slate-100 dark:bg-linear-to-b dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 text-gray-900 dark:text-white"
	>
		<div class="@container os-shell-container max-w-[var(--os-max-width)]">
			<slot />
		</div>
	</main>
{:else if $activeTemplate === 'elegant'}
	<main class="min-h-screen w-full bg-linear-to-b from-purple-50 to-white dark:from-slate-950 dark:to-neutral-950 text-gray-900 dark:text-white relative overflow-hidden" style="z-index: 1;">
		<!-- Animated background for elegant template (dark only) -->
		<div class="fixed inset-0 pointer-events-none opacity-0 dark:opacity-30" style="z-index: 0;">
			<div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
			<div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
		</div>
		<div class="relative" style="z-index: 1;">
			<div class="@container os-shell-container max-w-[var(--os-max-width)]">
				<slot />
			</div>
		</div>
	</main>
{:else}
	<!-- Default: semantic background from ThemeColorApplier / design tokens (full viewport width). -->
	<main class="min-h-screen w-full bg-background text-foreground">
		<div class="@container os-shell-container max-w-[var(--os-max-width)]">
			<slot />
		</div>
	</main>
{/if}
