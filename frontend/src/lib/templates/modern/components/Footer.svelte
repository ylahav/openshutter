<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { getProductName } from '$lib/utils/productName';

	const year = new Date().getFullYear();
	$: productName = getProductName($siteConfigData ?? null, $currentLanguage);
</script>

<footer class="bg-slate-100 dark:bg-gradient-to-r dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 text-gray-900 dark:text-white mt-16 border-t border-slate-200 dark:border-purple-500/20">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="text-center space-y-2">
			<p class="text-gray-600 dark:text-blue-200">
				© {year} {productName}. All rights reserved.
			</p>
		</div>
	</div>
</footer>
