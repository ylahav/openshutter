<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let isOpen = false;
	export let title = '';
	export let message = '';
	export let variant: 'error' | 'warning' | 'info' | 'success' = 'info';
	export let onClose: () => void = () => {};
	export let showCancel = false;
	export let onConfirm: (() => void) | null = null;
	export let confirmText = 'OK';
	export let cancelText = 'Cancel';

	let mounted = false;
	let previousOverflow = '';
	let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

	onMount(() => {
		mounted = true;
	});

	function handleClose() {
		onClose();
	}

	function handleEscape(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			handleClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}

	$: if (isOpen && mounted) {
		// Lock body scroll
		previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		escapeHandler = handleEscape;
		document.addEventListener('keydown', escapeHandler);
	} else if (!isOpen && mounted) {
		// Restore body scroll when dialog closes
		if (previousOverflow !== '') {
			document.body.style.overflow = previousOverflow;
			previousOverflow = '';
		}
		if (escapeHandler) {
			document.removeEventListener('keydown', escapeHandler);
			escapeHandler = null;
		}
	}

	onDestroy(() => {
		if (previousOverflow !== '') {
			document.body.style.overflow = previousOverflow;
		}
		if (escapeHandler) {
			document.removeEventListener('keydown', escapeHandler);
		}
	});

	$: iconColor = variant === 'error' 
		? 'text-red-600' 
		: variant === 'warning' 
			? 'text-yellow-600' 
			: variant === 'success' 
				? 'text-green-600' 
				: 'text-blue-600';
	
	$: bgColor = variant === 'error' 
		? 'bg-red-100' 
		: variant === 'warning' 
			? 'bg-yellow-100' 
			: variant === 'success' 
				? 'bg-green-100' 
				: 'bg-blue-100';
	
	$: buttonColor = variant === 'error' 
		? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
		: variant === 'warning' 
			? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' 
			: variant === 'success' 
				? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
				: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
</script>

{#if mounted && isOpen}
	<div
		class="fixed inset-0 z-[9999] overflow-y-auto"
		on:click={handleBackdropClick}
		on:keydown={(e) => {
			if (e.key === 'Escape') {
				handleClose();
			}
		}}
		role="dialog"
		aria-modal="true"
		aria-labelledby="alert-title"
		aria-describedby="alert-message"
		tabindex="-1"
	>
		<div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
		<div class="flex min-h-full items-center justify-center p-4" on:click|stopPropagation role="none">
			<div
				class="w-full max-w-md rounded-lg bg-white shadow-2xl animate-scale-in relative z-[10000] border border-gray-200"
				role="document"
			>
				<div class="p-6">
					<div class="flex items-start">
						<div class="flex-shrink-0">
							<div class="flex items-center justify-center h-10 w-10 rounded-full {bgColor}">
								{#if variant === 'error'}
									<svg class="h-6 w-6 {iconColor}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								{:else if variant === 'warning'}
									<svg class="h-6 w-6 {iconColor}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
									</svg>
								{:else if variant === 'success'}
									<svg class="h-6 w-6 {iconColor}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								{:else}
									<svg class="h-6 w-6 {iconColor}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								{/if}
							</div>
						</div>
						<div class="ml-4 flex-1">
							<h3 id="alert-title" class="text-lg font-semibold text-gray-900">{title}</h3>
							<p id="alert-message" class="mt-2 text-sm text-gray-600">{message}</p>
						</div>
					</div>
					<div class="mt-6 flex justify-end gap-3">
						{#if showCancel && onConfirm}
							<button
								type="button"
								class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
								on:click={handleClose}
							>
								{cancelText}
							</button>
							<button
								type="button"
								class="px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 {buttonColor}"
								on:click={() => {
									if (onConfirm) {
										onConfirm();
									}
									handleClose();
								}}
							>
								{confirmText}
							</button>
						{:else}
							<button
								type="button"
								class="px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 {buttonColor}"
								on:click={handleClose}
							>
								{confirmText}
							</button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes scale-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.animate-scale-in {
		animation: scale-in 0.2s ease-out;
	}
</style>
