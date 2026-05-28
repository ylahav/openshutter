import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '../src/routes/admin/photos/[id]/edit/+page.svelte');
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

const replacements = [
	[
		`import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';`,
		`import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import {
		buildFormDataFromPhoto,
		fetchPhotoForEdit,
		normalizeLoadedPhoto,
		type PhotoEditRecord,
	} from '$lib/admin/photoEditLoad';

	export let data: PageData;
	import { currentLanguage } from '$stores/language';`,
	],
	[
		`let photoId: string = '';
	let photo: Photo | null = null;
	const loading = writable(true);`,
		`$: photoId = $page.params.id ?? data.photoId ?? '';
	let photo: Photo | null = null;
	const loading = writable(!data.initialPhoto && !data.loadError);`,
	],
	[
		`let error = '';
	
	let tags: Tag[] = [];
	let people: Person[] = [];
	let locations: Location[] = [];
	let loadingOptions = true;
	let loadPhotoCalled = false;`,
		`let error = data.loadError ?? '';

	let tags: Tag[] = [];
	let people: Person[] = [];
	let locations: Location[] = [];
	let loadingOptions = true;`,
	],
	[
		`	// Track the last loaded photoId to prevent reloading the same photo
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
			logger.error('[Reactive] loadPhoto error:', err);
			error = handleError(err, 'Failed to load photo');
			loading.set(false);
			loadPhotoCalled = false; // Reset on error so it can retry
			lastLoadedPhotoId = null; // Reset on error
		});
	}

	$: {`,
		`	$: {`,
	],
];

for (const [from, to] of replacements) {
	if (!s.includes(from)) {
		console.error('Missing expected block:', from.slice(0, 80));
		process.exit(1);
	}
	s = s.replace(from, to);
}

const oldLoadPhoto = `async function loadPhoto() {
		if (loadPhotoCalled) {
			return;
		}
		
		if (!photoId) {
			error = 'No photo ID provided';
			loading.set(false);
			return;
		}
		
		loadPhotoCalled = true;
		
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		const controller = new AbortController();
		
		try {
			loading.set(true);
			error = '';
			const url = \`/api/admin/photos/\${photoId}?t=\${Date.now()}\`;
			
			// Add timeout to prevent hanging
			timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
			
			try {
				const response = await fetch(url, {
					cache: 'no-store',
					signal: controller.signal,
					credentials: 'include',
				});
				
				// Clear timeout immediately when response is received
				if (timeoutId) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
				
				if (!response.ok) {
					await handleApiErrorResponse(response);
				}
				
				const responseData = await response.json();
				loading.set(false);
				// Extract photo data from response (API returns { success: true, data: {...} })
				let loadedPhoto = responseData.data || responseData;
				// Normalize faceRecognition so UI always gets a clean faces array (ensures reactivity after detect)
				if (loadedPhoto?.faceRecognition?.faces && Array.isArray(loadedPhoto.faceRecognition.faces)) {
					loadedPhoto = {
						...loadedPhoto,
						faceRecognition: {
							...loadedPhoto.faceRecognition,
							faces: loadedPhoto.faceRecognition.faces.map((f: any) => ({
								box: f.box || { x: 0, y: 0, width: 0, height: 0 },
								matchedPersonId: f.matchedPersonId != null ? String(f.matchedPersonId) : undefined,
								confidence: f.confidence,
							})),
						},
					};
				}
				// Preserve canRestoreOriginal so "Restore original" button shows when backup exists
				photo = {
					...loadedPhoto,
					canRestoreOriginal: loadedPhoto.canRestoreOriginal === true
				};
				lastLoadedPhotoId = photoId; // Mark this photo as loaded
				
				// Debug: Log storage information
				logger.debug('[loadPhoto] Photo loaded:', {
					photoId,
					hasStorage: !!photo?.storage,
					storage: photo?.storage,
					photoUrl: photo ? getPhotoUrlLocal(photo) : 'N/A',
					faceCount: photo?.faceRecognition?.faces?.length ?? 0,
					responseStructure: { hasData: !!responseData.data, hasSuccess: !!responseData.success }
				});
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
				// Ensure the editor shows content even if current language is missing
				const descriptionEntries = Object.entries(formData.description || {}).filter(
					([, value]) => typeof value === 'string' && value.trim().length > 0
				);
				const firstAvailableLanguage = descriptionEntries.length > 0 ? descriptionEntries[0][0] : 'en';
				const preferredLanguage =
					($currentLanguage && formData.description?.[$currentLanguage]?.trim())
						? $currentLanguage
						: (formData.description?.en?.trim() ? 'en' : firstAvailableLanguage);

				descriptionLanguage = preferredLanguage || $currentLanguage || 'en';
				if (
					$currentLanguage &&
					formData.description &&
					!formData.description[$currentLanguage] &&
					formData.description[descriptionLanguage]
				) {
					formData.description = {
						...formData.description,
						[$currentLanguage]: formData.description[descriptionLanguage]
					};
				}
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
				formData.metadata =
					photo.metadata && typeof photo.metadata === 'object'
						? { ...photo.metadata }
						: {};
				// EXIF overrides (date/camera) – init from photo.exif for editing
				const ex = photo.exif && typeof photo.exif === 'object' ? photo.exif : {};
				const dt = ex.dateTime ?? ex.dateTimeOriginal ?? ex.dateTimeDigitized;
				formData.exifOverrides = {
					dateTime: dt
						? (typeof dt === 'string'
								? dt.slice(0, 16)
								: new Date(dt as Date).toISOString().slice(0, 16))
						: '',
					make: (ex.make as string) ?? '',
					model: (ex.model as string) ?? '',
				};
				// Trigger reactivity after mutating formData fields
				formData = { ...formData };
			}
		} catch (err) {
			logger.error('[loadPhoto] Failed to fetch photo:', err);
			error = handleError(err, 'Failed to load photo');
			photo = null;
		} finally {
			// Always clear timeout in finally block to ensure it's cleared
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			loading.set(false);
			// Don't reset loadPhotoCalled here - it's reset when photoId changes in the reactive block above
		}
	}`;

const newLoadFns = `function applyLoadedPhoto(loaded: PhotoEditRecord) {
		photo = normalizeLoadedPhoto(loaded) as Photo;
		const built = buildFormDataFromPhoto(loaded, $currentLanguage);
		formData = { ...built.formData };
		descriptionLanguage = built.descriptionLanguage;
		logger.debug('[photo edit] Photo loaded:', {
			photoId,
			hasStorage: !!photo?.storage,
			photoUrl: photo ? getPhotoUrlLocal(photo) : 'N/A',
			faceCount: photo?.faceRecognition?.faces?.length ?? 0,
		});
	}

	async function reloadPhoto() {
		if (!photoId) return;
		try {
			loading.set(true);
			error = '';
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);
			try {
				const loaded = await fetchPhotoForEdit(photoId, controller.signal);
				applyLoadedPhoto(loaded);
			} finally {
				clearTimeout(timeoutId);
			}
		} catch (err) {
			logger.error('[reloadPhoto] Failed:', err);
			error = handleError(err, 'Failed to load photo');
			photo = null;
		} finally {
			loading.set(false);
		}
	}

	async function bootstrapPhotoEditPage() {
		if (!photoId) {
			error = 'No photo ID provided';
			loading.set(false);
			return;
		}
		loading.set(true);
		error = '';
		try {
			if (data.loadError && !data.initialPhoto && photoId === data.photoId) {
				error = data.loadError;
				return;
			}
			if (data.initialPhoto && photoId === data.photoId) {
				applyLoadedPhoto(normalizeLoadedPhoto(data.initialPhoto as PhotoEditRecord));
				return;
			}
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);
			try {
				const loaded = await fetchPhotoForEdit(photoId, controller.signal);
				applyLoadedPhoto(loaded);
			} finally {
				clearTimeout(timeoutId);
			}
		} catch (err) {
			logger.error('[bootstrapPhotoEditPage] Failed:', err);
			error = handleError(err, 'Failed to load photo');
			photo = null;
		} finally {
			loading.set(false);
		}
	}`;

if (!s.includes(oldLoadPhoto)) {
	console.error('loadPhoto block not found');
	process.exit(1);
}
s = s.replace(oldLoadPhoto, newLoadFns);

s = s.replaceAll(
	`setTimeout(() => {
				loadPhotoCalled = false;
				lastLoadedPhotoId = null;
				loadPhoto();
			}, 1000);`,
	`setTimeout(() => void reloadPhoto(), 1000);`,
);
s = s.replaceAll(
	`setTimeout(() => {
				loadPhotoCalled = false;
				lastLoadedPhotoId = null;
				loadPhoto();
			}, 500);`,
	`setTimeout(() => void reloadPhoto(), 500);`,
);
s = s.replace(
	`loadPhotoCalled = false;
			lastLoadedPhotoId = null;
			await loadPhoto();`,
	`await reloadPhoto();`,
);
s = s.replaceAll('loadPhotoCalled = false;\n\t\t\t\t\t\t\tawait loadPhoto();', 'await reloadPhoto();');
s = s.replaceAll('loadPhotoCalled = false;\n\t\t\t\t\t\t\t\tawait loadPhoto();', 'await reloadPhoto();');

const oldOnMount = `onMount(() => {
		if (!browser) {
			loading.set(false);
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
				logger.error('[onMount] loadPhoto error:', err);
				error = handleError(err, 'Failed to load photo');
				loading.set(false);
			});
		} else {
			error = 'No photo ID provided';
			loading.set(false);
		}
		
		loadOptions().catch((err) => {
			logger.error('[onMount] loadOptions error:', err);
		});
	});`;

const newOnMount = `if (data.initialPhoto) {
		applyLoadedPhoto(normalizeLoadedPhoto(data.initialPhoto as PhotoEditRecord));
	}

	onMount(() => {
		if (!browser) {
			loading.set(false);
			return;
		}
		void bootstrapPhotoEditPage();
		loadOptions().catch((err) => {
			logger.error('[onMount] loadOptions error:', err);
		});
	});`;

if (!s.includes(oldOnMount)) {
	console.error('onMount block not found');
	process.exit(1);
}
s = s.replace(oldOnMount, newOnMount);

// Face detection callbacks
s = s.replace(
	`// Allow loadPhoto to run again (do not set lastLoadedPhotoId = null,
										// or the reactive block would also call loadPhoto() and we'd return early)
										loadPhotoCalled = false;
										await loadPhoto();`,
	`await reloadPhoto();`,
);
s = s.replace(
	`loadPhotoCalled = false;
											await loadPhoto();`,
	`await reloadPhoto();`,
);

if (s.includes('loadPhotoCalled') || s.includes('lastLoadedPhotoId') || s.includes('loadPhoto()')) {
	console.error('Patch incomplete — leftover symbols');
	const leftovers = s.match(/loadPhotoCalled|lastLoadedPhotoId|loadPhoto\(\)/g);
	console.error(leftovers);
	process.exit(1);
}

fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('Patched', file);
