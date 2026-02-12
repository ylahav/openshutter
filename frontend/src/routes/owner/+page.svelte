<script lang="ts">
	import type { PageData } from './$types';
	import { logout } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	export let data: PageData;

	const isAdmin = data.user?.role === 'admin';
	const isOwner = data.user?.role === 'owner';

	async function handleLogout() {
		await logout();
	}
</script>

<svelte:head>
	<title>{isAdmin ? 'Admin Panel' : 'Owner Panel'} - OpenShutter</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<!-- Navigation Buttons -->
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">
					{isAdmin ? 'Admin Panel' : 'Owner Panel'}
				</h1>
				<p class="text-gray-600 mt-2">
					{isAdmin ? 'Manage gallery settings and content' : 'Manage your albums and content'}
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
					on:click={handleLogout}
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

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- Profile Management - Only for owners -->
			{#if isOwner}
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
						<h2 class="text-xl font-semibold text-gray-900 ml-3">Profile Management</h2>
					</div>
					<p class="text-gray-600 mb-4">Edit your personal information and profile settings</p>
					<a
						href="/owner/profile"
						class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						Edit Profile
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
			{/if}

			<!-- Albums Management -->
			<div class="bg-white rounded-lg shadow-md p-6">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900 ml-3">
						{isAdmin ? 'Albums Management' : 'My Albums'}
					</h2>
				</div>
				<p class="text-gray-600 mb-4">
					{isAdmin ? 'Create and edit albums' : 'Create and edit your albums'}
				</p>
				<a
					href={isAdmin ? '/admin/albums' : '/owner/albums'}
					class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
				>
					{isAdmin ? 'Manage Albums' : 'Manage My Albums'}
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

			<!-- Blog Management - Only for owners -->
			{#if isOwner}
				<div class="bg-white rounded-lg shadow-md p-6">
					<div class="flex items-center mb-4">
						<div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
							<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
								/>
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-gray-900 ml-3">Blog Management</h2>
					</div>
					<p class="text-gray-600 mb-4">Create and edit blog articles</p>
					<a
						href="/owner/blog"
						class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
					>
						Manage Blog
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
			{/if}

			<!-- Admin-only sections -->
			{#if isAdmin}
				<!-- Site Configuration -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<div class="flex items-center mb-4">
						<div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
							<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-gray-900 ml-3">Site Configuration</h2>
					</div>
					<p class="text-gray-600 mb-4">Configure gallery settings</p>
					<a
						href="/admin/site-config"
						class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						Configure Site
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

				<!-- Storage Management -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<div class="flex items-center mb-4">
						<div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
							<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
								/>
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-gray-900 ml-3">Storage Management</h2>
					</div>
					<p class="text-gray-600 mb-4">Configure storage providers</p>
					<a
						href="/admin/storage"
						class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
					>
						Manage Storage
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

				<!-- Themes -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<div class="flex items-center mb-4">
						<div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
							<svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
								/>
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-gray-900 ml-3">Themes</h2>
					</div>
					<p class="text-gray-600 mb-4">Manage and apply themes</p>
					<a
						href="/admin/templates"
						class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					>
						Manage Themes
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

				<!-- Users Management -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<div class="flex items-center mb-4">
						<div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
							<svg class="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-gray-900 ml-3">Users Management</h2>
					</div>
					<p class="text-gray-600 mb-4">Manage users and roles</p>
					<a
						href="/admin/users"
						class="inline-flex items-center px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800"
					>
						Manage Users
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

				<!-- Groups Management -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<div class="flex items-center mb-4">
						<div class="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
							<svg class="w-6 h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 11a4 4 0 10-8 0 4 4 0 008 0z"
								/>
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-gray-900 ml-3">Groups Management</h2>
					</div>
					<p class="text-gray-600 mb-4">Define user groups</p>
					<a
						href="/admin/groups"
						class="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
					>
						Manage Groups
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

				<!-- Analytics -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<div class="flex items-center mb-4">
						<div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
							<svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
								/>
							</svg>
						</div>
						<h2 class="text-xl font-semibold text-gray-900 ml-3">Analytics</h2>
					</div>
					<p class="text-gray-600 mb-4">View statistics and insights</p>
					<a
						href="/admin/analytics"
						class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					>
						View Analytics
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
			{/if}
		</div>
	</div>
</div>
