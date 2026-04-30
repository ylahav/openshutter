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

<section class="pb-featureGrid">
	<div class="pb-featureGrid__inner">
		<div class="pb-featureGrid__header">
			<h2 class="pb-featureGrid__title">{titleText}</h2>
			{#if subtitleText}
				<p class="pb-featureGrid__subtitle">{subtitleText}</p>
			{/if}
		</div>

		<div class="pb-featureGrid__grid">
			{#each features as feature}
				<div class="pb-featureGrid__card">
					{#if feature.icon}
						<div class="pb-featureGrid__iconWrap">
							<IconRenderer icon={feature.icon} />
						</div>
					{/if}
					<h3 class="pb-featureGrid__cardTitle">
						{MultiLangUtils.getTextValue(feature.title, $currentLanguage) || ''}
					</h3>
					<div class="pb-featureGrid__cardBody">
						{@html MultiLangUtils.getHTMLValue(feature.description, $currentLanguage) || ''}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style lang="scss">
	.pb-featureGrid {
		padding: 5rem 0;
		background: var(--tp-surface-2);
	}

	.pb-featureGrid__inner {
		width: 100%;
	}

	.pb-featureGrid__header {
		text-align: center;
		margin-bottom: 4rem;
	}

	.pb-featureGrid__title {
		margin: 0 0 1rem;
		color: var(--tp-fg);
		font-size: clamp(2rem, 4vw, 2.25rem);
		font-weight: 700;
		line-height: 1.2;
	}

	.pb-featureGrid__subtitle {
		margin: 0 auto;
		color: var(--tp-fg-muted);
		font-size: 1.25rem;
		line-height: 1.6;
		max-width: 56rem;
	}

	.pb-featureGrid__grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	.pb-featureGrid__card {
		background: var(--tp-surface-1);
		border: 1px solid var(--tp-border);
		border-radius: 0.75rem;
		padding: 2rem;
		transition: box-shadow 0.3s ease;
	}

	.pb-featureGrid__card:hover {
		box-shadow: 0 8px 30px color-mix(in srgb, var(--tp-fg) 10%, transparent);
	}

	.pb-featureGrid__iconWrap {
		width: 3rem;
		height: 3rem;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.5rem;
		color: var(--os-primary);
		background: color-mix(in srgb, var(--os-primary) 16%, var(--tp-surface-2));
	}

	.pb-featureGrid__cardTitle {
		margin: 0 0 0.75rem;
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--tp-fg);
	}

	.pb-featureGrid__cardBody {
		color: var(--tp-fg-muted);
		line-height: 1.65;
	}

	.pb-featureGrid__cardBody :global(p) {
		margin: 0;
	}

	.pb-featureGrid__cardBody :global(a) {
		color: var(--os-primary);
	}

	@media (min-width: 768px) {
		.pb-featureGrid__grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.pb-featureGrid__grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
