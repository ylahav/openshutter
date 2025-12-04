<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	export let isOpen = false;
	export let title = '';
	export let message = '';
	export let confirmText = 'Confirm';
	export let cancelText = 'Cancel';
	export let variant: 'default' | 'danger' = 'default';
	export let showDeleteFromStorage = false;

	const dispatch = createEventDispatcher();

	let mounted = false;
	let deleteFromStorage = false;
	let confirmButton: HTMLButtonElement;
	let previousOverflow = '';
	let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

	onMount(() => {
		mounted = true;
	});

	function handleConfirm() {
		dispatch('confirm', { deleteFromStorage });
		isOpen = false;
	}

	function handleCancel() {
		dispatch('cancel');
		isOpen = false;
	}

	function handleEscape(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			handleCancel();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleCancel();
		}
	}

	$: if (isOpen && mounted) {
		// Lock body scroll
		previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		escapeHandler = handleEscape;
		document.addEventListener('keydown', escapeHandler);
		// Focus confirm button
		setTimeout(() => {
			confirmButton?.focus();
		}, 0);
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

	const confirmBtnClasses =
		variant === 'danger'
			? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
			: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white';
</script>

{#if mounted && isOpen}
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		on:click={handleBackdropClick}
		on:keydown={(e) => {
			if (e.key === 'Escape') {
				handleCancel();
			}
		}}
		role="dialog"
		aria-modal="true"
		aria-labelledby="dialog-title"
		aria-describedby="dialog-description"
		tabindex="-1"
	>
		<div class="fixed inset-0 bg-black bg-opacity-50" />
		<div class="flex min-h-full items-center justify-center p-4" on:click|stopPropagation role="none">
			<div
				class="w-full max-w-md rounded-lg bg-white shadow-xl animate-scale-in relative z-50"
				transition:scale={{ duration: 200 }}
				role="document"
			>
				<div class="p-6">
					<h3 id="dialog-title" class="text-lg font-semibold text-gray-900">{title}</h3>
					<p id="dialog-description" class="mt-2 text-sm text-gray-600">{message}</p>

					{#if showDeleteFromStorage}
						<div class="mt-4">
							<label class="flex items-center space-x-2">
								<input
									type="checkbox"
									class="rounded border-gray-300 text-red-600 focus:ring-red-500"
									bind:checked={deleteFromStorage}
								/>
								<span class="text-sm text-gray-700">
									Also delete from storage (files will be permanently removed)
								</span>
							</label>
						</div>
					{/if}

					<div class="mt-6 flex justify-end gap-3">
						<button
							type="button"
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
							on:click={handleCancel}
						>
							{cancelText}
						</button>
						<button
							type="button"
							class="px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 {confirmBtnClasses}"
							on:click={handleConfirm}
							bind:this={confirmButton}
						>
							{confirmText}
						</button>
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
