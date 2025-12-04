<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import FaceDetectionViewer from '$lib/components/FaceDetectionViewer.svelte';
	import FaceMatchingPanel from '$lib/components/FaceMatchingPanel.svelte';
	import CollectionPopup from '$lib/components/CollectionPopup.svelte';

	interface Photo {
		_id: string;
		title?: any;
		description?: any;
		filename: string;
		storage?: {
			provider?: string;
			url?: string;
			path?: string;
			thumbnailPath?: string;
			thumbnails?: Record<string, string>;
		};
		isPublished: boolean;
		isLeading: boolean;
		isGalleryLeading: boolean;
		albumId?: string;
		tags?: string[];
		people?: string[];
		location?: string | null;
		uploadedAt?: string | Date;
		dimensions?: {
			width: number;
			height: number;
		};
		faceRecognition?: {
			faces?: Array<{
				box: { x: number; y: number; width: number; height: number };
				matchedPersonId?: string;
				confidence?: number;
			}>;
		};
	}

	interface Tag {
		_id: string;
		name: string;
	}

	interface Person {
		_id: string;
		fullName?: any;
		firstName?: any;
	}

	interface Location {
		_id: string;
		name: any;
	}

	let photoId: string = '';
	let photo: Photo | null = null;
	let loading = true;
	let saving = false;
	let error = '';
	let notification = { show: false, message: '', type: 'success' as 'success' | 'error' };
	
	let tags: Tag[] = [];
	let people: Person[] = [];
	let locations: Location[] = [];
	let loadingOptions = true;
	let loadPhotoCalled = false;
	
	// Popup states
	let showTagsPopup = false;
	let showPeoplePopup = false;
	let showLocationPopup = false;
	
	// Track the last loaded photoId to prevent reloading the same photo
	let lastLoadedPhotoId: string | null = null;
	
	// Update photoId from route params reactively
	$: {
		const id = $page.params.id || '';
		if (id && id !== photoId) {
			photoId = id;
			// Reset loading state when navigating to a new photo
			loadPhotoCalled = false;
			lastLoadedPhotoId = null; // Reset so new photo can be loaded
		}
	}
	
	// Load photo when photoId changes (for navigation between photos)
	// Only trigger once per photoId change
	$: if (browser && photoId && !loadPhotoCalled && photoId !== lastLoadedPhotoId) {
		loadPhoto().catch((err) => {
			console.error('[Reactive] loadPhoto error:', err);
			error = `Failed to load photo: ${err instanceof Error ? err.message : 'Unknown error'}`;
			loading = false;
			loadPhotoCalled = false; // Reset on error so it can retry
			lastLoadedPhotoId = null; // Reset on error
		});
	}

	let formData = {
		title: {} as Record<string, string>,
		description: {} as Record<string, string>,
		isPublished: false,
		isLeading: false,
		isGalleryLeading: false,
		tags: [] as string[],
		people: [] as string[],
		location: null as string | null,
	};

	function getPhotoUrl(photo: Photo, preferFullSize: boolean = false): string {
		if (!photo.storage) {
			return '';
		}
		
		// If we need full size (e.g., for face detection), prioritize full image paths
		if (preferFullSize) {
			// Helper function to convert thumbnail path to full image path
			const getFullImagePath = (thumbnailPath: string): string => {
				// Remove thumbnail folder structure: .../medium/medium-... or .../small/small-...
				let fullPath = thumbnailPath;
				
				// Remove /medium/medium- prefix
				fullPath = fullPath.replace(/\/medium\/medium-/, '/');
				// Remove /small/small- prefix
				fullPath = fullPath.replace(/\/small\/small-/, '/');
				// Remove /thumb/thumb- prefix
				fullPath = fullPath.replace(/\/thumb\/thumb-/, '/');
				// Remove /medium/ prefix entirely if it's just a folder
				fullPath = fullPath.replace(/\/medium\//, '/');
				// Remove /small/ prefix entirely if it's just a folder
				fullPath = fullPath.replace(/\/small\//, '/');
				// Remove /thumb/ prefix entirely if it's just a folder
				fullPath = fullPath.replace(/\/thumb\//, '/');
				
				return fullPath;
			};
			
			// First try the main path (full image)
			if (photo.storage.path) {
				const provider = photo.storage.provider || 'local';
				let cleanPath = photo.storage.path.startsWith('/') 
					? photo.storage.path.slice(1) 
					: photo.storage.path;
				
				// If it's a thumbnail path, convert to full image path
				if (cleanPath.includes('/medium/') || cleanPath.includes('/small/') || cleanPath.includes('/thumb/')) {
					cleanPath = getFullImagePath(cleanPath);
				}
				
				const constructed = `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
				return constructed;
			}
			
			// Try url (full image)
			if (photo.storage.url) {
				if (photo.storage.url.startsWith('/api/storage/serve/') || photo.storage.url.startsWith('http')) {
					// If it's a thumbnail URL, try to extract and convert the path
					if (photo.storage.url.includes('/medium/') || photo.storage.url.includes('/small/') || photo.storage.url.includes('/thumb/')) {
						// Extract path from URL and convert
						const urlMatch = photo.storage.url.match(/\/serve\/[^/]+\/(.+)$/);
						if (urlMatch) {
							const extractedPath = decodeURIComponent(urlMatch[1]);
							const fullPath = getFullImagePath(extractedPath);
							const provider = photo.storage.provider || 'local';
							const constructed = `/api/storage/serve/${provider}/${encodeURIComponent(fullPath)}`;
							return constructed;
						}
					} else {
						return photo.storage.url;
					}
				} else {
					const provider = photo.storage.provider || 'local';
					let cleanPath = photo.storage.url.startsWith('/') 
						? photo.storage.url.slice(1) 
						: photo.storage.url;
					
					// If it's a thumbnail path, convert to full image path
					if (cleanPath.includes('/medium/') || cleanPath.includes('/small/') || cleanPath.includes('/thumb/')) {
						cleanPath = getFullImagePath(cleanPath);
					}
					
					const constructed = `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
					return constructed;
				}
			}
		}
		
		// For thumbnails/preview, check thumbnails first
		if (photo.storage.thumbnails && typeof photo.storage.thumbnails === 'object') {
			const thumbnails = photo.storage.thumbnails as Record<string, string>;
			const thumbnailUrl = thumbnails.medium || thumbnails.small || Object.values(thumbnails)[0];
			if (thumbnailUrl) {
				if (thumbnailUrl.startsWith('/api/storage/serve/') || thumbnailUrl.startsWith('http')) {
					return thumbnailUrl;
				}
				const provider = photo.storage.provider || 'local';
				const cleanPath = thumbnailUrl.startsWith('/') ? thumbnailUrl.slice(1) : thumbnailUrl;
				const constructed = `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
				return constructed;
			}
		}
		
		// Check thumbnailPath
		if (photo.storage.thumbnailPath) {
			if (photo.storage.thumbnailPath.startsWith('/api/storage/serve/') || photo.storage.thumbnailPath.startsWith('http')) {
				return photo.storage.thumbnailPath;
			}
			const provider = photo.storage.provider || 'local';
			const cleanPath = photo.storage.thumbnailPath.startsWith('/') 
				? photo.storage.thumbnailPath.slice(1) 
				: photo.storage.thumbnailPath;
			const constructed = `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
			return constructed;
		}
		
		// Fallback to url
		if (photo.storage.url) {
			if (photo.storage.url.startsWith('/api/storage/serve/') || photo.storage.url.startsWith('http')) {
				return photo.storage.url;
			}
			const provider = photo.storage.provider || 'local';
			const cleanPath = photo.storage.url.startsWith('/') 
				? photo.storage.url.slice(1) 
				: photo.storage.url;
			const constructed = `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
			return constructed;
		}
		
		// Fallback to path
		if (photo.storage.path) {
			const provider = photo.storage.provider || 'local';
			const cleanPath = photo.storage.path.startsWith('/') 
				? photo.storage.path.slice(1) 
				: photo.storage.path;
			const constructed = `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
			return constructed;
		}
		
		return '';
	}

	async function loadPhoto() {
		if (loadPhotoCalled) {
			return;
		}
		
		if (!photoId) {
			error = 'No photo ID provided';
			loading = false;
			return;
		}
		
		loadPhotoCalled = true;
		
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		const controller = new AbortController();
		
		try {
			loading = true;
			error = '';
			const url = `/api/admin/photos/${photoId}?t=${Date.now()}`;
			
			// Add timeout to prevent hanging
			timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
			
			try {
				const response = await fetch(url, {
					cache: 'no-store',
					signal: controller.signal,
				});
				
				// Clear timeout immediately when response is received
				if (timeoutId) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
				
				if (!response.ok) {
					const errorText = await response.text();
					console.error('[loadPhoto] Response not OK:', response.status, errorText);
					throw new Error(`Failed to fetch photo: ${response.status} ${response.statusText}`);
				}
				
				const data = await response.json();
				loading = false;
				photo = data;
				lastLoadedPhotoId = photoId; // Mark this photo as loaded
			} catch (fetchError: any) {
				// Clear timeout on error
				if (timeoutId) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
				if (fetchError.name === 'AbortError') {
					throw new Error('Request timeout - the server took too long to respond');
				}
				throw fetchError;
			}

			// Initialize form data
			if (photo) {
				formData.title =
					typeof photo.title === 'string' ? { en: photo.title } : photo.title || {};
				formData.description =
					typeof photo.description === 'string'
						? { en: photo.description }
						: photo.description || {};
				formData.isPublished = photo.isPublished || false;
				formData.isLeading = photo.isLeading || false;
				formData.isGalleryLeading = photo.isGalleryLeading || false;
				formData.tags =
					photo.tags?.map((tag: any) =>
						typeof tag === 'string' ? tag : tag._id?.toString() || tag.toString()
					) || [];
				formData.people =
					photo.people?.map((person: any) =>
						typeof person === 'string' ? person : person._id?.toString() || person.toString()
					) || [];
				formData.location =
					photo.location
						? typeof photo.location === 'string'
							? photo.location
							: (photo.location as any)._id?.toString() || String(photo.location)
						: null;
			}
		} catch (err) {
			console.error('[loadPhoto] Failed to fetch photo:', err);
			error = `Failed to load photo: ${err instanceof Error ? err.message : 'Unknown error'}`;
			photo = null;
		} finally {
			// Always clear timeout in finally block to ensure it's cleared
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			loading = false;
			// Don't reset loadPhotoCalled here - it's reset when photoId changes in the reactive block above
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!photo) return;

		try {
			saving = true;
			error = '';

			const updateData = {
				title: formData.title,
				description: formData.description,
				isPublished: formData.isPublished,
				isLeading: formData.isLeading,
				isGalleryLeading: formData.isGalleryLeading,
				tags: formData.tags,
				people: formData.people,
				location: formData.location,
			};

			const response = await fetch(`/api/admin/photos/${photoId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updateData),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Failed to update photo: ${response.statusText}`);
			}

			const updatedPhoto = await response.json();

			notification = {
				show: true,
				message: 'Photo updated successfully',
				type: 'success',
			};

			// Redirect after a short delay
			setTimeout(() => {
				if (photo?.albumId) {
					goto(`/admin/albums/${photo.albumId}`);
				} else {
					goto('/admin/albums');
				}
			}, 1000);
		} catch (err) {
			console.error('Failed to update photo:', err);
			error = `Failed to update photo: ${err instanceof Error ? err.message : 'Unknown error'}`;
			notification = {
				show: true,
				message: error,
				type: 'error',
			};
		} finally {
			saving = false;
		}
	}

	function handleInputChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const { name, type } = target;
		if (type === 'checkbox') {
			formData = { ...formData, [name]: target.checked };
		}
	}

	async function loadOptions() {
		try {
			loadingOptions = true;
			// Load tags
			const tagsResponse = await fetch('/api/admin/tags?limit=1000');
			if (tagsResponse.ok) {
				const tagsData = await tagsResponse.json();
				tags = (tagsData.data || []).map((tag: any) => ({
					_id: tag._id?.toString() || tag._id,
					name: tag.name,
				}));
			}

			// Load people
			const peopleResponse = await fetch('/api/admin/people?limit=1000');
			if (peopleResponse.ok) {
				const peopleData = await peopleResponse.json();
				people = (peopleData.data || []).map((person: any) => ({
					_id: person._id?.toString() || person._id,
					fullName: person.fullName,
					firstName: person.firstName,
				}));
			}

			// Load locations
			const locationsResponse = await fetch('/api/admin/locations?limit=1000');
			if (locationsResponse.ok) {
				const locationsData = await locationsResponse.json();
				locations = (locationsData.data || []).map((location: any) => ({
					_id: location._id?.toString() || location._id,
					name: location.name,
				}));
			}
		} catch (error) {
			console.error('Failed to load options:', error);
		} finally {
			loadingOptions = false;
		}
	}

	function getTagName(tag: Tag): string {
		return tag.name || 'Unknown';
	}

	function getPersonName(person: Person): string {
		return (
			MultiLangUtils.getTextValue(person.fullName || person.firstName || {}, $currentLanguage) ||
			'Unknown'
		);
	}

	function getLocationName(location: Location): string {
		return MultiLangUtils.getTextValue(location.name || {}, $currentLanguage) || 'Unknown';
	}

	onMount(() => {
		if (!browser) {
			loading = false;
			return;
		}
		
		// Set photoId from route params
		const initialPhotoId = $page.params.id || '';
		if (initialPhotoId) {
			photoId = initialPhotoId;
		}
		
		// Load photo and options
		if (photoId) {
			loadPhoto().catch((err) => {
				console.error('[onMount] loadPhoto error:', err);
				error = `Failed to load photo: ${err instanceof Error ? err.message : 'Unknown error'}`;
				loading = false;
			});
		} else {
			error = 'No photo ID provided';
			loading = false;
		}
		
		loadOptions().catch((err) => {
			console.error('[onMount] loadOptions error:', err);
		});
	});
</script>

<svelte:head>
	<title>
		{photo
			? `${MultiLangUtils.getTextValue(photo.title, $currentLanguage) || photo.filename} - Edit Photo`
			: 'Edit Photo'}
		- Admin
	</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if loading}
			<div class="text-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
				<p class="mt-4 text-gray-600">Loading photo...!!!</p>
			</div>
		{:else if error && !photo}
			<div class="text-center py-12">
				<h1 class="text-2xl font-bold text-gray-900 mb-4">Error</h1>
				<p class="text-gray-600 mb-4">{error}</p>
				<a href="/admin/albums" class="btn-primary">Back to Albums</a>
			</div>
		{:else if photo}
			<!-- Header -->
			<div class="flex items-center justify-between mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Edit Photo</h1>
					<p class="mt-2 text-gray-600">
						{MultiLangUtils.getTextValue(photo.title, $currentLanguage) || photo.filename}
					</p>
				</div>
				{#if photo.albumId}
					<a
						href="/admin/albums/{photo.albumId}"
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
					>
						← Back to Album
					</a>
				{/if}
			</div>

			<!-- Photo Preview -->
			{#if photo}
				{@const photoUrl = getPhotoUrl(photo)}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
					<div class="flex items-center justify-center">
						{#if photoUrl}
							<img
								src={photoUrl}
								alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || photo.filename}
								class="max-w-full max-h-96 object-contain rounded-lg"
								on:error={(e) => {
									const target = e.currentTarget as HTMLImageElement;
									if (target) target.style.display = 'none';
								}}
							/>
						{:else}
							<div class="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center flex-col">
								<svg class="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								<p class="text-sm text-gray-500 mt-2">No image URL available</p>
								<p class="text-xs text-gray-400 mt-1">Storage: {JSON.stringify(photo.storage)}</p>
							</div>
						{/if}
					</div>
					{#if photo.dimensions}
						<p class="text-sm text-gray-500 text-center mt-2">
							{photo.dimensions.width} × {photo.dimensions.height} pixels
						</p>
					{/if}
				</div>
			{/if}

			<!-- Form -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200">
				<form on:submit={handleSubmit} class="p-6 space-y-6">
					<!-- Title -->
					<div>
						<div class="block text-sm font-medium text-gray-700 mb-2">
							Photo Title
						</div>
						<MultiLangInput
							value={formData.title}
							onChange={(value) => {
								// Merge with existing to preserve all languages
								formData.title = { ...formData.title, ...value };
								formData = formData; // Trigger reactivity
							}}
							placeholder="Enter photo title..."
						/>
					</div>

					<!-- Description -->
					<div>
						<div class="block text-sm font-medium text-gray-700 mb-2">
							Description
						</div>
						<MultiLangHTMLEditor
							value={formData.description}
							onChange={(value) => {
								// Merge with existing to preserve all languages
								formData.description = { ...formData.description, ...value };
								formData = formData; // Trigger reactivity
							}}
							placeholder="Enter photo description..."
							height={240}
						/>
					</div>

					<!-- Status Toggles -->
					<div class="flex flex-wrap gap-6">
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isPublished"
								name="isPublished"
								checked={formData.isPublished}
								on:change={handleInputChange}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isPublished" class="ml-2 block text-sm text-gray-700">
								Published (visible to visitors)
							</label>
						</div>
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isLeading"
								name="isLeading"
								checked={formData.isLeading}
								on:change={handleInputChange}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isLeading" class="ml-2 block text-sm text-gray-700">
								Album Cover Photo
							</label>
						</div>
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isGalleryLeading"
								name="isGalleryLeading"
								checked={formData.isGalleryLeading}
								on:change={handleInputChange}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isGalleryLeading" class="ml-2 block text-sm text-gray-700">
								Gallery Leading (homepage hero)
							</label>
						</div>
					</div>

					<!-- Tags, People, Location -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<!-- Tags -->
						<div>
							<div class="block text-sm font-medium text-gray-700 mb-2">
								Tags
							</div>
							{#if loadingOptions}
								<div class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
									Loading tags...
								</div>
							{:else}
								<div class="space-y-2">
									<!-- Selected Tags Display -->
									{#if formData.tags && formData.tags.length > 0}
										<div class="flex flex-wrap gap-2 mb-2">
											{#each formData.tags as tagId}
												{@const tag = tags.find(t => t._id === tagId)}
												{#if tag}
													<span class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md">
														{getTagName(tag)}
														<button
															type="button"
															on:click={() => {
																formData.tags = formData.tags.filter((id) => id !== tagId);
																formData = formData;
															}}
															class="hover:text-blue-900"
														>
															×
														</button>
													</span>
												{/if}
											{/each}
										</div>
									{/if}
									<!-- Add Tag Button -->
									<button
										type="button"
										on:click={() => (showTagsPopup = true)}
										class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
										Add Tag
									</button>
								</div>
							{/if}
						</div>

						<!-- People -->
						<div>
							<div class="block text-sm font-medium text-gray-700 mb-2">
								People
							</div>
							{#if loadingOptions}
								<div class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
									Loading people...
								</div>
							{:else}
								<div class="space-y-2">
									<!-- Selected People Display -->
									{#if formData.people && formData.people.length > 0}
										<div class="flex flex-wrap gap-2 mb-2">
											{#each formData.people as personId}
												{@const person = people.find(p => p._id === personId)}
												{#if person}
													<span class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-sm rounded-md">
														{getPersonName(person)}
														<button
															type="button"
															on:click={() => {
																formData.people = formData.people.filter((id) => id !== personId);
																formData = formData;
															}}
															class="hover:text-green-900"
														>
															×
														</button>
													</span>
												{/if}
											{/each}
										</div>
									{/if}
									<!-- Add Person Button -->
									<button
										type="button"
										on:click|preventDefault|stopPropagation={() => {
											showPeoplePopup = true;
										}}
										class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
										Add Person
									</button>
								</div>
							{/if}
						</div>

						<!-- Location -->
						<div>
							<div class="block text-sm font-medium text-gray-700 mb-2">
								Location
							</div>
							{#if loadingOptions}
								<div class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
									Loading locations...
								</div>
							{:else}
								<div class="space-y-2">
									<!-- Selected Location Display -->
									{#if formData.location}
										{@const location = locations.find(l => l._id === formData.location)}
										{#if location}
											<div class="mb-2">
												<span class="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-md">
													{getLocationName(location)}
													<button
														type="button"
														on:click={() => {
															formData.location = null;
															formData = formData;
														}}
														class="hover:text-purple-900"
													>
														×
													</button>
												</span>
											</div>
										{/if}
									{/if}
									<!-- Add Location Button -->
									<button
										type="button"
										on:click={() => (showLocationPopup = true)}
										class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
										{formData.location ? 'Change Location' : 'Add Location'}
									</button>
								</div>
							{/if}
						</div>
					</div>

					<!-- Face Detection Section -->
					{#if photo && browser}
						{@const photoUrlForFaceRec = getPhotoUrl(photo, true)}
						{#if photo.storage && photoUrlForFaceRec}
							<div class="space-y-6">
								<FaceDetectionViewer
									imageUrl={photoUrlForFaceRec}
									photoId={photoId}
									detectedFaces={photo.faceRecognition?.faces || []}
									onFaceDetected={async () => {
										// Reload photo to get updated face data
										await loadPhoto();
									}}
									onFaceClick={(index) => {
										// Handle face click if needed
									}}
									onError={(error) => {
										notification = { show: true, message: error, type: 'error' };
									}}
									onSuccess={(message) => {
										notification = { show: true, message, type: 'success' };
									}}
								/>

								{#if photo.faceRecognition?.faces && photo.faceRecognition.faces.length > 0}
									<FaceMatchingPanel
										photoId={photoId}
										faces={photo.faceRecognition.faces.map((face: any) => ({
											box: face.box,
											matchedPersonId: face.matchedPersonId?.toString(),
											confidence: face.confidence,
										}))}
										onMatchComplete={async () => {
											// Reload photo to get updated matches and people list
											await loadPhoto();
											// Update formData.people to include newly assigned people
											if (photo) {
												formData.people =
													photo.people?.map((person: any) =>
														typeof person === 'string' ? person : person._id?.toString() || person.toString()
													) || [];
											}
										}}
										onFaceClick={(index) => {
											// Handle face click if needed
										}}
									/>
								{/if}
							</div>
						{/if}
					{/if}

					<!-- Read-only Information -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h3 class="text-sm font-medium text-gray-700 mb-3">Photo Information</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<span class="font-medium text-gray-700">Filename:</span>
								<span class="ml-2 text-gray-600">{photo.filename}</span>
							</div>
							{#if photo.uploadedAt}
								<div>
									<span class="font-medium text-gray-700">Uploaded:</span>
									<span class="ml-2 text-gray-600">
										{new Date(photo.uploadedAt).toLocaleDateString()}
									</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Error Message -->
					{#if error}
						<div class="bg-red-50 border border-red-200 rounded-md p-4">
							<p class="text-sm text-red-600">{error}</p>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
						{#if photo.albumId}
							<a
								href="/admin/albums/{photo.albumId}"
								class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								Cancel
							</a>
						{:else}
							<a
								href="/admin/albums"
								class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								Cancel
							</a>
						{/if}
						<button
							type="submit"
							disabled={saving}
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{saving ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>

<NotificationDialog
	isOpen={notification.show}
	message={notification.message}
	type={notification.type}
	onClose={() => {
		notification.show = false;
	}}
/>

<!-- Collection Popups -->
<CollectionPopup
	isOpen={showTagsPopup}
	onClose={() => {
		showTagsPopup = false;
	}}
	title="Select Tags"
	collectionType="tags"
	selectedItems={formData.tags}
	onSelectionChange={(items) => {
		formData.tags = items;
		formData = formData;
	}}
	searchPlaceholder="Search tags..."
/>

<CollectionPopup
	isOpen={showPeoplePopup}
	onClose={() => {
		showPeoplePopup = false;
	}}
	title="Select People"
	collectionType="people"
	selectedItems={formData.people}
	onSelectionChange={(items) => {
		formData.people = items;
		formData = formData;
	}}
	searchPlaceholder="Search people..."
/>

<CollectionPopup
	isOpen={showLocationPopup}
	onClose={() => {
		showLocationPopup = false;
	}}
	title="Select Location"
	collectionType="locations"
	selectedItems={formData.location ? [formData.location] : []}
	onSelectionChange={(items) => {
		formData.location = items.length > 0 ? items[0] : null;
		formData = formData;
	}}
	searchPlaceholder="Search locations..."
/>
