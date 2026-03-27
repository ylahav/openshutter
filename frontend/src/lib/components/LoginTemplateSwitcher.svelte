<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { activeTemplate } from '$stores/template';
	import { auth, loadSession } from '$lib/stores/auth';
	import { logger } from '$lib/utils/logger';
	import ForcePasswordChangeModal from '$lib/components/ForcePasswordChangeModal.svelte';
	import { getTemplatePack } from '$lib/template-packs/registry';

	let email = '';
	let password = '';
	let error = '';
	let loading = false;
	let showForcePasswordModal = false;
	let pendingRedirectPath = '';

	$: redirectTo = $page.url.searchParams.get('redirect') || '/admin';
	$: pack = getTemplatePack($activeTemplate);
	$: templateName = pack.name === 'default' ? 'minimal' : pack.name;

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
		templateName === 'minimal'
			? 'bg-white'
			: templateName === 'elegant'
				? 'bg-linear-to-b from-purple-50 via-indigo-50 to-white'
				: templateName === 'modern'
					? 'bg-linear-to-b from-slate-50 via-blue-50 to-indigo-50'
					: 'bg-gray-50'
	}`}
>
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2
				class={`mt-6 text-center ${
					templateName === 'minimal'
						? 'text-3xl font-light text-black tracking-tight'
						: templateName === 'elegant'
							? 'text-4xl font-serif text-gray-900 tracking-wide'
							: 'text-3xl font-extrabold text-gray-900'
				}`}
			>
				Sign in to your account
			</h2>
			<p
				class={`mt-2 text-center text-sm ${
					templateName === 'minimal' ? 'text-gray-700' : 'text-gray-600'
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
					class={`px-4 py-3 text-sm ${
						templateName === 'minimal'
							? 'border border-black bg-white text-black'
							: templateName === 'elegant'
								? 'rounded-xl bg-red-50 border border-red-200 text-red-700'
								: 'bg-red-50 border border-red-200 text-red-700 rounded'
					}`}
				>
					{error}
				</div>
			{/if}

			<div class={templateName === 'minimal' ? 'space-y-4' : 'rounded-md shadow-sm space-y-4'}>
				<div>
					<label for="email" class="sr-only">Email address</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						bind:value={email}
						class={`appearance-none relative block w-full px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm ${
							templateName === 'minimal'
								? 'border border-black text-black bg-white focus:ring-0 focus:border-black'
								: templateName === 'elegant'
									? 'border border-purple-200 rounded-xl text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
									: 'rounded-md border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
						}`}
						placeholder="Email address"
					/>
				</div>
				<div>
					<label for="password" class="sr-only">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
						bind:value={password}
						class={`appearance-none relative block w-full px-3 py-2 placeholder-gray-500 focus:outline-none sm:text-sm ${
							templateName === 'minimal'
								? 'border border-black text-black bg-white focus:ring-0 focus:border-black'
								: templateName === 'elegant'
									? 'border border-purple-200 rounded-xl text-gray-900 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500'
									: 'rounded-md border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
						}`}
						placeholder="Password"
					/>
				</div>
			</div>

			<div>
				<button
					type="submit"
					disabled={loading}
					class={`group relative w-full flex justify-center py-2 px-4 border text-sm rounded-md focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
						templateName === 'minimal'
							? 'border-black font-normal text-black bg-white hover:bg-black hover:text-white'
							: templateName === 'elegant'
								? 'border-transparent font-medium text-white bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-lg rounded-xl py-3'
								: 'border-transparent font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
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
	</div>
</main>

{#if showForcePasswordModal}
	<ForcePasswordChangeModal onSuccess={onPasswordChanged} />
{/if}

