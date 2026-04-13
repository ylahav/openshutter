<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';

	$: config = $siteConfigData;
	$: lang = $currentLanguage;

	type TemplateCfg = {
		heroTitle?: unknown;
		heroSub?: unknown;
		heroSubtitle?: unknown;
	};

	$: tpl = (config?.template ?? {}) as TemplateCfg;
	$: titleFromTemplate = (() => {
		const raw = tpl.heroTitle;
		if (raw == null || raw === '') return '';
		if (typeof raw === 'object') return MultiLangUtils.getTextValue(raw as any, lang);
		return String(raw);
	})();
	$: subFromTemplate = (() => {
		const raw = tpl.heroSub ?? tpl.heroSubtitle;
		if (raw == null || raw === '') return '';
		if (typeof raw === 'object') return MultiLangUtils.getTextValue(raw as any, lang);
		return String(raw);
	})();

	$: title =
		titleFromTemplate ||
		(config?.title ? MultiLangUtils.getTextValue(config.title, lang) : 'Photography');
	$: tagline = config?.description
		? MultiLangUtils.getHTMLValue(config.description, lang).replace(/<[^>]*>/g, '').trim()
		: '';
	$: subtitle = subFromTemplate
		? subFromTemplate
		: tagline.length > 0
			? tagline
					.split(/[·•|,\n]/)
					.map((s) => s.trim())
					.filter(Boolean)
					.slice(0, 4)
					.join(' · ')
			: 'collections · moments · light';

	$: heroImage =
		(config as any)?.template?.heroBackgroundImage ||
		(config as any)?.heroImage ||
		'https://picsum.photos/seed/noir-hero/1600/900';
</script>

<section class="n-hero">
	<img class="n-hero__img" src={heroImage} alt="" loading="eager" />
	<div class="n-hero__content">
		<h1 class="n-hero__title">
			{title}
		</h1>
		<div class="n-hero__rule" aria-hidden="true"></div>
		<p class="n-hero__sub">
			{subtitle}
		</p>
	</div>
	<a href="/albums" class="n-hero__scroll">
		scroll
	</a>
</section>
