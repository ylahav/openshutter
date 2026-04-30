<script lang="ts">
	import type { PageData } from './$types';
	import AdminCard from '$lib/components/admin/AdminCard.svelte';
	import { productName } from '$stores/siteConfig';
	import { t } from '$stores/i18n';

	export const data: PageData = undefined as any; // From +layout.server.ts, not used in this component
</script>

<svelte:head>
	<title>{$t('admin.adminPanel')} - {$productName}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-(--color-surface-950-50)">{$t('admin.adminPanel')}</h1>
			<p class="text-(--color-surface-600-400) mt-2">{$t('admin.manageGallerySettings')}</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- Site Configuration -->
			<AdminCard>
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-[color-mix(in_oklab,var(--color-primary-500)_22%,transparent)] rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-(--color-primary-600)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.siteConfiguration')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.configureGallery')}</p>
				<a
					href="/admin/site-config"
					class="inline-flex items-center px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500) focus:ring-offset-2"
				>
					{$t('admin.configureSite')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Translation Management -->
			<AdminCard>
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.translationManagement')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.manageTranslationsDescription')}</p>
				<a
					href="/admin/translations"
					class="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
				>
					{$t('admin.manageTranslations')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Storage Management -->
			<AdminCard>
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
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.storageManagement')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.configureStorage')}</p>
				<a
					href="/admin/storage"
					class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
				>
					{$t('admin.manageStorage')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Themes -->
			<AdminCard>
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
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.templateManagement')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.templateManagementDescription')}</p>
				<div class="space-y-3">
					<a
						href="/admin/templates"
						class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
					>
						{$t('admin.manageTemplates')}
						<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</a>
				</div>
			</AdminCard>

			<!-- Albums Management -->
			<AdminCard>
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
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.albumsManagement')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.createEditAlbums')}</p>
				<a
					href="/admin/albums"
					class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
				>
					{$t('admin.manageAlbums')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- People Management -->
			<AdminCard>
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.peopleManagement')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.managePeopleStructuredData')}</p>
				<a
					href="/admin/people"
					class="inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
				>
					{$t('admin.managePeople')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Tags Management -->
			<AdminCard>
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.tagsManagement')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.manageTagsStructuredData')}</p>
				<a
					href="/admin/tags"
					class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
				>
					{$t('admin.manageTags')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Location Management -->
			<AdminCard>
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.locationsManagement')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.manageLocationsStructuredData')}</p>
				<a
					href="/admin/locations"
					class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
				>
					{$t('admin.manageLocations')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Users Management -->
			<AdminCard>
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
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.usersManagement')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.manageUsersRoles')}</p>
				<a
					href="/admin/users"
					class="inline-flex items-center px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
				>
					{$t('admin.manageUsers')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Groups Management -->
			<AdminCard>
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
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.groupsManagement')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.defineUserGroups')}</p>
				<a
					href="/admin/groups"
					class="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
				>
					{$t('admin.manageGroups')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Pages Management -->
			<AdminCard>
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-[color-mix(in_oklab,var(--color-primary-500)_22%,transparent)] rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-(--color-primary-600)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.pagesManagement')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.pagesManagementDescription')}</p>
				<a
					href="/admin/pages"
					class="inline-flex items-center px-4 py-2 bg-(--color-primary-600) text-white rounded-md hover:bg-(--color-primary-700) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500) focus:ring-offset-2"
				>
					{$t('admin.managePages')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Contact Form Submissions -->
			<AdminCard>
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 8l-9 6-9-6m18 8H3a2 2 0 01-2-2V8a2 2 0 012-2h18a2 2 0 012 2v6a2 2 0 01-2 2z" />
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">Contact Submissions</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">Review messages sent from the contact form.</p>
				<a
					href="/admin/contact-submissions"
					class="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
				>
					View Submissions
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Blog management (categories + articles) -->
			<AdminCard>
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2zM7 7h.01M7 3h5v4H7V3z"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.blogWorkspaceTitle')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.blogWorkspaceSubtitle')}</p>
				<a
					href="/admin/blogs"
					class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
				>
					{$t('admin.goToBlogWorkspace')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Backup & Restore -->
			<AdminCard>
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.backupRestore')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.backupRestoreDescription')}</p>
				<a
					href="/admin/backup-restore"
					class="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
				>
					{$t('admin.manageBackup')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Import & Export (Migration) -->
			<AdminCard>
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.importSync')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.importSyncDescription')}</p>
				<a
					href="/admin/import-sync"
					class="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
				>
					{$t('admin.manageImport')}
					<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Marketplace -->
			<AdminCard>
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.marketplace')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.marketplaceDescription')}</p>
				<a
					href="/admin/marketplace"
					class="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
				>
					{$t('admin.manageMarketplace')}
					<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- Analytics -->
			<AdminCard>
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
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.analytics')}</h2>
				</div>
				<p class="text-(--color-surface-600-400) mb-4">{$t('admin.viewStatistics')}</p>
				<a
					href="/admin/analytics"
					class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
				>
					{$t('admin.viewAnalytics')}
					<svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

			<!-- UI component docs (developer reference) -->
			<AdminCard>
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-(--color-surface-950-50) ml-3">{$t('admin.uiDocsTitle')}</h2>
				</div>
				<div
					class="text-(--color-surface-600-400) mb-4 text-sm leading-relaxed [&_strong]:font-semibold [&_strong]:text-(--color-surface-800-200) [&_code]:font-mono [&_code]:text-xs [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-(--color-surface-800-200) [&_code]:bg-[color-mix(in_oklab,var(--color-surface-950)_8%,transparent)] dark:[&_code]:bg-[color-mix(in_oklab,var(--color-surface-50)_12%,transparent)]"
				>
					{@html $t('admin.uiDocsDescription')}
				</div>
				<a
					href="/admin/docs/ui"
					class="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
				>
					{$t('admin.openUiDocs')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</AdminCard>

		</div>
	</div>
</div>

<style>
	:global([dir='rtl'] .rtl-flip) {
		transform: scaleX(-1);
	}
</style>
