<script lang="ts">
	import Layout from './ContactForm/Layout.svelte';

	type ContactFormProps = {
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

	type LegacyContactFormProps = { config?: ContactFormProps } & ContactFormProps;

	let {
		title = undefined,
		description = undefined,
		showSidebar = true,
		sidebarTitle = undefined,
		showSidebarEmail = true,
		sidebarEmail = undefined,
		showSidebarPhone = true,
		sidebarPhone = undefined,
		showSidebarAddress = false,
		sidebarAddress = undefined,
		showSidebarSocial = true,
		showInstagram = true,
		showFlickr = true,
		showFacebook = true,
		showTwitter = true,
		showLinkedin = true,
		showYoutube = true,
		showGithub = true,
		socialLinks = undefined,
		links = undefined,
		linksJson = undefined,
		showPhoneField = false,
		showPhone = false,
		submitLabel = undefined,
		props,
		...rest
	}: {
		title?: ContactFormProps['title'];
		description?: ContactFormProps['description'];
		showSidebar?: ContactFormProps['showSidebar'];
		sidebarTitle?: ContactFormProps['sidebarTitle'];
		showSidebarEmail?: ContactFormProps['showSidebarEmail'];
		sidebarEmail?: ContactFormProps['sidebarEmail'];
		showSidebarPhone?: ContactFormProps['showSidebarPhone'];
		sidebarPhone?: ContactFormProps['sidebarPhone'];
		showSidebarAddress?: ContactFormProps['showSidebarAddress'];
		sidebarAddress?: ContactFormProps['sidebarAddress'];
		showSidebarSocial?: ContactFormProps['showSidebarSocial'];
		showInstagram?: ContactFormProps['showInstagram'];
		showFlickr?: ContactFormProps['showFlickr'];
		showFacebook?: ContactFormProps['showFacebook'];
		showTwitter?: ContactFormProps['showTwitter'];
		showLinkedin?: ContactFormProps['showLinkedin'];
		showYoutube?: ContactFormProps['showYoutube'];
		showGithub?: ContactFormProps['showGithub'];
		socialLinks?: ContactFormProps['socialLinks'];
		links?: ContactFormProps['links'];
		linksJson?: ContactFormProps['linksJson'];
		showPhoneField?: ContactFormProps['showPhoneField'];
		showPhone?: ContactFormProps['showPhone'];
		submitLabel?: ContactFormProps['submitLabel'];
		props?: LegacyContactFormProps;
		[key: string]: unknown;
	} = $props();

	const config = $derived(
		(props?.config ??
			(props && typeof props === 'object' ? props : undefined) ?? {
				title,
				description,
				showSidebar,
				sidebarTitle,
				showSidebarEmail,
				sidebarEmail,
				showSidebarPhone,
				sidebarPhone,
				showSidebarAddress,
				sidebarAddress,
				showSidebarSocial,
				showInstagram,
				showFlickr,
				showFacebook,
				showTwitter,
				showLinkedin,
				showYoutube,
				showGithub,
				socialLinks,
				links,
				linksJson,
				showPhoneField,
				showPhone,
				submitLabel,
				...rest
			}) satisfies ContactFormProps
	);
</script>

<Layout config={config} />
