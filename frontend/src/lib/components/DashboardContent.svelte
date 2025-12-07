<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="min-h-screen bg-gray-50">
	<main class="flex-1 py-8">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<!-- Welcome Section -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900">Welcome to OpenShutter Admin</h1>
				<p class="mt-2 text-gray-600">
					Manage your photo gallery, storage providers, and system settings.
				</p>
			</div>

			<!-- Quick Stats -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<div class="card">
					<div class="card-body text-center">
						<div class="text-2xl font-bold text-primary-600">1,247</div>
						<div class="text-sm text-gray-600">Total Photos</div>
					</div>
				</div>
				<div class="card">
					<div class="card-body text-center">
						<div class="text-2xl font-bold text-green-600">23</div>
						<div class="text-sm text-gray-600">Albums</div>
					</div>
				</div>
				<div class="card">
					<div class="card-body text-center">
						<div class="text-2xl font-bold text-blue-600">2.1 GB</div>
						<div class="text-sm text-gray-600">Storage Used</div>
					</div>
				</div>
				<div class="card">
					<div class="card-body text-center">
						<div class="text-2xl font-bold text-purple-600">156</div>
						<div class="text-sm text-gray-600">Tags</div>
					</div>
				</div>
			</div>

			<!-- Administrative Actions -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
				<div class="card">
					<div class="card-body">
						<div class="flex items-center mb-4">
							<div class="p-2 bg-blue-100 rounded-lg">
								<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
									/>
								</svg>
							</div>
							<h3 class="ml-3 text-lg font-medium text-gray-900">Upload Photos</h3>
						</div>
						<p class="text-gray-600 mb-4">
							Upload new photos to your gallery with drag and drop support.
						</p>
						<a href="/admin/photos/upload" class="btn-primary w-full block text-center">
							Upload Photos
						</a>
					</div>
				</div>

				<div class="card">
					<div class="card-body">
						<div class="flex items-center mb-4">
							<div class="p-2 bg-green-100 rounded-lg">
								<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
									/>
								</svg>
							</div>
							<h3 class="ml-3 text-lg font-medium text-gray-900">Create Album</h3>
						</div>
						<p class="text-gray-600 mb-4">
							Organize your photos into beautiful albums and collections.
						</p>
						<div class="space-y-2">
							<a href="/albums/new" class="btn-primary w-full block text-center">
								Create Album
							</a>
							<a href="/admin/albums" class="btn-secondary w-full block text-center">
								Manage Albums
							</a>
						</div>
					</div>
				</div>

				<div class="card">
					<div class="card-body">
						<div class="flex items-center mb-4">
							<div class="p-2 bg-purple-100 rounded-lg">
								<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
									/>
								</svg>
							</div>
							<h3 class="ml-3 text-lg font-medium text-gray-900">Storage Settings</h3>
						</div>
						<p class="text-gray-600 mb-4">
							Configure Google Drive, AWS S3, and local storage providers.
						</p>
						<a href="/admin/storage" class="btn-primary w-full block text-center">
							Configure Storage
						</a>
					</div>
				</div>

				<div class="card">
					<div class="card-body">
						<div class="flex items-center mb-4">
							<div class="p-2 bg-yellow-100 rounded-lg">
								<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
									/>
								</svg>
							</div>
							<h3 class="ml-3 text-lg font-medium text-gray-900">System Settings</h3>
						</div>
						<p class="text-gray-600 mb-4">
							Configure application settings, user management, and security.
						</p>
						<a href="/admin/site-config" class="btn-secondary w-full block text-center">
							Configure System
						</a>
					</div>
				</div>

				<div class="card">
					<div class="card-body">
						<div class="flex items-center mb-4">
							<div class="p-2 bg-red-100 rounded-lg">
								<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
							</div>
							<h3 class="ml-3 text-lg font-medium text-gray-900">Analytics</h3>
						</div>
						<p class="text-gray-600 mb-4">
							View detailed analytics and usage statistics for your gallery.
						</p>
						<a href="/admin/analytics" class="btn-secondary w-full block text-center">
							View Analytics
						</a>
					</div>
				</div>

				<div class="card">
					<div class="card-body">
						<div class="flex items-center mb-4">
							<div class="p-2 bg-indigo-100 rounded-lg">
								<svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
									/>
								</svg>
							</div>
							<h3 class="ml-3 text-lg font-medium text-gray-900">Share Gallery</h3>
						</div>
						<p class="text-gray-600 mb-4">
							Share your gallery with others and manage access permissions.
						</p>
						<button
							on:click={() => alert('Share functionality coming soon')}
							class="btn-secondary w-full"
							type="button"
						>
							Share Gallery
						</button>
					</div>
				</div>
			</div>

			<!-- Recent Activity -->
			<div class="card">
				<div class="card-body">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
					<div class="space-y-4">
						<div class="flex items-center space-x-3">
							<div class="w-2 h-2 bg-green-400 rounded-full"></div>
							<span class="text-sm text-gray-600">Photo uploaded: sunset.jpg</span>
							<span class="text-xs text-gray-400">2 minutes ago</span>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-2 h-2 bg-blue-400 rounded-full"></div>
							<span class="text-sm text-gray-600">Album created: Vacation 2024</span>
							<span class="text-xs text-gray-400">1 hour ago</span>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-2 h-2 bg-yellow-400 rounded-full"></div>
							<span class="text-sm text-gray-600">Storage quota warning: 85% used</span>
							<span class="text-xs text-gray-400">3 hours ago</span>
						</div>
						<div class="flex items-center space-x-3">
							<div class="w-2 h-2 bg-purple-400 rounded-full"></div>
							<span class="text-sm text-gray-600">New user registered: john@example.com</span>
							<span class="text-xs text-gray-400">1 day ago</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</main>
</div>
