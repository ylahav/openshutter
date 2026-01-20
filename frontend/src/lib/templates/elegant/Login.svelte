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

<main class="flex-1 min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div>
			<h2 class="mt-6 text-center text-4xl font-serif text-gray-900 tracking-wide" style="font-family: 'Playfair Display', serif;">
				Sign in to your account
			</h2>
		</div>
		<form class="mt-8 space-y-6" on:submit={handleSubmit}>
			{#if error}
				<div class="rounded-xl bg-red-50 border border-red-200 p-4">
					<div class="text-sm text-red-700 font-light">{error}</div>
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
						class="appearance-none relative block w-full px-4 py-3 border border-purple-200 rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-all duration-200"
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
						class="appearance-none relative block w-full px-4 py-3 border border-purple-200 rounded-xl placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm transition-all duration-200"
						placeholder="Password"
						bind:value={formData.password}
					/>
				</div>
			</div>

			<div>
				<button
					type="submit"
					disabled={isSubmitting}
					class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
				>
					{isSubmitting ? 'Signing in...' : 'Sign in'}
				</button>
			</div>
		</form>
	</div>
</main>
