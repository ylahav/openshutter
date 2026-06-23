<!-- frontend/src/lib/page-builder/modules/PersonBio/Layout.svelte -->
<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';

	type PersonBioConfig = {
		name?: string | Record<string, string>;
		portraitImage?: string;
		paragraphs?: Array<string | Record<string, string>>;
	};

	let { config = {} }: { config?: PersonBioConfig } = $props();

	const nameText = $derived(MultiLangUtils.getTextValue(config?.name, $currentLanguage) || '');
	const portrait = $derived(typeof config?.portraitImage === 'string' ? config.portraitImage : '');
	const paragraphs = $derived(
		Array.isArray(config?.paragraphs)
			? config.paragraphs
					.map((p) => MultiLangUtils.getTextValue(p, $currentLanguage) || '')
					.filter((s) => s.length > 0)
			: []
	);
</script>

<div class="pb-personBio">
	{#if portrait}
		<div class="pb-personBio__portrait">
			<img src={portrait} alt={nameText} loading="lazy" />
		</div>
	{/if}
	<div class="pb-personBio__body">
		{#if nameText}
			<h2 class="pb-personBio__name">{nameText}</h2>
		{/if}
		{#each paragraphs as p, i (i)}
			<p class="pb-personBio__paragraph">{p}</p>
		{/each}
	</div>
</div>

<style lang="scss">
	.pb-personBio {
		display: grid;
		grid-template-columns: 1fr;
		gap: 32px;
		align-items: start;

		@media (min-width: 720px) {
			grid-template-columns: 280px 1fr;
			gap: 56px;
		}
	}

	.pb-personBio__portrait {
		width: 100%;
		aspect-ratio: 3 / 4;
		overflow: hidden;
		border-radius: 12px;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
	}

	.pb-personBio__name {
		margin: 0 0 16px;
		font-weight: 700;
		font-size: 28px;
	}

	.pb-personBio__paragraph {
		margin: 0 0 20px;
		font-size: 15px;
		line-height: 1.8;
	}
</style>
