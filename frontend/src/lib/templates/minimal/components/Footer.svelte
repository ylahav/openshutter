<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { getProductName } from '$lib/utils/productName';

	const year = new Date().getFullYear();
	$: productName = getProductName($siteConfigData ?? null, $currentLanguage);
</script>

<footer class="bg-white dark:bg-gray-900 border-t border-black dark:border-gray-700 mt-16">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="text-center space-y-2">
			<p class="text-sm text-gray-600 dark:text-gray-400 font-light">
				© {year} {productName}. All rights reserved.
			</p>
		</div>
	</div>
</footer>
