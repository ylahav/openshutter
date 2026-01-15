<script lang="ts">
	import { onMount } from 'svelte';

	let albums: any[] = [];
	let loading = true;

	onMount(async () => {
		try {
			// Fetch featured albums for the demo gallery section
			const response = await fetch('/api/albums/hierarchy?includePrivate=false');
			if (response.ok) {
				const result = await response.json();
				const albumsData = result.success ? result.data : (result.data || result);
				if (Array.isArray(albumsData)) {
					// Flatten the hierarchy and get featured/public albums
					const flattenAlbums = (albums: any[]): any[] => {
						let result: any[] = [];
						for (const album of albums) {
							if (album.isPublic || album.isFeatured) {
								result.push(album);
							}
							if (album.children && album.children.length > 0) {
								result = result.concat(flattenAlbums(album.children));
							}
						}
						return result;
					};
					albums = flattenAlbums(albumsData).slice(0, 6); // Show up to 6 albums
				}
			}
		} catch (err) {
			console.error('Failed to load albums:', err);
		} finally {
			loading = false;
		}
	});

	function getAlbumName(album: any): string {
		if (typeof album.name === 'string') return album.name;
		return album.name?.en || album.name?.he || '(No name)';
	}
</script>

<svelte:head>
	<title>About openShutter - Modern Photo Gallery Platform</title>
	<meta
		name="description"
		content="openShutter is a modern, elegant photo gallery platform designed to showcase visual stories with style and simplicity."
	/>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-50 to-white">
	<!-- Hero Section -->
	<section class="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
		<div class="max-w-4xl mx-auto text-center">
			<div class="mb-8">
				<div class="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-lg mb-6">
					<svg
						class="w-12 h-12 text-white"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 0 0110.07 4h3.86a2 0 011.664.89l.812 1.22A2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</div>
			</div>
			<h1 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
				About <span class="text-blue-600">openShutter</span>
			</h1>
			<p class="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
				A modern, elegant photo gallery platform designed to showcase visual stories with style and
				simplicity.
			</p>
		</div>
	</section>

	<!-- Main Description Section -->
	<section class="py-16 px-4 sm:px-6 lg:px-8 bg-white">
		<div class="max-w-4xl mx-auto">
			<div class="prose prose-lg max-w-none">
				<p class="text-lg text-gray-700 leading-relaxed mb-6">
					<strong class="text-gray-900">openShutter</strong> is a modern, elegant photo gallery platform
					designed to showcase visual stories with style and simplicity. Built for photographers,
					creatives, and visual storytellers, openShutter provides an intuitive way to organize, display,
					and share your photographic work with the world.
				</p>
				<p class="text-lg text-gray-700 leading-relaxed">
					Whether you're a professional photographer building your portfolio, a hobbyist sharing your
					passion, or a business showcasing your visual content, openShutter delivers a seamless experience
					that puts your images front and center. With intelligent categorization, responsive design, and a
					clean interface, your photos always look their absolute best.
				</p>
			</div>
		</div>
	</section>

	<!-- Key Features Section -->
	<section class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
		<div class="max-w-6xl mx-auto">
			<div class="text-center mb-16">
				<h2 class="text-4xl font-bold text-gray-900 mb-4">Key Features</h2>
				<p class="text-xl text-gray-600 max-w-2xl mx-auto">
					Our platform combines powerful functionality with effortless usability, offering features that make
					managing and presenting your photo galleries a pleasure.
				</p>
			</div>

			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
				<!-- Feature 1 -->
				<div class="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow">
					<div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
						<svg
							class="w-6 h-6 text-blue-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							/>
						</svg>
					</div>
					<h3 class="text-xl font-semibold text-gray-900 mb-3">Intuitive Organization</h3>
					<p class="text-gray-600 leading-relaxed">
						Create multi-level category hierarchies that make navigating large photo collections effortless.
						Group your work by theme, location, style, or any structure that tells your story.
					</p>
				</div>

				<!-- Feature 2 -->
				<div class="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow">
					<div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
						<svg
							class="w-6 h-6 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<h3 class="text-xl font-semibold text-gray-900 mb-3">Responsive Design</h3>
					<p class="text-gray-600 leading-relaxed">
						Your galleries look stunning on every device, from desktop monitors to mobile phones. Images
						automatically adapt to provide the best viewing experience regardless of screen size.
					</p>
				</div>

				<!-- Feature 3 -->
				<div class="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow">
					<div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
						<svg
							class="w-6 h-6 text-purple-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 10V3L4 14h7v7l9-11h-7z"
							/>
						</svg>
					</div>
					<h3 class="text-xl font-semibold text-gray-900 mb-3">Fast Performance</h3>
					<p class="text-gray-600 leading-relaxed">
						Optimized loading and smooth transitions ensure your visitors enjoy a fluid browsing experience
						without delays or interruptions.
					</p>
				</div>

				<!-- Feature 4 -->
				<div class="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow">
					<div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
						<svg
							class="w-6 h-6 text-yellow-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
							/>
						</svg>
					</div>
					<h3 class="text-xl font-semibold text-gray-900 mb-3">Clean Interface</h3>
					<p class="text-gray-600 leading-relaxed">
						A minimalist design philosophy keeps the focus on what matters most: your photography. No
						clutter, no distractions, just beautiful images presented beautifully.
					</p>
				</div>

				<!-- Feature 5 -->
				<div class="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-shadow">
					<div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
						<svg
							class="w-6 h-6 text-red-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
							/>
						</svg>
					</div>
					<h3 class="text-xl font-semibold text-gray-900 mb-3">Easy Management</h3>
					<p class="text-gray-600 leading-relaxed">
						Upload, organize, and update your galleries with straightforward tools that don't require
						technical expertise.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Our Vision Section -->
	<section class="py-20 px-4 sm:px-6 lg:px-8 bg-white">
		<div class="max-w-4xl mx-auto">
			<div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-12 shadow-lg">
				<h2 class="text-4xl font-bold text-gray-900 mb-6">Our Vision</h2>
				<p class="text-lg text-gray-700 leading-relaxed">
					At <strong class="text-gray-900">openShutter</strong>, we believe that great photography deserves a
					great presentation. We're committed to providing a platform that honors the artistry and effort
					behind every image, making it easy for creators to share their vision and for audiences to discover
					and appreciate stunning visual work.
				</p>
			</div>
		</div>
	</section>

	<!-- Demo Gallery Section -->
	<section class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
		<div class="max-w-6xl mx-auto">
			<div class="text-center mb-16">
				<h2 class="text-4xl font-bold text-gray-900 mb-4">Demo Gallery</h2>
				<p class="text-lg text-gray-600 max-w-3xl mx-auto mb-4">
					This demonstration showcases openShutter's capabilities with a curated collection of high-quality
					images across travel and lifestyle themes. Explore the categories to experience how openShutter
					organizes and presents diverse photographic content in an engaging, user-friendly way.
				</p>
				<p class="text-sm text-gray-500 max-w-2xl mx-auto">
					All demo images are sourced from talented photographers on Unsplash, Pexels, and Pixabay, used
					under their respective free licenses. We're grateful to the photography community for making their
					work available.
				</p>
			</div>

			{#if loading}
				<div class="text-center py-12">
					<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
					<p class="mt-4 text-gray-600">Loading galleries...</p>
				</div>
			{:else if albums.length > 0}
				<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
					{#each albums as album}
						<a
							href="/albums/{album.alias}"
							class="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
						>
							<div class="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
								{#if album.coverPhotoId}
									<img
										src="/api/albums/{album._id}/cover-image"
										alt={getAlbumName(album)}
										class="w-full h-full object-cover"
									/>
								{:else}
									<svg
										class="w-16 h-16 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								{/if}
							</div>
							<div class="p-6">
								<h3 class="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
									{getAlbumName(album)}
								</h3>
								{#if album.description}
									<p class="text-gray-600 text-sm line-clamp-2 mb-3">
										{typeof album.description === 'string'
											? album.description
											: album.description?.en || album.description?.he || ''}
									</p>
								{/if}
								<div class="flex items-center justify-between text-sm text-gray-500">
									<span>{album.photoCount || 0} photos</span>
									{#if album.isFeatured}
										<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
											⭐ Featured
										</span>
									{/if}
								</div>
							</div>
						</a>
					{/each}
				</div>
				<div class="text-center">
					<a
						href="/albums"
						class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
					>
						View All Albums
						<svg
							class="ml-2 w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</a>
				</div>
			{:else}
				<div class="text-center py-12 bg-white rounded-xl shadow-md">
					<p class="text-gray-600">No public albums available at the moment.</p>
					<a
						href="/albums"
						class="inline-flex items-center mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
					>
						Browse Albums
					</a>
				</div>
			{/if}
		</div>
	</section>

	<!-- Call to Action Section -->
	<section class="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-indigo-700">
		<div class="max-w-4xl mx-auto text-center">
			<h2 class="text-4xl font-bold text-white mb-6">Ready to Showcase Your Photography?</h2>
			<p class="text-xl text-blue-100 mb-8">
				Start organizing and sharing your visual stories with openShutter today.
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a
					href="/albums"
					class="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
				>
					Explore Gallery
				</a>
				<a
					href="/login"
					class="inline-flex items-center justify-center px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors font-semibold text-lg"
				>
					Get Started
				</a>
			</div>
		</div>
	</section>
</div>
