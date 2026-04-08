<script lang="ts">

	import { onMount } from 'svelte';

	import { page } from '$app/stores';

	import { activeTemplate } from '$stores/template';

	import { auth, loadSession } from '$lib/stores/auth';

	import { logger } from '$lib/utils/logger';

	import ForcePasswordChangeModal from '$lib/components/ForcePasswordChangeModal.svelte';

	import { getTemplatePack } from '$lib/template-packs/registry';

	import { siteConfigData } from '$stores/siteConfig';

	import { currentLanguage } from '$stores/language';

	import { getProductName } from '$lib/utils/productName';



	let email = '';

	let password = '';

	let error = '';

	let loading = false;

	let showForcePasswordModal = false;

	let pendingRedirectPath = '';



	$: redirectTo = $page.url.searchParams.get('redirect') || '/admin';

	$: pack = getTemplatePack($activeTemplate);

	$: templateName = pack.name;

	$: loginBrandName = getProductName($siteConfigData ?? null, $currentLanguage);



	$: compactLoginChrome = templateName === 'noir' || templateName === 'atelier';



	onMount(() => {

		loadSession();

	});



	async function handleSubmit(e?: Event) {

		if (e) {

			e.preventDefault();

			e.stopPropagation();

		}



		if (!email || !password) {

			error = 'Please enter both email and password';

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

				error = data.error || 'Login failed';

				loading = false;

				return;

			}



			auth.set({

				authenticated: true,

				user: data.user

			});



			const redirectPath =

				data.user?.role === 'admin'

					? redirectTo.startsWith('/admin')

						? redirectTo

						: '/admin'

					: data.user?.role === 'owner'

						? redirectTo.startsWith('/owner')

							? redirectTo

							: '/owner'

						: data.user?.role === 'guest'

							? redirectTo.startsWith('/member')

								? redirectTo

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

			error = 'Login failed. Please try again.';

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



<main

	class={`w-full min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${

		templateName === 'noir'

			? 'bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)] cursor-crosshair'

			: 'bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)]'

	}`}

>

	<div class={`${templateName === 'atelier' ? 'max-w-[320px]' : 'max-w-md'} w-full space-y-8`}>

		{#if templateName === 'noir'}

			<div class="text-center mb-2 [font-family:var(--os-font-body)]">

				<p class="text-[13px] uppercase tracking-[0.22em] text-[color:var(--tp-fg)]">{loginBrandName}</p>

				<div class="w-px h-8 mx-auto my-4 bg-[color:var(--tp-fg-muted)]" aria-hidden="true"></div>

				<p class="text-[9px] uppercase tracking-[0.28em] text-[color:var(--tp-fg-subtle)]">sign in</p>

			</div>

		{:else if templateName === 'atelier'}

			<div class="text-center mb-10 [font-family:var(--os-font-body)]">

				<a

					href="/"

					class="block text-[22px] tracking-[0.12em] text-[color:var(--tp-fg)] no-underline [font-family:var(--os-font-heading)] font-normal"

				>

					{loginBrandName}

				</a>

				<div class="w-px h-8 mx-auto my-3.5 bg-[color:var(--tp-fg-muted)]" aria-hidden="true"></div>

				<p class="text-[9px] uppercase tracking-[0.28em] text-[color:var(--tp-fg-muted)]">sign in</p>

			</div>

		{/if}

		<div>

			<h2

				class={`mt-6 text-center ${

					templateName === 'noir' || templateName === 'atelier'

						? 'sr-only'

						: templateName === 'studio'

							? 'text-3xl font-bold tracking-tight text-[color:var(--tp-fg)] [font-family:var(--os-font-heading)]'

							: 'text-3xl font-light tracking-[0.06em] text-[color:var(--tp-fg)] [font-family:var(--os-font-heading)]'

				}`}

			>

				Sign in to your account

			</h2>

			<p

				class={`mt-2 text-center text-sm ${

					compactLoginChrome

						? 'sr-only'

						: 'text-[color:var(--tp-fg-muted)]'

				}`}

			>

				{#if redirectTo.startsWith('/admin')}

					Admin access required

				{:else}

					Access your gallery

				{/if}

			</p>

		</div>



		<form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>

			{#if error}

				<div

					class={`px-4 py-3 text-sm text-center ${

						templateName === 'atelier' ? 'text-[#a0522d]' : 'border border-red-900/50 bg-red-950/40 text-red-300'

					}`}

				>

					{error}

				</div>

			{/if}



			<div class="rounded-md shadow-sm space-y-4">

				<div>

					<label

						for="email"

						class={templateName === 'atelier'

							? 'block text-[9px] uppercase tracking-[0.22em] mb-2 text-[color:var(--tp-fg-muted)]'

							: 'sr-only'}

					>

						Email address

					</label>

					<input

						id="email"

						name="email"

						type="email"

						autocomplete="email"

						required

						bind:value={email}

						class={`appearance-none relative block w-full placeholder-[color:var(--tp-fg-muted)] placeholder:opacity-60 focus:outline-none sm:text-sm ${

							templateName === 'noir'

								? 'px-3 py-2 border border-[color:var(--tp-border)] bg-[color:var(--tp-surface-1)] text-[color:var(--tp-fg)] focus:ring-1 focus:ring-[color:var(--tp-fg-muted)] [font-family:var(--os-font-form-inputs)]'

								: templateName === 'atelier'

									? 'px-0 py-2 border-0 border-b border-[color:var(--tp-border)] rounded-none bg-transparent text-[color:var(--tp-fg)] focus:border-[color:var(--os-primary)] focus:ring-0 [font-family:var(--os-font-form-inputs)]'

									: 'px-3 py-2 rounded-lg border border-[color:var(--tp-border)] bg-[color:var(--tp-surface-1)] text-[color:var(--tp-fg)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--os-primary)_35%,transparent)] [font-family:var(--os-font-form-inputs)]'

						}`}

						placeholder="Email address"

					/>

				</div>

				<div>

					<label

						for="password"

						class={templateName === 'atelier'

							? 'block text-[9px] uppercase tracking-[0.22em] mb-2 text-[color:var(--tp-fg-muted)]'

							: 'sr-only'}

					>

						Password

					</label>

					<input

						id="password"

						name="password"

						type="password"

						autocomplete="current-password"

						required

						bind:value={password}

						class={`appearance-none relative block w-full placeholder-[color:var(--tp-fg-muted)] placeholder:opacity-60 focus:outline-none sm:text-sm ${

							templateName === 'noir'

								? 'px-3 py-2 border border-[color:var(--tp-border)] bg-[color:var(--tp-surface-1)] text-[color:var(--tp-fg)] focus:ring-1 focus:ring-[color:var(--tp-fg-muted)] [font-family:var(--os-font-form-inputs)]'

								: templateName === 'atelier'

									? 'px-0 py-2 border-0 border-b border-[color:var(--tp-border)] rounded-none bg-transparent text-[color:var(--tp-fg)] focus:border-[color:var(--os-primary)] focus:ring-0 [font-family:var(--os-font-form-inputs)]'

									: 'px-3 py-2 rounded-lg border border-[color:var(--tp-border)] bg-[color:var(--tp-surface-1)] text-[color:var(--tp-fg)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--os-primary)_35%,transparent)] [font-family:var(--os-font-form-inputs)]'

						}`}

						placeholder="Password"

					/>

				</div>

			</div>



			<div>

				<button

					type="submit"

					disabled={loading}

					class={`group relative w-full flex justify-center border focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${

						templateName === 'noir' || templateName === 'atelier'

							? 'py-3 px-4 border-transparent text-sm font-medium uppercase tracking-[0.15em] bg-[color:var(--tp-fg)] text-[color:var(--tp-canvas)] hover:opacity-90 focus:ring-2 focus:ring-[color:var(--tp-fg-muted)] [font-family:var(--os-font-body)]'

							: templateName === 'studio'

								? 'py-2.5 px-4 border-transparent text-sm font-medium rounded-lg bg-[color:var(--os-primary)] text-white hover:opacity-90 focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--os-primary)_45%,transparent)] [font-family:var(--os-font-body)]'

								: 'py-3 px-4 rounded-md border border-[color:var(--tp-fg-muted)] text-sm font-medium text-[10px] uppercase tracking-[0.22em] bg-transparent text-[color:var(--tp-fg-muted)] hover:bg-[color:var(--tp-fg)] hover:text-[color:var(--tp-canvas)] hover:border-[color:var(--tp-fg)] [font-family:var(--os-font-body)]'

					}`}

				>

					{#if loading}

						<span>Signing in...</span>

					{:else}

						Sign in

					{/if}

				</button>

			</div>

		</form>

		{#if templateName === 'atelier'}

			<a

				href="/"

				class="block text-center mt-7 text-[9px] uppercase tracking-[0.18em] no-underline text-[color:var(--tp-fg-muted)] hover:text-[color:var(--tp-fg)] transition-colors"

			>

				← return to site

			</a>

		{/if}

	</div>

</main>



{#if showForcePasswordModal}

	<ForcePasswordChangeModal onSuccess={onPasswordChanged} />

{/if}


