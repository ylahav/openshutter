<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import './_styles.scss';

	type ContactFormConfig = {
		title?: string | Record<string, string>;
		description?: string | Record<string, string>;
		showSidebar?: boolean;
		sidebarTitle?: string | Record<string, string>;
		showSidebarEmail?: boolean;
		sidebarEmail?: string;
		showSidebarPhone?: boolean;
		sidebarPhone?: string;
		showSidebarAddress?: boolean;
		sidebarAddress?: string | Record<string, string>;
		showSidebarSocial?: boolean;
		showInstagram?: boolean;
		showFlickr?: boolean;
		showFacebook?: boolean;
		showTwitter?: boolean;
		showLinkedin?: boolean;
		showYoutube?: boolean;
		showGithub?: boolean;
		socialLinks?: Array<{ platform?: string; url?: string }>;
		links?: Array<{ platform?: string; url?: string }>;
		linksJson?: string;
		showPhoneField?: boolean;
		/** @deprecated Use `showPhoneField` */
		showPhone?: boolean;
		submitLabel?: string | Record<string, string>;
		nameLabel?: string | Record<string, string>;
		emailLabel?: string | Record<string, string>;
		phoneLabel?: string | Record<string, string>;
		messageLabel?: string | Record<string, string>;
		namePlaceholder?: string | Record<string, string>;
		emailPlaceholder?: string | Record<string, string>;
		phonePlaceholder?: string | Record<string, string>;
		messagePlaceholder?: string | Record<string, string>;
		successMessage?: string | Record<string, string>;
		errorMessage?: string | Record<string, string>;
	};

	let { config = {} }: { config?: ContactFormConfig } = $props();

	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let message = $state('');
	let busy = $state(false);
	let success = $state('');
	let error = $state('');
	type SocialLink = { platform: string; url: string };

	const titleText = $derived(MultiLangUtils.getTextValue(config?.title, $currentLanguage) || '');
	const descriptionText = $derived(MultiLangUtils.getTextValue(config?.description, $currentLanguage) || '');
	const showPhone = $derived(config?.showPhoneField ?? config?.showPhone ?? false);
	const showSidebar = $derived(config?.showSidebar !== false);
	const sidebarTitleText = $derived(MultiLangUtils.getTextValue(config?.sidebarTitle, $currentLanguage) || '');
	const showSidebarEmail = $derived(config?.showSidebarEmail !== false);
	const showSidebarPhone = $derived(config?.showSidebarPhone !== false);
	const showSidebarAddress = $derived(config?.showSidebarAddress === true);
	const showSidebarSocial = $derived(config?.showSidebarSocial !== false);
	const enabledSocialPlatforms = $derived(buildEnabledSocialPlatforms(config));
	const sidebarEmail = $derived(
		typeof config?.sidebarEmail === 'string' && config.sidebarEmail.trim()
			? config.sidebarEmail.trim()
			: String($siteConfigData?.contact?.email || '').trim()
	);
	const sidebarPhone = $derived(
		typeof config?.sidebarPhone === 'string' && config.sidebarPhone.trim()
			? config.sidebarPhone.trim()
			: String($siteConfigData?.contact?.phone || '').trim()
	);
	const sidebarAddress = $derived(
		MultiLangUtils.getTextValue(
			config?.sidebarAddress ?? $siteConfigData?.contact?.address,
			$currentLanguage
		).trim()
	);

	const submitLabel = $derived(MultiLangUtils.getTextValue(config?.submitLabel, $currentLanguage) || 'Send Message');
	const nameLabel = $derived(MultiLangUtils.getTextValue(config?.nameLabel, $currentLanguage) || 'Name');
	const emailLabel = $derived(MultiLangUtils.getTextValue(config?.emailLabel, $currentLanguage) || 'Email');
	const phoneLabel = $derived(MultiLangUtils.getTextValue(config?.phoneLabel, $currentLanguage) || 'Phone');
	const messageLabel = $derived(MultiLangUtils.getTextValue(config?.messageLabel, $currentLanguage) || 'Message');

	const namePlaceholder = $derived(
		MultiLangUtils.getTextValue(config?.namePlaceholder, $currentLanguage) || 'Your full name'
	);
	const emailPlaceholder = $derived(
		MultiLangUtils.getTextValue(config?.emailPlaceholder, $currentLanguage) || 'you@example.com'
	);
	const phonePlaceholder = $derived(
		MultiLangUtils.getTextValue(config?.phonePlaceholder, $currentLanguage) || '+1 555 000 0000'
	);
	const messagePlaceholder = $derived(
		MultiLangUtils.getTextValue(config?.messagePlaceholder, $currentLanguage) || 'How can we help?'
	);
	const successMessage = $derived(
		MultiLangUtils.getTextValue(config?.successMessage, $currentLanguage) || 'Message sent.'
	);
	const errorMessage = $derived(
		MultiLangUtils.getTextValue(config?.errorMessage, $currentLanguage) ||
			'Unable to send your message. Please try again.'
	);
	const sidebarSocialLinks = $derived(
		normalizeSocialLinks(config, $siteConfigData?.contact?.socialMedia, enabledSocialPlatforms)
	);
	const hasSidebarContent = $derived(
		(showSidebarEmail && !!sidebarEmail) ||
			(showSidebarPhone && !!sidebarPhone) ||
			(showSidebarAddress && !!sidebarAddress) ||
			(showSidebarSocial && sidebarSocialLinks.length > 0)
	);

	function normalizeSocialLinks(
		cfg: ContactFormConfig,
		siteSocial: Record<string, string | undefined> | undefined,
		enabledPlatforms: Set<string>,
	): SocialLink[] {
		if (Array.isArray(cfg?.socialLinks) && cfg.socialLinks.length > 0) {
			return cfg.socialLinks
				.map((it) => ({
					platform: String(it?.platform || '').trim(),
					url: String(it?.url || '').trim(),
				}))
				.filter((it) => it.platform && it.url)
				.filter((it) => isPlatformEnabled(it.platform, enabledPlatforms));
		}
		if (Array.isArray(cfg?.links) && cfg.links.length > 0) {
			return cfg.links
				.map((it) => ({
					platform: String(it?.platform || '').trim(),
					url: String(it?.url || '').trim(),
				}))
				.filter((it) => it.platform && it.url)
				.filter((it) => isPlatformEnabled(it.platform, enabledPlatforms));
		}
		if (typeof cfg?.linksJson === 'string' && cfg.linksJson.trim()) {
			try {
				const parsed = JSON.parse(cfg.linksJson);
				if (Array.isArray(parsed)) {
					return parsed
						.map((it) => ({
							platform: String(it?.platform || it?.key || '').trim(),
							url: String(it?.url || it?.href || '').trim(),
						}))
						.filter((it) => it.platform && it.url)
						.filter((it) => isPlatformEnabled(it.platform, enabledPlatforms));
				}
			} catch {
				// Ignore malformed JSON and fallback to site config
			}
		}
		if (!siteSocial) return [];
		return Object.entries(siteSocial)
			.map(([platform, url]) => ({ platform: String(platform || '').trim(), url: String(url || '').trim() }))
			.filter((it) => it.platform && it.url)
			.filter((it) => isPlatformEnabled(it.platform, enabledPlatforms));
	}

	function normalizePlatformKey(platform: string): string {
		const p = String(platform || '').trim().toLowerCase();
		if (p === 'x' || p === 'twitter' || p === 'x-twitter') return 'twitter';
		if (p === 'linkedin') return 'linkedin';
		if (p === 'youtube') return 'youtube';
		if (p === 'github') return 'github';
		if (p === 'facebook') return 'facebook';
		if (p === 'instagram') return 'instagram';
		if (p === 'flickr') return 'flickr';
		return p;
	}

	function buildEnabledSocialPlatforms(cfg: ContactFormConfig): Set<string> {
		const disabled = new Set<string>();
		if (cfg.showInstagram === false) disabled.add('instagram');
		if (cfg.showFlickr === false) disabled.add('flickr');
		if (cfg.showFacebook === false) disabled.add('facebook');
		if (cfg.showTwitter === false) disabled.add('twitter');
		if (cfg.showLinkedin === false) disabled.add('linkedin');
		if (cfg.showYoutube === false) disabled.add('youtube');
		if (cfg.showGithub === false) disabled.add('github');

		const known = ['instagram', 'flickr', 'facebook', 'twitter', 'linkedin', 'youtube', 'github'];
		const enabled = new Set<string>(known.filter((k) => !disabled.has(k)));
		return enabled;
	}

	function isPlatformEnabled(platform: string, enabledPlatforms: Set<string>): boolean {
		const key = normalizePlatformKey(platform);
		// Unknown/custom platforms are allowed by default.
		if (!['instagram', 'flickr', 'facebook', 'twitter', 'linkedin', 'youtube', 'github'].includes(key)) {
			return true;
		}
		return enabledPlatforms.has(key);
	}

	function socialLabel(platform: string): string {
		const p = String(platform || '').trim();
		if (!p) return '';
		return p.charAt(0).toUpperCase() + p.slice(1);
	}

	function resetState() {
		success = '';
		error = '';
	}

	function validate(): boolean {
		if (!name.trim() || !email.trim() || !message.trim()) {
			error = 'Please fill all required fields.';
			return false;
		}
		return true;
	}

	async function postToDatabase() {
		const response = await fetch('/api/contact-submissions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: name.trim(),
				email: email.trim(),
				phone: showPhone ? phone.trim() : undefined,
				message: message.trim(),
				pageAlias: '',
				sourceUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
			}),
		});
		if (!response.ok) {
			throw new Error(`API returned ${response.status}`);
		}
		success = successMessage;
		name = '';
		email = '';
		phone = '';
		message = '';
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		resetState();
		if (!validate()) return;

		busy = true;
		try {
			await postToDatabase();
		} catch {
			error = errorMessage;
		} finally {
			busy = false;
		}
	}
</script>

<section class="pb-contactForm">
	{#if titleText}
		<h2 class="pb-contactForm__title">{titleText}</h2>
	{/if}
	{#if descriptionText}
		<p class="pb-contactForm__description">{descriptionText}</p>
	{/if}

	<div class="pb-contactForm__grid {showSidebar && hasSidebarContent ? '' : 'pb-contactForm__grid--single'}">
		{#if showSidebar && hasSidebarContent}
			<aside class="pb-contactForm__sidebar">
				{#if sidebarTitleText}
					<div class="pb-contactForm__sidebarTitle">{sidebarTitleText}</div>
				{/if}
				{#if showSidebarEmail && sidebarEmail}
					<a href={`mailto:${sidebarEmail}`} class="pb-contactForm__sidebarLink">✉ {sidebarEmail}</a>
				{/if}
				{#if showSidebarPhone && sidebarPhone}
					<a href={`tel:${sidebarPhone}`} class="pb-contactForm__sidebarLink">☎ {sidebarPhone}</a>
				{/if}
				{#if showSidebarAddress && sidebarAddress}
					<div class="pb-contactForm__sidebarAddress">⌂ {sidebarAddress}</div>
				{/if}
				{#if showSidebarSocial && sidebarSocialLinks.length > 0}
					{#each sidebarSocialLinks as item}
						<a href={item.url} class="pb-contactForm__sidebarLink" target="_blank" rel="noreferrer noopener">
							↗ {socialLabel(item.platform)}
						</a>
					{/each}
				{/if}
			</aside>
		{/if}

		<form class="pb-contactForm__form" onsubmit={handleSubmit}>
			<label class="pb-contactForm__field">
				<span>{nameLabel}</span>
				<input bind:value={name} required placeholder={namePlaceholder} />
			</label>

			<label class="pb-contactForm__field">
				<span>{emailLabel}</span>
				<input bind:value={email} required type="email" placeholder={emailPlaceholder} />
			</label>

			{#if showPhone}
				<label class="pb-contactForm__field">
					<span>{phoneLabel}</span>
					<input bind:value={phone} type="tel" placeholder={phonePlaceholder} />
				</label>
			{/if}

			<label class="pb-contactForm__field">
				<span>{messageLabel}</span>
				<textarea bind:value={message} required rows={6} placeholder={messagePlaceholder}></textarea>
			</label>

			<button type="submit" class="pb-contactForm__submit" disabled={busy}>
				{busy ? 'Sending...' : submitLabel}
			</button>
		</form>
	</div>

	{#if success}
		<p class="pb-contactForm__success">{success}</p>
	{/if}
	{#if error}
		<p class="pb-contactForm__error">{error}</p>
	{/if}
</section>
