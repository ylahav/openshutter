<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	$: path = $page.url.pathname;
</script>

<div class="min-h-screen bg-gray-50">
	<nav class="bg-white border-b border-gray-200">
		<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between h-14">
				<div class="flex items-center gap-6">
					<a
						href="/developers"
						class="text-lg font-semibold {path === '/developers' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-900 hover:text-primary-600'} px-1 py-3"
					>
						Overview
					</a>
					<a
						href="/developers/keys"
						class="{path === '/developers/keys' ? 'text-primary-600 border-b-2 border-primary-600 font-medium' : 'text-gray-600 hover:text-gray-900'} border-b-2 border-transparent hover:border-gray-300 px-1 py-3"
					>
						API Keys
					</a>
					<a
						href="/developers/docs"
						class="{path === '/developers/docs' ? 'text-primary-600 border-b-2 border-primary-600 font-medium' : 'text-gray-600 hover:text-gray-900'} border-b-2 border-transparent hover:border-gray-300 px-1 py-3"
					>
						API Docs
					</a>
				</div>
				<div class="flex items-center gap-3">
					<a
						href="/owner"
						class="text-sm text-gray-600 hover:text-gray-900"
					>
						← Back to panel
					</a>
				</div>
			</div>
		</div>
	</nav>

	<main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<slot />
	</main>
</div>
