<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import { activeTemplate } from '$stores/template';
	import { auth, loadSession } from '$lib/stores/auth';
	import { logger } from '$lib/utils/logger';
	import ForcePasswordChangeModal from '$lib/components/ForcePasswordChangeModal.svelte';
	import { siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { t } from '$stores/i18n';
	import { getProductName } from '$lib/utils/productName';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { applyPackClassPrefix, packClassPrefixFor } from '$lib/template/packs/class-prefix';

	type Ml = string | Record<string, string> | undefined;

	function mlLineOrNull(src: Record<string, string>, lang: string): string | null {
		const tx = MultiLangUtils.getTextValue(src, lang)?.trim();
		return tx && tx.length > 0 ? tx : null;
	}

	function hasMeaningfulModuleTitle(moduleVal: Ml): boolean {
		if (moduleVal == null || moduleVal === '') return false;
		if (typeof moduleVal === 'string') return moduleVal.trim().length > 0;
		if (typeof moduleVal === 'object' && !Array.isArray(moduleVal)) {
			return Object.values(moduleVal as Record<string, unknown>).some(
				(x) => x != null && String(x).trim() !== ''
			);
		}
		return false;
	}

	function pickTextProp(moduleVal: Ml, pageVal: unknown): Ml {
		if (moduleVal != null && moduleVal !== '') {
			if (typeof moduleVal === 'string') {
				return moduleVal.trim() ? moduleVal : undefined;
			}
			if (typeof moduleVal === 'object' && !Array.isArray(moduleVal)) {
				const o = moduleVal as Record<string, string>;
				if (Object.keys(o).length > 0) return o;
			}
		}
		if (pageVal == null || pageVal === '') return undefined;
		if (typeof pageVal === 'string') {
			return pageVal.trim() ? pageVal : undefined;
		}
		if (typeof pageVal === 'object' && !Array.isArray(pageVal) && Object.keys(pageVal as object).length > 0) {
			return pageVal as Record<string, string>;
		}
		return undefined;
	}

	type PBLoginFormProps = {
		title?: string | Record<string, string>;
		subtitle?: string | Record<string, string>;
		subheading?: string | Record<string, string>;
		class?: string;
		className?: string;
		hideTitle?: boolean;
		data?: { page?: Record<string, unknown> };
	};

	const p = $props() as PBLoginFormProps;
	const pageDoc = $derived((p.data?.page ?? undefined) as Record<string, unknown> | undefined);
	const hideFromPage = $derived(
		pageDoc?.hideLoginTitle === true ||
			pageDoc?.hideLoginTitle === 'true' ||
			pageDoc?.hideLoginTitle === 1 ||
			pageDoc?.hideLoginTitle === '1'
	);
	/**
	 * Page `hideLoginTitle` hides the legacy page-driven heading, but the login **block** can still
	 * define its own `title` — that should show. Subtitle/tagline is outside this gate (always rendered).
	 */
	const hideTitleEffective = $derived(
		p.hideTitle === true || (hideFromPage && !hasMeaningfulModuleTitle(p.title))
	);

	const titleForSwitcher = $derived(pickTextProp(p.title, pageDoc?.title));
	const subtitleForSwitcher = $derived(
		pickTextProp(p.subtitle ?? p.subheading, pageDoc?.subtitle)
	);

	/**
	 * Root hooks on `<section class="pb-login">`: prefer `class` (theme default), then `className`.
	 * The document `<main>` is the template shell (`BodyTemplateWrapper`); do not nest a second `<main>`.
	 */
	const rootClassRaw = $derived(
		(typeof p.class === 'string' ? p.class.trim() : '') ||
			(typeof p.className === 'string' ? p.className.trim() : '') ||
			''
	);

	const loginPackPrefix = $derived(
		packClassPrefixFor(String($activeTemplate ?? ''), $siteConfigData?.template?.pageAliasPrefixes)
	);

	const mainExtraClass = $derived(
		!rootClassRaw
			? ''
			: !loginPackPrefix
				? rootClassRaw
				: applyPackClassPrefix(rootClassRaw, loginPackPrefix)
	);

	const rootClassCombined = $derived(
		['pb-login', (mainExtraClass || '').trim()].filter(Boolean).join(' ')
	);

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let showForcePasswordModal = $state(false);
	let pendingRedirectPath = $state('');

	const loginHeadingDefault = $derived($t('auth.loginHeadingDefault'));

	const loginHeadingText = $derived(
		titleForSwitcher == null || titleForSwitcher === ''
			? loginHeadingDefault
			: typeof titleForSwitcher === 'string'
				? titleForSwitcher.trim() || loginHeadingDefault
				: MultiLangUtils.getTextValue(titleForSwitcher as Record<string, string>, $currentLanguage)?.trim() ||
						loginHeadingDefault
	);

	const loginSubheadingOverride = $derived(
		subtitleForSwitcher == null || subtitleForSwitcher === ''
			? null
			: typeof subtitleForSwitcher === 'string'
				? subtitleForSwitcher.trim() === ''
					? null
					: subtitleForSwitcher.trim()
				: mlLineOrNull(subtitleForSwitcher as Record<string, string>, $currentLanguage)
	);

	const redirectParam = $derived(($page.url.searchParams.get('redirect') || '').trim());
	const loginBrandName = $derived(getProductName($siteConfigData ?? null, $currentLanguage));

	const titleClass = $derived(hideTitleEffective ? '' : 'pb-login__title');
	const taglineClass = 'pb-login__tagline';

	onMount(() => {
		loadSession();
	});

	async function handleSubmit(e?: Event) {
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		if (!email || !password) {
			error = get(t)('auth.loginEnterEmailAndPassword');
			return;
		}
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
				credentials: 'include'
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || get(t)('auth.loginFailed');
				loading = false;
				return;
			}
			auth.set({
				authenticated: true,
				user: data.user
			});
			const redirectPath =
				data.user?.role === 'admin'
					? redirectParam.startsWith('/admin')
						? redirectParam
						: '/admin'
					: data.user?.role === 'owner'
						? redirectParam.startsWith('/owner')
							? redirectParam
							: '/owner'
						: data.user?.role === 'guest'
							? redirectParam.startsWith('/member')
								? redirectParam
								: '/member'
							: '/';
			if (data.user?.forcePasswordChange) {
				showForcePasswordModal = true;
				pendingRedirectPath = redirectPath;
				loading = false;
				return;
			}
			window.location.href = redirectPath;
		} catch (err) {
			error = get(t)('auth.loginFailed');
			logger.error('Login error:', err);
		} finally {
			loading = false;
		}
	}

	function onPasswordChanged() {
		showForcePasswordModal = false;
		window.location.href = pendingRedirectPath;
	}

</script>

<section class={rootClassCombined}>
	<div class="pb-login__shell">
		<div class="pb-login__brand">
			<a href="/" class="pb-login__brand-link">{loginBrandName}</a>
			<div class="pb-login__brand-rule" aria-hidden="true"></div>
			<p class="pb-login__brand-eyebrow">{$t('auth.loginSignInEyebrow')}</p>
		</div>

		<div class="pb-login__content">
			{#if !hideTitleEffective}
				<h2 class={titleClass}>{loginHeadingText}</h2>
			{/if}
			<p class={taglineClass}>
				{#if loginSubheadingOverride}
					{loginSubheadingOverride}
				{:else if redirectParam.startsWith('/admin')}
					{$t('auth.loginTaglineAdminContext')}
				{:else}
					{$t('auth.loginTaglineVisitorDefault')}
				{/if}
			</p>

			<form class="pb-login__form" onsubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
				{#if error}
					<div class="pb-login__error">{error}</div>
				{/if}

				<div class="pb-login__stack">
					<div class="pb-login__field">
						<label for="email" class="pb-login__label">{$t('auth.emailAddress')}</label>
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							bind:value={email}
							class="pb-login__input"
							placeholder={$t('auth.emailAddress')}
						/>
					</div>
					<div class="pb-login__field">
						<label for="password" class="pb-login__label">{$t('auth.password')}</label>
						<input
							id="password"
							name="password"
							type="password"
							autocomplete="current-password"
							required
							bind:value={password}
							class="pb-login__input"
							placeholder={$t('auth.password')}
						/>
					</div>
				</div>

				<div class="pb-login__actions">
					<button type="submit" disabled={loading} class="pb-login__submit">
						{#if loading}
							<span>{$t('auth.signingIn')}</span>
						{:else}
							{$t('auth.signIn')}
						{/if}
					</button>
				</div>
			</form>

			<a href="/" class="pb-login__foot-link">{$t('auth.loginReturnToSite')}</a>
		</div>
	</div>
</section>

{#if showForcePasswordModal}
	<ForcePasswordChangeModal onSuccess={onPasswordChanged} />
{/if}
