<script lang="ts">
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>Import & Sync - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<Header />

	<div class="max-w-4xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-8 text-center">
			<div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
			</div>
			<h1 class="text-2xl font-bold text-gray-900 mb-2">Import & Sync Temporarily Disabled</h1>
			<p class="text-gray-600 mb-6">
				The Import & Sync functionality is temporarily disabled for deployment. It will be re-enabled in a
				future update.
			</p>
			<button
				on:click={() => goto('/admin')}
				class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
			>
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
				Back to Admin Panel
			</button>
		</div>
	</div>

	<Footer />
</div>
