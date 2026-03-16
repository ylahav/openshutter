<script lang="ts">
	import { siteConfigData, productName } from '$stores/siteConfig';

	const year = new Date().getFullYear();
</script>

<footer class="bg-gray-800 text-white mt-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="text-center space-y-2">
			{#if $siteConfigData?.footer?.copyrightText}
				<p class="text-gray-300">
					{$siteConfigData.footer.copyrightText}
				</p>
			{:else}
				<p class="text-gray-300">
					© {year} {$productName}. All rights reserved.
				</p>
			{/if}

			{#if $siteConfigData?.footer?.termsUrl || $siteConfigData?.footer?.privacyUrl || $siteConfigData?.whiteLabel?.termsOfServiceUrl || $siteConfigData?.whiteLabel?.privacyPolicyUrl}
				<div class="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
					{#if $siteConfigData.footer?.termsUrl || $siteConfigData.whiteLabel?.termsOfServiceUrl}
						<a href={$siteConfigData.footer?.termsUrl || $siteConfigData.whiteLabel?.termsOfServiceUrl} class="hover:text-white">
							Terms of Service
						</a>
					{/if}
					{#if $siteConfigData.footer?.privacyUrl || $siteConfigData.whiteLabel?.privacyPolicyUrl}
						<a href={$siteConfigData.footer?.privacyUrl || $siteConfigData.whiteLabel?.privacyPolicyUrl} class="hover:text-white">
							Privacy Policy
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</footer>
