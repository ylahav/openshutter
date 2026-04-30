<!-- frontend/src/lib/page-builder/modules/Cta/Layout.svelte -->
<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';

	type CtaLayoutConfig = {
		title?: string | Record<string, string>;
		description?: string | Record<string, string>;
		primaryLabel?: string | Record<string, string>;
		primaryHref?: string;
		secondaryLabel?: string | Record<string, string>;
		secondaryHref?: string;
	};

	export let config: CtaLayoutConfig = {};

	$: titleText = MultiLangUtils.getTextValue(config?.title, $currentLanguage) || '';
	$: descriptionText = config?.description ? MultiLangUtils.getTextValue(config.description, $currentLanguage) : '';
	$: primaryLabel = MultiLangUtils.getTextValue(config?.primaryLabel, $currentLanguage) || 'Get Started';
	$: primaryHref = typeof config?.primaryHref === 'string' && config.primaryHref.trim() ? config.primaryHref : '/';
	$: secondaryLabel = MultiLangUtils.getTextValue(config?.secondaryLabel, $currentLanguage) || '';
	$: secondaryHref = typeof config?.secondaryHref === 'string' && config.secondaryHref.trim() ? config.secondaryHref : '';
</script>

<section
	class="pb-cta"
	style="background: linear-gradient(180deg, var(--tp-brand) 0%, color-mix(in srgb, var(--tp-brand) 72%, var(--tp-surface-3)) 100%);"
>
	<div class="pb-cta__inner">
		<h2 class="pb-cta__title">{titleText}</h2>
		{#if descriptionText}
			<p class="pb-cta__description">
				{descriptionText}
			</p>
		{/if}
		<div class="pb-cta__actions">
			<a
				href={primaryHref}
				class="pb-cta__button pb-cta__button--primary"
			>
				{primaryLabel}
			</a>
			{#if secondaryLabel && secondaryHref}
				<a
					href={secondaryHref}
					class="pb-cta__button pb-cta__button--secondary"
				>
					{secondaryLabel}
				</a>
			{/if}
		</div>
	</div>
</section>

<style lang="scss">
	.pb-cta {
		padding: 5rem 0;
		color: var(--tp-on-brand);
	}

	.pb-cta__inner {
		width: 100%;
		text-align: center;
	}

	.pb-cta__title {
		margin: 0 0 1.5rem;
		font-size: clamp(2rem, 4vw, 2.25rem);
		font-weight: 700;
	}

	.pb-cta__description {
		margin: 0 0 2rem;
		font-size: 1.25rem;
		color: color-mix(in srgb, var(--tp-on-brand) 88%, transparent);
	}

	.pb-cta__actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		justify-content: center;
	}

	.pb-cta__button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 1rem 2rem;
		border-radius: 0.5rem;
		transition: all 0.2s ease;
		font-size: 1.125rem;
		font-weight: 600;
		text-decoration: none;
	}

	.pb-cta__button--primary {
		background: var(--tp-surface-1);
		color: var(--tp-brand);

		&:hover {
			opacity: 0.95;
		}
	}

	.pb-cta__button--secondary {
		border: 2px solid var(--tp-on-brand);
		color: var(--tp-on-brand);
		background: transparent;

		&:hover {
			background: color-mix(in srgb, var(--tp-on-brand) 14%, transparent);
		}
	}

	@media (min-width: 640px) {
		.pb-cta__actions {
			flex-direction: row;
		}
	}
</style>
