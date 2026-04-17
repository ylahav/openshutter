<script lang="ts">
	import { Toast } from '@skeletonlabs/skeleton-svelte';
	import { adminToaster } from '$lib/admin/toaster';

	const toastAnim =
		'transition transition-discrete opacity-0 translate-x-4 starting:data-[state=open]:opacity-0 starting:data-[state=open]:translate-x-4 data-[state=open]:opacity-100 data-[state=open]:translate-x-0';
</script>

<div class="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-end p-4 sm:p-6" aria-live="polite">
	<Toast.Group toaster={adminToaster} class="pointer-events-auto flex w-full max-w-sm flex-col gap-2">
		{#snippet children(toast)}
			<Toast {toast} class="flex w-full items-start gap-2">
				<Toast.Message
					class="card preset-outlined-surface-200-800 bg-surface-50-950 flex min-w-0 flex-1 gap-3 p-4 shadow-lg {toastAnim}"
				>
					<div class="min-w-0 flex-1 space-y-0.5">
						<Toast.Title class="text-sm font-semibold text-(--base-font-color)">
							{toast.title}
						</Toast.Title>
						{#if toast.description}
							<Toast.Description class="text-sm text-(--color-surface-600-400)">
								{toast.description}
							</Toast.Description>
						{/if}
					</div>
				</Toast.Message>
				<Toast.CloseTrigger
					class="btn-icon shrink-0 preset-tonal h-8 w-8"
					aria-label="Dismiss notification"
				/>
			</Toast>
		{/snippet}
	</Toast.Group>
</div>
