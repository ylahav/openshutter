<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { createEventDispatcher } from 'svelte';

	export let isOpen = false;
	export let message = '';
	export let type: 'success' | 'error' | 'info' | 'warning' = 'info';
	export let title: string | undefined = undefined;
	export let autoClose = true;
	export let autoCloseDelay = 3000;
	export let actionButton: { label: string; onClick: () => void } | undefined = undefined;
	export let onClose: () => void = () => {};

	const dispatch = createEventDispatcher();

	let mounted = false;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		mounted = true;
	});

	function handleClose() {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		onClose();
		dispatch('close');
	}

	$: if (isOpen && autoClose && mounted) {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			handleClose();
		}, autoCloseDelay);
	}

	function handleEscape(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			handleClose();
		}
	}

	onDestroy(() => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		if (browser) {
			document.removeEventListener('keydown', handleEscape);
		}
	});

	$: if (browser && isOpen && mounted) {
		document.addEventListener('keydown', handleEscape);
	} else if (browser) {
		document.removeEventListener('keydown', handleEscape);
	}

	function getIcon() {
		switch (type) {
			case 'success':
				return `<svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>`;
			case 'error':
				return `<svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>`;
			case 'warning':
				return `<svg class="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
				</svg>`;
			case 'info':
				return `<svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>`;
			default:
				return null;
		}
	}

	function getIconBgColor() {
		switch (type) {
			case 'success':
				return 'bg-green-50';
			case 'error':
				return 'bg-red-50';
			case 'warning':
				return 'bg-yellow-50';
			case 'info':
				return 'bg-blue-50';
			default:
				return 'bg-gray-50';
		}
	}

	function getButtonColor() {
		switch (type) {
			case 'success':
				return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
			case 'error':
				return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
			case 'warning':
				return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
			case 'info':
				return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
			default:
				return 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500';
		}
	}

	function getDisplayTitle() {
		if (title) return title;
		switch (type) {
			case 'success':
				return 'Success';
			case 'error':
				return 'Error';
			case 'warning':
				return 'Warning';
			case 'info':
				return 'Information';
			default:
				return 'Notification';
		}
	}
</script>

{#if mounted && isOpen}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
			<!-- Backdrop -->
			<div
				class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
				on:click={handleClose}
				role="button"
				tabindex="-1"
			/>

			<!-- Dialog -->
			<div
				class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
			>
				<div class="sm:flex sm:items-start">
					<div
						class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full {getIconBgColor()} sm:mx-0 sm:h-10 sm:w-10"
					>
						{@html getIcon()}
					</div>
					<div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
						<h3 class="text-lg font-medium leading-6 text-gray-900">
							{getDisplayTitle()}
						</h3>
						<div class="mt-2">
							<div class="text-sm text-gray-500">{@html message}</div>
						</div>
					</div>
				</div>
				<div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse sm:gap-3">
					{#if actionButton}
						<button
							type="button"
							class="inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:w-auto {getButtonColor()} focus:outline-none focus:ring-2 focus:ring-offset-2"
							on:click={() => {
								actionButton.onClick();
								handleClose();
							}}
						>
							{actionButton.label}
						</button>
					{/if}
					<button
						type="button"
						class="inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto {getButtonColor()} focus:outline-none focus:ring-2 focus:ring-offset-2"
						on:click={handleClose}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
