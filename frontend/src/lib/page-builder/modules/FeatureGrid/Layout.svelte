<!-- frontend/src/lib/page-builder/modules/FeatureGrid/Layout.svelte -->
<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import IconRenderer from '$lib/components/IconRenderer.svelte';

	type FeatureItem = {
		title?: string | Record<string, string>;
		description?: string | Record<string, string>;
		icon?: string;
	};

	type FeatureGridLayoutConfig = {
		title?: string | Record<string, string>;
		subtitle?: string | Record<string, string>;
		features?: FeatureItem[];
	};

	export let config: FeatureGridLayoutConfig = {};

	$: titleText = MultiLangUtils.getTextValue(config?.title, $currentLanguage) || '';
	$: subtitleText = config?.subtitle ? MultiLangUtils.getTextValue(config.subtitle, $currentLanguage) : '';
	$: features = (Array.isArray(config?.features) ? config.features : []).filter((feature) => {
		const hasTitle = MultiLangUtils.getTextValue(feature?.title, $currentLanguage)?.trim();
		const hasDescription = MultiLangUtils.getHTMLValue(feature?.description, $currentLanguage)?.trim();
		return Boolean(hasTitle || hasDescription);
	});
</script>

<section class="py-20 bg-[color:var(--tp-surface-2)]">
	<div class="w-full">
		<div class="text-center mb-16">
			<h2 class="text-4xl font-bold text-[color:var(--tp-fg)] mb-4">{titleText}</h2>
			{#if subtitleText}
				<p class="text-xl text-[color:var(--tp-fg-muted)]">{subtitleText}</p>
			{/if}
		</div>

		<div class="grid @md:grid-cols-2 @lg:grid-cols-3 gap-8">
			{#each features as feature}
				<div
					class="bg-[color:var(--tp-surface-1)] rounded-xl border border-[color:var(--tp-border)] p-8 transition-shadow hover:shadow-[0_8px_30px_color-mix(in_srgb,var(--tp-fg)_10%,transparent)]"
				>
					{#if feature.icon}
						<div
							class="w-12 h-12 rounded-lg flex items-center justify-center mb-6 text-[color:var(--os-primary)] bg-[color:color-mix(in_srgb,var(--os-primary)_16%,var(--tp-surface-2))]"
						>
							<IconRenderer icon={feature.icon} />
						</div>
					{/if}
					<h3 class="text-xl font-semibold text-[color:var(--tp-fg)] mb-3">
						{MultiLangUtils.getTextValue(feature.title, $currentLanguage) || ''}
					</h3>
					<div
						class="text-[color:var(--tp-fg-muted)] leading-relaxed prose prose-sm max-w-none [&_a]:text-[color:var(--os-primary)]"
					>
						{@html MultiLangUtils.getHTMLValue(feature.description, $currentLanguage) || ''}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
