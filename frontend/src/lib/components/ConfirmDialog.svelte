<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let {
		isOpen = $bindable(false),
		title = $bindable(''),
		message = $bindable(''),
		confirmText = $bindable('Confirm'),
		cancelText = $bindable('Cancel'),
		variant = 'default',
		showDeleteFromStorage = $bindable(false),
		disabled = $bindable(false),
		onconfirm = undefined,
		oncancel = undefined
	}: {
		isOpen?: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'default' | 'danger';
		showDeleteFromStorage?: boolean;
		disabled?: boolean;
		onconfirm?: (detail: { deleteFromStorage: boolean }) => void;
		oncancel?: () => void;
	} = $props();

	let mounted = $state(false);
	let deleteFromStorage = $state(false);
	let confirmButton = $state<HTMLButtonElement | undefined>(undefined);
	let previousOverflow = $state('');
	let escapeHandler: ((e: KeyboardEvent) => void) | null = $state(null);

	onMount(() => {
		mounted = true;
	});

	function handleConfirm() {
		if (disabled) return;
		onconfirm?.({ deleteFromStorage });
	}

	function handleCancel() {
		if (disabled) return;
		oncancel?.();
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

	$effect(() => {
		if (isOpen && mounted) {
			previousOverflow = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			escapeHandler = handleEscape;
			document.addEventListener('keydown', escapeHandler);
			setTimeout(() => {
				confirmButton?.focus();
			}, 0);
		} else if (!isOpen && mounted) {
			if (previousOverflow !== '') {
				document.body.style.overflow = previousOverflow;
				previousOverflow = '';
			}
			if (escapeHandler) {
				document.removeEventListener('keydown', escapeHandler);
				escapeHandler = null;
			}
		}
	});

	onDestroy(() => {
		if (previousOverflow !== '') {
			document.body.style.overflow = previousOverflow;
		}
		if (escapeHandler) {
			document.removeEventListener('keydown', escapeHandler);
		}
	});

	const confirmBtnClasses = $derived(
		variant === 'danger'
			? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
			: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white'
	);
</script>

{#if mounted && isOpen}
	<div
		class="fixed inset-0 z-[9999] overflow-y-auto"
		onclick={handleBackdropClick}
		onkeydown={(e) => {
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
		<div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
		<div class="flex min-h-full items-center justify-center p-4" onclick={(e) => { e.stopPropagation(); }} role="none">
			<div
				class="w-full max-w-md rounded-lg bg-white shadow-2xl animate-scale-in relative z-[10000] border border-gray-200"
				role="document"
			>
				<div class="p-6">
					<div class="flex items-start">
						{#if variant === 'danger'}
							<div class="shrink-0 mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
								<svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
							</div>
						{/if}
						<div class="flex-1 {variant === 'danger' ? 'text-center' : ''}">
							<h3 id="dialog-title" class="text-lg font-semibold text-gray-900">{title}</h3>
							<p id="dialog-description" class="mt-2 text-sm text-gray-600">{message}</p>
						</div>
					</div>

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
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
							onclick={handleCancel}
							disabled={disabled}
						>
							{cancelText}
						</button>
						<button
							type="button"
							class="px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed {confirmBtnClasses}"
							onclick={handleConfirm}
							bind:this={confirmButton}
							disabled={disabled}
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
