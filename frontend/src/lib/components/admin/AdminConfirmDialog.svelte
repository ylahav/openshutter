<script lang="ts">
	import { Dialog, Portal } from '@skeletonlabs/skeleton-svelte';

	interface Props {
		open: boolean;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'default' | 'danger';
		confirmDisabled?: boolean;
		onOpenChange?: (open: boolean) => void;
		onConfirm?: () => void;
	}

	let {
		open,
		title,
		message,
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		variant = 'default',
		confirmDisabled = false,
		onOpenChange,
		onConfirm,
	}: Props = $props();

	const anim =
		'transition transition-discrete opacity-0 translate-y-2 scale-[0.98] starting:data-[state=open]:opacity-0 starting:data-[state=open]:translate-y-2 starting:data-[state=open]:scale-[0.98] data-[state=open]:opacity-100 data-[state=open]:translate-y-0 data-[state=open]:scale-100';

	function handleOpenChange(d: { open: boolean }) {
		onOpenChange?.(d.open);
	}
</script>

<Dialog role="alertdialog" {open} onOpenChange={handleOpenChange}>
	<Portal>
		<Dialog.Backdrop class="fixed inset-0 z-[150] bg-surface-50-950/60 backdrop-blur-[2px]" />
		<Dialog.Positioner class="fixed inset-0 z-[150] flex items-center justify-center p-4">
			<Dialog.Content
				class="card preset-outlined-surface-200-800 bg-surface-50-950 max-h-[90vh] w-full max-w-md overflow-y-auto p-6 shadow-xl {anim}"
			>
				{#if variant === 'danger'}
					<div class="mb-4 flex justify-center">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-error-500)_18%,transparent)]"
						>
							<svg class="h-6 w-6 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
					</div>
				{/if}
				<Dialog.Title
					class="text-lg font-semibold text-(--heading-font-color) {variant === 'danger'
						? 'text-center'
						: ''}"
				>
					{title}
				</Dialog.Title>
				<Dialog.Description class="mt-2 text-sm text-(--color-surface-600-400) {variant === 'danger'
					? 'text-center'
					: ''}">
					{message}
				</Dialog.Description>
				<div class="mt-6 flex justify-end gap-3">
					<Dialog.CloseTrigger class="btn preset-tonal" disabled={confirmDisabled}>
						{cancelText}
					</Dialog.CloseTrigger>
					<button
						type="button"
						class="btn {variant === 'danger' ? 'preset-filled-error-500' : 'preset-filled-primary-500'}"
						disabled={confirmDisabled}
						onclick={() => onConfirm?.()}
					>
						{confirmText}
					</button>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</Portal>
</Dialog>
