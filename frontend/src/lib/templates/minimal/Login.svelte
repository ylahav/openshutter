<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let formData = {
		email: '',
		password: ''
	};
	let isSubmitting = false;
	let error = '';
	let redirectUrl = $page.url.searchParams.get('redirect') || '/';

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;
		error = '';

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			if (response.ok) {
				const result = await response.json();
				const userRole = result.user?.role;
				if (userRole === 'admin') {
					goto('/admin');
				} else if (userRole === 'owner') {
					goto('/owner');
				} else {
					goto(redirectUrl);
				}
			} else {
				const result = await response.json();
				error = result.message || 'Login failed';
			}
		} catch (err) {
			console.error('Login error:', err);
			error = 'An error occurred during login';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<main class="flex-1 min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="mt-6 text-center text-3xl font-light text-black tracking-tight">Sign in to your account</h2>
		</div>
		<form class="mt-8 space-y-6" on:submit={handleSubmit}>
			{#if error}
				<div class="border border-black p-4 bg-white">
					<div class="text-sm text-black">{error}</div>
				</div>
			{/if}
			<div class="space-y-4">
				<div>
					<label for="email" class="sr-only">Email address</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						class="appearance-none relative block w-full px-3 py-2 border border-black placeholder-gray-500 text-black bg-white focus:outline-none focus:ring-0 focus:border-black sm:text-sm"
						placeholder="Email address"
						bind:value={formData.email}
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
						class="appearance-none relative block w-full px-3 py-2 border border-black placeholder-gray-500 text-black bg-white focus:outline-none focus:ring-0 focus:border-black sm:text-sm"
						placeholder="Password"
						bind:value={formData.password}
					/>
				</div>
			</div>

			<div>
				<button
					type="submit"
					disabled={isSubmitting}
					class="group relative w-full flex justify-center py-2 px-4 border border-black text-sm font-normal text-black bg-white hover:bg-black hover:text-white focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{isSubmitting ? 'Signing in...' : 'Sign in'}
				</button>
			</div>
		</form>
	</div>
</main>
