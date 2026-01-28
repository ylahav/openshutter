<script lang="ts">
	import { tokenRenewalNotification } from '$lib/stores/tokenRenewal';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';

	let oauthWindow: Window | null = null;
	let renewing = false;

	$: notification = $tokenRenewalNotification;

	async function handleRenew() {
		if (renewing) return;
		renewing = true;
		
		try {
			// Redirect to storage settings page with renew parameter to auto-trigger
			await goto('/admin/storage?renew=true');
			// Hide notification - user will see the renewal banner on storage page
			tokenRenewalNotification.hide();
		} catch (err) {
			logger.error('Failed to navigate to storage page:', err);
		} finally {
			renewing = false;
		}
	}

	function handleDismiss() {
		tokenRenewalNotification.hide();
	}
</script>

{#if notification.show}
	<div
		class="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg"
		role="alert"
	>
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center flex-1">
					<svg
						class="h-5 w-5 mr-3 flex-shrink-0"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					</svg>
					<div class="flex-1">
						<p class="text-sm font-medium">
							{notification.message}
						</p>
					</div>
				</div>
				<div class="ml-4 flex items-center space-x-3">
					<button
						type="button"
						on:click={handleRenew}
						disabled={renewing}
						class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50"
					>
						{#if renewing}
							<svg
								class="animate-spin -ml-1 mr-2 h-3 w-3"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Renewing...
						{:else}
							Renew Token Now
						{/if}
					</button>
					<button
						type="button"
						on:click={handleDismiss}
						class="text-white hover:text-red-200 focus:outline-none"
					>
						<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
