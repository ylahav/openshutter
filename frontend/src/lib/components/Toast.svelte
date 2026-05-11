<script lang="ts">
	import { onDestroy } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	export let isOpen = false;
	export let message = '';
	export let type: 'success' | 'error' | 'info' | 'warning' = 'info';
	export let autoCloseDelay = 5000;
	export let onClose: () => void = () => {};

	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let lastShownMessage = '';
	let lastShownAt = 0;

	function clearTimer() {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	}

	function close() {
		clearTimer();
		onClose();
	}

	// Restart the auto-close timer whenever the toast opens or the message changes
	// while open. Keying off (message + lastShownAt) lets the parent re-trigger the
	// toast with the same message by just bumping a counter if needed; the common
	// path (new isOpen=true) is the primary trigger.
	$: if (isOpen) {
		if (message !== lastShownMessage || !timeoutId) {
			lastShownMessage = message;
			lastShownAt = Date.now();
			clearTimer();
			timeoutId = setTimeout(close, autoCloseDelay);
		}
	} else {
		clearTimer();
	}

	onDestroy(clearTimer);

	function getStyleClasses() {
		switch (type) {
			case 'success':
				return 'bg-green-600 text-white';
			case 'error':
				return 'bg-red-600 text-white';
			case 'warning':
				return 'bg-yellow-500 text-gray-900';
			case 'info':
			default:
				return 'bg-gray-800 text-white';
		}
	}
</script>

{#if isOpen && message}
	<div
		class="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
		style="pointer-events: none;"
		role="status"
		aria-live="polite"
	>
		<div
			class="flex items-center gap-3 max-w-md min-w-[260px] rounded-lg shadow-lg px-4 py-3 text-sm font-medium {getStyleClasses()}"
			style="pointer-events: auto;"
			in:fly={{ y: 30, duration: 200, easing: quintOut }}
			out:fade={{ duration: 150 }}
		>
			<!-- Icon -->
			{#if type === 'success'}
				<svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			{:else if type === 'error'}
				<svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			{:else if type === 'warning'}
				<svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
				</svg>
			{:else}
				<svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{/if}

			<span class="flex-1">{@html message}</span>

			<button
				type="button"
				class="opacity-70 hover:opacity-100 transition-opacity"
				on:click={close}
				aria-label="Dismiss"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	</div>
{/if}
