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

	export let title: ContactFormProps['title'] = undefined;
	export let description: ContactFormProps['description'] = undefined;
	export let showSidebar: NonNullable<ContactFormProps['showSidebar']> = true;
	export let sidebarTitle: ContactFormProps['sidebarTitle'] = undefined;
	export let showSidebarEmail: NonNullable<ContactFormProps['showSidebarEmail']> = true;
	export let sidebarEmail: ContactFormProps['sidebarEmail'] = undefined;
	export let showSidebarPhone: NonNullable<ContactFormProps['showSidebarPhone']> = true;
	export let sidebarPhone: ContactFormProps['sidebarPhone'] = undefined;
	export let showSidebarAddress: NonNullable<ContactFormProps['showSidebarAddress']> = false;
	export let sidebarAddress: ContactFormProps['sidebarAddress'] = undefined;
	export let showSidebarSocial: NonNullable<ContactFormProps['showSidebarSocial']> = true;
	export let showInstagram: NonNullable<ContactFormProps['showInstagram']> = true;
	export let showFlickr: NonNullable<ContactFormProps['showFlickr']> = true;
	export let showFacebook: NonNullable<ContactFormProps['showFacebook']> = true;
	export let showTwitter: NonNullable<ContactFormProps['showTwitter']> = true;
	export let showLinkedin: NonNullable<ContactFormProps['showLinkedin']> = true;
	export let showYoutube: NonNullable<ContactFormProps['showYoutube']> = true;
	export let showGithub: NonNullable<ContactFormProps['showGithub']> = true;
	export let socialLinks: ContactFormProps['socialLinks'] = undefined;
	export let links: ContactFormProps['links'] = undefined;
	export let linksJson: ContactFormProps['linksJson'] = undefined;
	export let showPhoneField: NonNullable<ContactFormProps['showPhoneField']> = false;
	export let showPhone: NonNullable<ContactFormProps['showPhone']> = false;
	export let submitLabel: ContactFormProps['submitLabel'] = undefined;

	// Legacy nested props fallback
	export let props: LegacyContactFormProps | undefined = undefined;
	$: config = (props?.config ??
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
			submitLabel
		}) satisfies ContactFormProps;
</script>

<Layout config={config} />
