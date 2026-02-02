<script lang="ts">
	import type { PageData } from './$types';
	import { logout } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	export let data: PageData;

	const isMember = data.user?.role === 'guest';
	const isAdmin = data.user?.role === 'admin';
</script>

<svelte:head>
	<title>My Account - OpenShutter</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-4xl mx-auto px-4">
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">My Account</h1>
				<p class="text-gray-600 mt-2">
					Manage your portfolio and account settings
				</p>
			</div>
			<div class="flex space-x-3">
				<a
					href="/"
					class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
						/>
					</svg>
					Home
				</a>
				<button
					on:click={async () => {
						await logout();
						goto('/');
					}}
					class="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
					Logout
				</button>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<!-- Portfolio (Profile) -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900 ml-3">Portfolio</h2>
				</div>
				<p class="text-gray-600 mb-4">Set your name, bio, and preferred language</p>
				<a
					href="/member/profile"
					class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
				>
					Edit Portfolio
					<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</a>
			</div>

			<!-- Change Password -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900 ml-3">Change Password</h2>
				</div>
				<p class="text-gray-600 mb-4">Update your password securely</p>
				<a
					href="/member/change-password"
					class="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
				>
					Change Password
					<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</a>
			</div>
		</div>

		{#if isAdmin}
			<p class="mt-6 text-sm text-gray-500">
				You are viewing the Member area as an admin. Regular members see only Portfolio and Change password.
			</p>
		{/if}
	</div>
</div>
