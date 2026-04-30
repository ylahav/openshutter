<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
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
	import PhotoCropper from '$lib/components/PhotoCropper.svelte';
	import SuggestTagsButton from '$lib/components/ai-tagging/SuggestTagsButton.svelte';
	import TagSuggestionsModal from '$lib/components/ai-tagging/TagSuggestionsModal.svelte';
	import { getPhotoUrl, getPhotoFullUrl, getPhotoRotationStyle } from '$lib/utils/photoUrl';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

	interface Photo {
		_id: string;
		title?: string | { en?: string; he?: string };
		description?: string | { en?: string; he?: string };
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
		exif?: Record<string, unknown> | null;
		metadata?: Record<string, unknown> | null;
		faceRecognition?: {
			faces?: Array<{
				box: { x: number; y: number; width: number; height: number };
				matchedPersonId?: string;
				confidence?: number;
			}>;
		};
		rotation?: number;
		/** True when an original backup exists (e.g. after crop) so admin can restore */
		canRestoreOriginal?: boolean;
	}

	interface Tag {
		_id: string;
		name: string | Record<string, string>;
	}

	interface RelatedTagSuggestion {
		tagId: string;
		name: Tag['name'];
		category?: string;
		color?: string;
		count: number;
		sourceTagIds: string[];
	}

	interface Person {
		_id: string;
		fullName?: string | { en?: string; he?: string };
		firstName?: string | { en?: string; he?: string };
	}

	interface Location {
		_id: string;
		name: string | { en?: string; he?: string };
	}

	let photoId: string = '';
	let photo: Photo | null = null;
	let loading = true;
	let saving = false;
	let regeneratingThumbnails = false;
	let rotatingPhoto = false;
	let croppingPhoto = false;
	let showCropModal = false;
	let restoringOriginal = false;
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
	
	// AI Tagging states
	let showAITagSuggestions = false;
	let aiTagSuggestionsLoading = false;
	let aiTagSuggestions: Array<{
		label: string;
		confidence: number;
		category?: string;
		matchedTag?: { id: string; name: string };
		isNewTag: boolean;
	}> = [];
	let aiTagSuggestionsError: string | null = null;
	let aiTagProvider = 'local';
	let aiTagProcessingTime = 0;
	
	// Context-based Tag Suggestions states
	let showContextTagSuggestions = false;
	let contextTagSuggestionsLoading = false;
	let contextTagSuggestions: Array<{
		label: string;
		confidence: number;
		category?: string;
		matchedTag?: { id: string; name: string };
		isNewTag: boolean;
		source?: string;
		reason?: string;
	}> = [];
	let contextTagSuggestionsError: string | null = null;
	let contextTagSources: {
		similar: number;
		iptc: number;
		location: number;
		cooccurrence: number;
	} = { similar: 0, iptc: 0, location: 0, cooccurrence: 0 };
	let relatedTagsLoading = false;
	let relatedTagsError: string | null = null;
	let relatedTags: RelatedTagSuggestion[] = [];
	let applyingRelatedTagId: string | null = null;
	let lastRelatedTagsKey = '';
	const DISMISS_FEEDBACK_DEBOUNCE_MS = 500;
	const dismissFeedbackQueue: Record<'ai' | 'context', Set<string>> = {
		ai: new Set<string>(),
		context: new Set<string>(),
	};
	let dismissFeedbackTimers: Record<'ai' | 'context', ReturnType<typeof setTimeout> | null> = {
		ai: null,
		context: null,
	};
	
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
			logger.error('[Reactive] loadPhoto error:', err);
			error = handleError(err, 'Failed to load photo');
			loading = false;
			loadPhotoCalled = false; // Reset on error so it can retry
			lastLoadedPhotoId = null; // Reset on error
		});
	}

	$: {
		const selectedTagIds = [...new Set((formData.tags || []).map((tagId) => String(tagId).trim()).filter(Boolean))].sort();
		const relatedTagsKey = photoId && selectedTagIds.length > 0 ? `${photoId}:${selectedTagIds.join(',')}` : '';

		if (!relatedTagsKey) {
			lastRelatedTagsKey = '';
			relatedTags = [];
			relatedTagsError = null;
			relatedTagsLoading = false;
		} else if (relatedTagsKey !== lastRelatedTagsKey) {
			lastRelatedTagsKey = relatedTagsKey;
			loadRelatedTags(selectedTagIds, relatedTagsKey);
		}
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
		metadata: {} as Record<string, unknown>,
		/** Override EXIF-derived fields (merged on save; does not wipe other EXIF) */
		exifOverrides: { dateTime: '', make: '', model: '' } as { dateTime: string; make: string; model: string },
	};
	let descriptionLanguage = 'en';
	let reExtractingExif = false;

	// Photo URL helper - uses shared utility
	// Wrapper maintains backward compatibility with preferFullSize parameter
	function getPhotoUrlLocal(photo: Photo, preferFullSize: boolean = false): string {
		if (preferFullSize) {
			return getPhotoFullUrl(photo, '');
		}
		return getPhotoUrl(photo, { fallback: '' });
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
				loading = false;
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

			const updateData: Record<string, unknown> = {
				title: formData.title,
				description: formData.description,
				isPublished: formData.isPublished,
				isLeading: formData.isLeading,
				isGalleryLeading: formData.isGalleryLeading,
				tags: formData.tags,
				people: formData.people,
				location: formData.location,
				metadata: (() => {
					const m = formData.metadata;
					const cleaned = Object.fromEntries(
						Object.entries(m).filter(([, v]) => v !== undefined && v !== null && v !== '')
					);
					return Object.keys(cleaned).length ? cleaned : undefined;
				})(),
			};
			// EXIF overrides (merged with existing; only send non-empty)
			const o = formData.exifOverrides;
			if (o.dateTime.trim() || o.make.trim() || o.model.trim()) {
				const exifMerge: Record<string, unknown> = { ...(photo.exif && typeof photo.exif === 'object' ? photo.exif : {}) };
				if (o.dateTime.trim()) exifMerge.dateTime = new Date(o.dateTime.trim()).toISOString();
				if (o.make.trim()) exifMerge.make = o.make.trim();
				if (o.model.trim()) exifMerge.model = o.model.trim();
				updateData.exif = exifMerge;
			}

			const response = await fetch(`/api/admin/photos/${photoId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updateData),
				credentials: 'include',
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
			logger.error('Failed to update photo:', err);
			error = handleError(err, 'Failed to update photo');
			notification = {
				show: true,
				message: error,
				type: 'error',
			};
		} finally {
			saving = false;
		}
	}

	async function handleRegenerateThumbnails() {
		if (!photo || regeneratingThumbnails) return;

		try {
			regeneratingThumbnails = true;
			error = '';

			const response = await fetch(`/api/admin/photos/${photoId}/regenerate-thumbnails`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			const updatedPhotoData = result.data || result;

			// Update the photo object with new thumbnail data
			if (updatedPhotoData && updatedPhotoData.storage) {
				photo = {
					...photo,
					storage: updatedPhotoData.storage
				};
			}

			notification = {
				show: true,
				message: result.message || 'Thumbnails regenerated successfully',
				type: 'success',
			};

			// Reload the page after a short delay to show updated thumbnails
			setTimeout(() => {
				loadPhotoCalled = false;
				lastLoadedPhotoId = null;
				loadPhoto();
			}, 1000);
		} catch (err) {
			logger.error('Failed to regenerate thumbnails:', err);
			error = handleError(err, 'Failed to regenerate thumbnails');
			notification = {
				show: true,
				message: error,
				type: 'error',
			};
		} finally {
			regeneratingThumbnails = false;
		}
	}

	async function handleRotate(angle: 90 | -90 | 180) {
		if (!photo || rotatingPhoto) return;
		try {
			rotatingPhoto = true;
			error = '';
			const response = await fetch(`/api/admin/photos/${photoId}/rotate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ angle }),
			});
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			const updatedPhotoData = result.data || result;
			if (updatedPhotoData?.storage) {
				photo = { ...photo, storage: updatedPhotoData.storage };
			}
			notification = { show: true, message: result.message || 'Photo rotated', type: 'success' };
			setTimeout(() => {
				loadPhotoCalled = false;
				lastLoadedPhotoId = null;
				loadPhoto();
			}, 500);
		} catch (err) {
			logger.error('Failed to rotate photo:', err);
			error = handleError(err, 'Failed to rotate photo');
			notification = { show: true, message: error, type: 'error' };
		} finally {
			rotatingPhoto = false;
		}
	}

	async function handleCrop(crop: { x: number; y: number; width: number; height: number }) {
		if (!photo || croppingPhoto) return;
		try {
			croppingPhoto = true;
			error = '';
			const response = await fetch(`/api/admin/photos/${photoId}/crop`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(crop),
			});
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			const updatedPhotoData = result.data || result;
			
			// Update photo with all returned data including dimensions
			if (updatedPhotoData) {
				photo = {
					...photo,
					...updatedPhotoData,
					storage: updatedPhotoData.storage || photo.storage,
					dimensions: updatedPhotoData.dimensions || photo.dimensions
				};
			}
			
			const newWidth = updatedPhotoData?.dimensions?.width || crop.width;
			const newHeight = updatedPhotoData?.dimensions?.height || crop.height;
			notification = { 
				show: true, 
				message: result.message || `Photo cropped successfully. New size: ${newWidth} × ${newHeight}px`, 
				type: 'success' 
			};
			showCropModal = false;
			
			// Reload photo to get fresh data and ensure dimensions are updated
			setTimeout(() => {
				loadPhotoCalled = false;
				lastLoadedPhotoId = null;
				loadPhoto();
			}, 500);
		} catch (err) {
			logger.error('Failed to crop photo:', err);
			error = handleError(err, 'Failed to crop photo');
			notification = { show: true, message: error, type: 'error' };
		} finally {
			croppingPhoto = false;
		}
	}

	async function handleRestoreOriginal() {
		if (!photo || restoringOriginal || !photo.canRestoreOriginal) return;
		try {
			restoringOriginal = true;
			error = '';
			const response = await fetch(`/api/admin/photos/${photoId}/restore-original`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
			});
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			const updatedPhotoData = result.data || result;
			if (updatedPhotoData) {
				photo = { ...photo, ...updatedPhotoData, canRestoreOriginal: updatedPhotoData.canRestoreOriginal ?? false };
			}
			notification = { show: true, message: result.message || 'Photo restored to original', type: 'success' };
			loadPhotoCalled = false;
			lastLoadedPhotoId = null;
			await loadPhoto();
		} catch (err) {
			logger.error('Failed to restore original:', err);
			error = handleError(err, 'Failed to restore original');
			notification = { show: true, message: error, type: 'error' };
		} finally {
			restoringOriginal = false;
		}
	}

	async function handleReExtractExif() {
		if (!photo || reExtractingExif) return;
		try {
			reExtractingExif = true;
			error = '';
			const response = await fetch(`/api/admin/photos/${photoId}/re-extract-exif`, { method: 'POST', credentials: 'include' });
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			const updated = result.data || result;
			if (updated?.exif !== undefined) {
				photo = { ...photo, exif: updated.exif };
			}
			notification = {
				show: true,
				message: result.message || 'EXIF data re-extracted successfully',
				type: 'success',
			};
		} catch (err) {
			logger.error('Re-extract EXIF failed:', err);
			notification = {
				show: true,
				message: handleError(err, 'Failed to re-extract EXIF'),
				type: 'error',
			};
		} finally {
			reExtractingExif = false;
		}
	}

	function formatExifValue(value: unknown): string {
		if (value == null) return '—';
		if (value instanceof Date) return value.toLocaleString();
		if (typeof value === 'object' && value !== null && 'latitude' in value) {
			const g = value as { latitude?: number; longitude?: number; altitude?: number };
			const parts = [];
			if (g.latitude != null) parts.push(`Lat ${g.latitude.toFixed(5)}`);
			if (g.longitude != null) parts.push(`Lon ${g.longitude.toFixed(5)}`);
			if (g.altitude != null) parts.push(`${g.altitude}m`);
			return parts.length ? parts.join(', ') : JSON.stringify(value);
		}
		return String(value);
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
			const tagsResponse = await fetch('/api/admin/tags?limit=1000', { credentials: 'include' });
			if (tagsResponse.ok) {
				const tagsData = await tagsResponse.json();
				tags = (tagsData.data || []).map((tag: any) => ({
					_id: tag._id?.toString() || tag._id,
					name: tag.name,
				}));
			}

			// Load people
			const peopleResponse = await fetch('/api/admin/people?limit=1000', { credentials: 'include' });
			if (peopleResponse.ok) {
				const peopleData = await peopleResponse.json();
				people = (peopleData.data || []).map((person: any) => ({
					_id: person._id?.toString() || person._id,
					fullName: person.fullName,
					firstName: person.firstName,
				}));
			}

			// Load locations
			const locationsResponse = await fetch('/api/admin/locations?limit=1000', { credentials: 'include' });
			if (locationsResponse.ok) {
				const locationsData = await locationsResponse.json();
				locations = (locationsData.data || []).map((location: any) => ({
					_id: location._id?.toString() || location._id,
					name: location.name,
				}));
			}
		} catch (error) {
			logger.error('Failed to load options:', error);
		} finally {
			loadingOptions = false;
		}
	}

	function getTagName(tag: Tag): string {
		return getLocalizedText(tag.name);
	}

	function getLocalizedText(value: string | Record<string, string> | undefined): string {
		if (!value) return 'Unknown';
		if (typeof value === 'string') return value;
		return MultiLangUtils.getTextValue(value, $currentLanguage) || Object.values(value)[0] || 'Unknown';
	}

	function getPersonName(person: Person): string {
		return (
			MultiLangUtils.getTextValue(person.fullName || person.firstName || {}, $currentLanguage) ||
			'Unknown'
		);
	}

	function getPersonNameById(personId: string | null | undefined): string {
		if (!personId) return 'Unknown';
		const id = String(personId).trim();
		const person = people.find((p) => String(p._id || '').trim() === id);
		if (person) {
			const name = getPersonName(person);
			return name || 'Unknown';
		}
		return 'Unknown';
	}

	async function handleSuggestTags() {
		if (!photo || !photoId) return;

		try {
			showAITagSuggestions = true;
			aiTagSuggestionsLoading = true;
			aiTagSuggestionsError = null;
			aiTagSuggestions = [];

			const response = await fetch(`/api/admin/photos/${photoId}/suggest-tags`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					provider: 'auto',
					maxSuggestions: 10,
					createNewTags: false,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
				throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to get tag suggestions');
			}

			aiTagSuggestions = result.data?.suggestions || [];
			aiTagProvider = result.data?.provider || 'local';
			aiTagProcessingTime = result.data?.processingTime || 0;
		} catch (error) {
			logger.error('Failed to suggest tags:', error);
			aiTagSuggestionsError = error instanceof Error ? error.message : 'Failed to get tag suggestions';
		} finally {
			aiTagSuggestionsLoading = false;
		}
	}

	async function handleSuggestTagsFromContext() {
		if (!photo || !photoId) return;

		try {
			showContextTagSuggestions = true;
			contextTagSuggestionsLoading = true;
			contextTagSuggestionsError = null;
			contextTagSuggestions = [];

			const response = await fetch(`/api/admin/photos/${photoId}/suggest-tags-from-context?maxSuggestions=15`, {
				method: 'GET',
				credentials: 'include',
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
				throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to get context-based tag suggestions');
			}

			// Map context suggestions to the format expected by TagSuggestionsModal
			contextTagSuggestions = (result.data?.suggestions || []).map((suggestion: {
				tagId: string;
				tagName: string;
				category?: string;
				source: string;
				score: number;
				reason: string;
			}) => ({
				label: suggestion.tagName,
				confidence: Math.min(suggestion.score / 5, 1), // Normalize score to 0-1 range (assuming max score ~5)
				category: suggestion.category,
				matchedTag: { id: suggestion.tagId, name: suggestion.tagName },
				isNewTag: false, // Context suggestions are always existing tags
				source: suggestion.source,
				reason: suggestion.reason,
			}));

			contextTagSources = result.data?.sources || { similar: 0, iptc: 0, location: 0, cooccurrence: 0 };
		} catch (error) {
			logger.error('Failed to suggest tags from context:', error);
			contextTagSuggestionsError = error instanceof Error ? error.message : 'Failed to get context-based tag suggestions';
		} finally {
			contextTagSuggestionsLoading = false;
		}
	}

	function queueSuggestionDismissFeedback(
		source: 'ai' | 'context',
		suggestions: Array<{
			label: string;
			matchedTag?: { id: string; name: string };
			isNewTag: boolean;
		}>
	): void {
		if (!suggestions || suggestions.length === 0) return;
		const queue = dismissFeedbackQueue[source];
		for (const suggestion of suggestions) {
			const tagId = suggestion.matchedTag?.id?.trim();
			if (tagId) queue.add(tagId);
		}
		if (queue.size === 0) return;
		if (dismissFeedbackTimers[source]) clearTimeout(dismissFeedbackTimers[source]!);
		dismissFeedbackTimers[source] = setTimeout(() => {
			void flushSuggestionDismissFeedback(source);
		}, DISMISS_FEEDBACK_DEBOUNCE_MS);
	}

	async function flushSuggestionDismissFeedback(source: 'ai' | 'context') {
		if (!photoId) return;
		const queue = dismissFeedbackQueue[source];
		if (queue.size === 0) return;
		const tagIds = Array.from(queue);
		queue.clear();
		try {
			await fetch(`/api/admin/photos/${photoId}/tag-suggestion-feedback`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					tagIds,
					source,
					action: 'dismissed',
				}),
			});
		} catch (error) {
			for (const tagId of tagIds) queue.add(tagId);
			logger.warn('Failed to record tag dismiss feedback:', error);
		} finally {
			dismissFeedbackTimers[source] = null;
		}
	}

	async function handleDismissAISuggestion(suggestion: {
		label: string;
		matchedTag?: { id: string; name: string };
		isNewTag: boolean;
	}) {
		queueSuggestionDismissFeedback('ai', [suggestion]);
		aiTagSuggestions = aiTagSuggestions.filter((s) => s.label !== suggestion.label);
	}

	async function handleDismissContextSuggestion(suggestion: {
		label: string;
		matchedTag?: { id: string; name: string };
		isNewTag: boolean;
	}) {
		queueSuggestionDismissFeedback('context', [suggestion]);
		contextTagSuggestions = contextTagSuggestions.filter((s) => s.label !== suggestion.label);
	}

	async function loadRelatedTags(selectedTagIds: string[], requestKey: string) {
		if (!photoId || selectedTagIds.length === 0) {
			relatedTags = [];
			relatedTagsError = null;
			return;
		}

		try {
			relatedTagsLoading = true;
			relatedTagsError = null;
			const response = await fetch(
				`/api/admin/photos/${photoId}/related-tags?limit=8&tagIds=${encodeURIComponent(selectedTagIds.join(','))}`,
				{ credentials: 'include' },
			);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({
					error: `HTTP ${response.status}: ${response.statusText}`,
				}));
				throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
			}
			const result = await response.json();

			if (lastRelatedTagsKey !== requestKey) return;
			relatedTags = (result.data || [])
				.map((item: any) => ({
					tagId: String(item.tagId || '').trim(),
					name: item.name,
					category: item.category,
					color: item.color,
					count: Number(item.count || 0),
					sourceTagIds: [],
				}))
				.filter((item: RelatedTagSuggestion) => item.tagId);
		} catch (error) {
			if (lastRelatedTagsKey !== requestKey) return;
			logger.error('Failed to load related tags:', error);
			relatedTags = [];
			relatedTagsError = error instanceof Error ? error.message : 'Failed to load related tags';
		} finally {
			if (lastRelatedTagsKey === requestKey) {
				relatedTagsLoading = false;
			}
		}
	}

	async function applySuggestedTags(params: {
		tagIds?: string[];
		createNewTags?: Array<{ name: string; category?: string }>;
		source: 'ai' | 'context' | 'manual';
	}): Promise<string[]> {
		const response = await fetch(`/api/admin/photos/${photoId}/apply-tags`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({
				tagIds: params.tagIds && params.tagIds.length > 0 ? params.tagIds : undefined,
				createNewTags: params.createNewTags && params.createNewTags.length > 0 ? params.createNewTags : undefined,
				source: params.source,
			}),
		});

		const result = await response.json();
		if (!result.success) {
			throw new Error(result.error || 'Failed to apply tags');
		}

		const appliedTagIds = result.data?.appliedTags || [];
		formData.tags = [...new Set([...formData.tags, ...appliedTagIds])];
		formData = { ...formData };
		await loadOptions();
		return appliedTagIds;
	}

	async function handleApplyContextTags(selectedSuggestions: Array<{
		label: string;
		confidence: number;
		category?: string;
		matchedTag?: { id: string; name: string };
		isNewTag: boolean;
	}>) {
		if (!photoId || selectedSuggestions.length === 0) return;

		try {
			// Context suggestions are always existing tags (matchedTag is always present)
			const tagIds: string[] = selectedSuggestions
				.filter((s) => s.matchedTag)
				.map((s) => s.matchedTag!.id);

			if (tagIds.length === 0) return;
			const appliedTagIds = await applySuggestedTags({ tagIds, source: 'context' });

			showContextTagSuggestions = false;
			notification = {
				show: true,
				message: `Successfully applied ${appliedTagIds.length} tag${appliedTagIds.length === 1 ? '' : 's'}`,
				type: 'success',
			};
		} catch (error) {
			logger.error('Failed to apply context tags:', error);
			notification = {
				show: true,
				message: error instanceof Error ? error.message : 'Failed to apply tags',
				type: 'error',
			};
		}
	}

	async function handleApplyAITags(selectedSuggestions: Array<{
		label: string;
		confidence: number;
		category?: string;
		matchedTag?: { id: string; name: string };
		isNewTag: boolean;
	}>) {
		if (!photoId || selectedSuggestions.length === 0) return;

		try {
			// Separate existing tags and new tags
			const tagIds: string[] = [];
			const createNewTags: Array<{ name: string; category?: string }> = [];

			for (const suggestion of selectedSuggestions) {
				if (suggestion.matchedTag) {
					tagIds.push(suggestion.matchedTag.id);
				} else if (suggestion.isNewTag) {
					createNewTags.push({
						name: suggestion.label,
						category: suggestion.category || 'general',
					});
				}
			}
			const appliedTagIds = await applySuggestedTags({
				tagIds,
				createNewTags,
				source: 'ai',
			});

			showAITagSuggestions = false;
			notification = {
				show: true,
				message: `Successfully applied ${appliedTagIds.length} tag${appliedTagIds.length === 1 ? '' : 's'}`,
				type: 'success',
			};
		} catch (error) {
			logger.error('Failed to apply tags:', error);
			notification = {
				show: true,
				message: error instanceof Error ? error.message : 'Failed to apply tags',
				type: 'error',
			};
		}
	}

	async function handleApplyRelatedTag(tagId: string) {
		if (!photoId || !tagId || applyingRelatedTagId) return;

		try {
			applyingRelatedTagId = tagId;
			const appliedTagIds = await applySuggestedTags({
				tagIds: [tagId],
				source: 'context',
			});

			notification = {
				show: true,
				message: `Applied related tag${appliedTagIds.length === 1 ? '' : 's'} successfully`,
				type: 'success',
			};
		} catch (error) {
			logger.error('Failed to apply related tag:', error);
			notification = {
				show: true,
				message: error instanceof Error ? error.message : 'Failed to apply related tag',
				type: 'error',
			};
		} finally {
			applyingRelatedTagId = null;
		}
	}

	/** Label for face rectangle on image: assigned person name or "Face X". */
	function getFaceLabel(faceIndex: number, matchedPersonId?: string): string {
		if (!matchedPersonId) return `Face ${faceIndex + 1}`;
		const name = getPersonNameById(matchedPersonId);
		return name && name !== 'Unknown' ? name : `Face ${faceIndex + 1}`;
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
				logger.error('[onMount] loadPhoto error:', err);
				error = handleError(err, 'Failed to load photo');
				loading = false;
			});
		} else {
			error = 'No photo ID provided';
			loading = false;
		}
		
		loadOptions().catch((err) => {
			logger.error('[onMount] loadOptions error:', err);
		});
	});

	onDestroy(() => {
		if (dismissFeedbackTimers.ai) clearTimeout(dismissFeedbackTimers.ai);
		if (dismissFeedbackTimers.context) clearTimeout(dismissFeedbackTimers.context);
		void flushSuggestionDismissFeedback('ai');
		void flushSuggestionDismissFeedback('context');
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

<div class="py-8">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if loading}
			<div class="text-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-(--color-primary-600) mx-auto"></div>
				<p class="mt-4 text-(--color-surface-600-400)">Loading photo...!!!</p>
			</div>
		{:else if error && !photo}
			<div class="text-center py-12">
				<h1 class="text-2xl font-bold text-(--color-surface-950-50) mb-4">Error</h1>
				<p class="text-(--color-surface-600-400) mb-4">{error}</p>
				<a href="/admin/albums" class="btn-primary">Back to Albums</a>
			</div>
		{:else if photo}
			<!-- Header -->
			<div class="flex items-center justify-between mb-8">
				<div>
					<h1 class="text-3xl font-bold text-(--color-surface-950-50)">
						{MultiLangUtils.getTextValue(photo.title, $currentLanguage) || photo.filename || 'Edit Photo'}
					</h1>
					{#if photo.title || photo.filename}
						<p class="mt-2 text-(--color-surface-600-400)">
							{photo.filename}
						</p>
					{/if}
				</div>
				<div class="flex items-center gap-3">
					{#if photo.albumId}
						<a
							href="/admin/albums/{photo.albumId}"
							class="px-4 py-2 text-sm font-medium text-(--color-surface-800-200) bg-(--color-surface-50-950) border border-surface-300-700 rounded-md hover:bg-(--color-surface-50-950)"
						>
							← Back to Album
						</a>
					{/if}
				</div>
			</div>

			<!-- Photo Preview -->
			{#if photo}
				{@const photoUrl = getPhotoUrlLocal(photo)}
				<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6 mb-6">
					<div class="flex items-center justify-center">
						{#if photoUrl}
							<img
								src={photoUrl}
								alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || photo.filename}
								class="max-w-full max-h-96 object-contain rounded-lg"
								style="image-orientation: from-image; {getPhotoRotationStyle(photo)}"
								on:error={(e) => {
									const target = e.currentTarget as HTMLImageElement;
									logger.error('[Photo Edit] Image load error:', {
										src: target.src,
										photoId,
										storage: photo?.storage
									});
									if (target) target.style.display = 'none';
								}}
								on:load={() => {
									logger.debug('[Photo Edit] Image loaded successfully:', photoUrl);
								}}
							/>
						{:else}
							<div class="w-full h-64 bg-(--color-surface-200-800) rounded-lg flex items-center justify-center flex-col">
								<svg class="w-12 h-12 text-(--color-surface-400-600)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								<p class="text-sm text-(--color-surface-600-400) mt-2">No image URL available</p>
								<p class="text-xs text-(--color-surface-400-600) mt-1">Storage: {JSON.stringify(photo.storage)}</p>
								<p class="text-xs text-(--color-surface-400-600) mt-1">Photo ID: {photo._id}</p>
								<p class="text-xs text-(--color-surface-400-600) mt-1">Filename: {photo.filename}</p>
							</div>
						{/if}
					</div>
					{#if photo.dimensions}
						<p class="text-sm text-(--color-surface-600-400) text-center mt-2">
							{photo.dimensions.width} × {photo.dimensions.height} pixels
						</p>
					{/if}
					<!-- Rotate -->
					<div class="mt-4">
						<p class="text-xs font-medium text-(--color-surface-800-200) mb-2">Rotate</p>
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								on:click={() => handleRotate(-90)}
								disabled={rotatingPhoto}
								class="px-3 py-1.5 text-sm font-medium text-(--color-surface-800-200) bg-(--color-surface-50-950) border border-surface-300-700 rounded-md hover:bg-(--color-surface-50-950) disabled:opacity-50"
								title="90° counter-clockwise"
							>
								↺ 90° CCW
							</button>
							<button
								type="button"
								on:click={() => handleRotate(90)}
								disabled={rotatingPhoto}
								class="px-3 py-1.5 text-sm font-medium text-(--color-surface-800-200) bg-(--color-surface-50-950) border border-surface-300-700 rounded-md hover:bg-(--color-surface-50-950) disabled:opacity-50"
								title="90° clockwise"
							>
								90° CW ↻
							</button>
							<button
								type="button"
								on:click={() => handleRotate(180)}
								disabled={rotatingPhoto}
								class="px-3 py-1.5 text-sm font-medium text-(--color-surface-800-200) bg-(--color-surface-50-950) border border-surface-300-700 rounded-md hover:bg-(--color-surface-50-950) disabled:opacity-50"
								title="180°"
							>
								180°
							</button>
						</div>
						{#if rotatingPhoto}
							<p class="text-xs text-(--color-surface-600-400) mt-1">Rotating…</p>
						{/if}
					</div>
					<!-- Crop -->
					<div class="mt-4">
						<p class="text-xs font-medium text-(--color-surface-800-200) mb-2">Crop</p>
						<button
							type="button"
							on:click={() => (showCropModal = true)}
							disabled={croppingPhoto || !photoUrl}
							class="px-3 py-1.5 text-sm font-medium text-(--color-surface-800-200) bg-(--color-surface-50-950) border border-surface-300-700 rounded-md hover:bg-(--color-surface-50-950) disabled:opacity-50"
							title="Crop photo"
						>
							✂️ Crop Photo
						</button>
						{#if croppingPhoto}
							<p class="text-xs text-(--color-surface-600-400) mt-1">Cropping…</p>
						{/if}
					</div>
					<!-- Restore original (after crop or other edits) -->
					<div class="mt-4">
						<p class="text-xs font-medium text-(--color-surface-800-200) mb-2">Restore original</p>
						{#if photo.canRestoreOriginal}
							<button
								type="button"
								on:click={handleRestoreOriginal}
								disabled={restoringOriginal}
								class="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 disabled:opacity-50"
								title="Restore photo to the version before crop/edit"
							>
								↩ Restore original
							</button>
							<p class="text-xs text-(--color-surface-600-400) mt-1">Revert to the file as it was before cropping or editing.</p>
							{#if restoringOriginal}
								<p class="text-xs text-amber-600 mt-1">Restoring…</p>
							{/if}
						{:else}
							<p class="text-xs text-(--color-surface-600-400)">
								Not available for this photo. Restore is only possible when the photo was cropped or edited after the feature was enabled (a backup is created then).
							</p>
						{/if}
					</div>
					<div class="mt-4 text-center">
						<button
							type="button"
							on:click={handleRegenerateThumbnails}
							disabled={regeneratingThumbnails}
							class="px-4 py-2 text-sm font-medium text-white bg-(--color-primary-600) border border-transparent rounded-md hover:bg-(--color-primary-700) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500) disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{regeneratingThumbnails ? 'Regenerating...' : 'Rebuild Thumbnails'}
						</button>
						<p class="text-xs text-(--color-surface-600-400) mt-2">
							Regenerate thumbnails with correct orientation
						</p>
					</div>
				</div>
			{/if}

			<!-- Form -->
			<div class="card preset-outlined-surface-200-800 bg-surface-50-950">
				<form on:submit={handleSubmit} class="p-6 space-y-6">
					<!-- Title -->
					<div>
						<div class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
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
						<div class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							Description
						</div>
						{#key `${photoId}-${descriptionLanguage}`}
							<MultiLangHTMLEditor
								bind:value={formData.description}
								placeholder="Enter photo description..."
								height={240}
								defaultLanguage={descriptionLanguage}
							/>
						{/key}
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
								class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
							/>
							<label for="isPublished" class="ml-2 block text-sm text-(--color-surface-800-200)">
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
								class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
							/>
							<label for="isLeading" class="ml-2 block text-sm text-(--color-surface-800-200)">
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
								class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
							/>
							<label for="isGalleryLeading" class="ml-2 block text-sm text-(--color-surface-800-200)">
								Gallery Leading (homepage hero)
							</label>
						</div>
					</div>

					<!-- Tags, People, Location -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<!-- Tags -->
						<div>
							<div class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Tags
							</div>
							{#if loadingOptions}
								<div class="w-full px-3 py-2 border border-surface-300-700 rounded-md bg-(--color-surface-50-950) text-(--color-surface-600-400)">
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
													<span class="inline-flex items-center gap-1 px-2 py-1 bg-[color-mix(in_oklab,var(--color-primary-500)_22%,transparent)] text-(--color-primary-800) text-sm rounded-md">
														{getTagName(tag)}
														<button
															type="button"
															on:click={() => {
																formData.tags = formData.tags.filter((id) => id !== tagId);
																formData = formData;
															}}
															class="hover:text-(--color-primary-900)"
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
										class="w-full px-3 py-2 text-sm border border-surface-300-700 rounded-md bg-(--color-surface-50-950) hover:bg-(--color-surface-50-950) text-(--color-surface-800-200) flex items-center justify-center gap-2 mb-2"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
										Add Tag
									</button>
									<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
										<button
											type="button"
											on:click={handleSuggestTags}
											class="w-full px-3 py-2 text-sm border border-[color-mix(in_oklab,var(--color-primary-500)_24%,transparent)] rounded-md bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] hover:bg-[color-mix(in_oklab,var(--color-primary-500)_22%,transparent)] text-(--color-primary-700) flex items-center justify-center gap-2"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
											</svg>
											Suggest Tags (AI)
										</button>
										<button
											type="button"
											on:click={handleSuggestTagsFromContext}
											class="w-full px-3 py-2 text-sm border border-purple-300 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 flex items-center justify-center gap-2"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4z" />
											</svg>
											Suggest from Context
										</button>
									</div>
									{#if formData.tags && formData.tags.length > 0}
										<div class="mt-3 rounded-md border border-surface-200-800 bg-(--color-surface-50-950) p-3">
											<div class="flex items-center justify-between gap-2">
												<p class="text-xs font-medium text-(--color-surface-800-200)">Related tags</p>
												<p class="text-xs text-(--color-surface-600-400)">Based on current tag co-occurrence</p>
											</div>

											{#if relatedTagsLoading}
												<p class="mt-2 text-xs text-(--color-surface-600-400)">Loading related tags...</p>
											{:else if relatedTagsError}
												<p class="mt-2 text-xs text-red-600">{relatedTagsError}</p>
											{:else if relatedTags.length > 0}
												<div class="mt-3 flex flex-wrap gap-2">
													{#each relatedTags as relatedTag}
														<button
															type="button"
															on:click={() => handleApplyRelatedTag(relatedTag.tagId)}
															disabled={applyingRelatedTagId === relatedTag.tagId}
															class="inline-flex items-center gap-2 rounded-md border border-purple-200 bg-(--color-surface-50-950) px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
															title={`Seen ${relatedTag.count} time${relatedTag.count === 1 ? '' : 's'} with the selected tags`}
														>
															<span>{getLocalizedText(relatedTag.name)}</span>
															<span class="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">
																{relatedTag.count}
															</span>
														</button>
													{/each}
												</div>
											{:else}
												<p class="mt-2 text-xs text-(--color-surface-600-400)">No related tags found for the current selection yet.</p>
											{/if}
										</div>
									{/if}
								</div>
							{/if}
						</div>

						<!-- People -->
						<div>
							<div class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								People
							</div>
							{#if loadingOptions}
								<div class="w-full px-3 py-2 border border-surface-300-700 rounded-md bg-(--color-surface-50-950) text-(--color-surface-600-400)">
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
										class="w-full px-3 py-2 text-sm border border-surface-300-700 rounded-md bg-(--color-surface-50-950) hover:bg-(--color-surface-50-950) text-(--color-surface-800-200) flex items-center justify-center gap-2"
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
							<div class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								Location
							</div>
							{#if loadingOptions}
								<div class="w-full px-3 py-2 border border-surface-300-700 rounded-md bg-(--color-surface-50-950) text-(--color-surface-600-400)">
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
										class="w-full px-3 py-2 text-sm border border-surface-300-700 rounded-md bg-(--color-surface-50-950) hover:bg-(--color-surface-50-950) text-(--color-surface-800-200) flex items-center justify-center gap-2"
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
						{@const photoUrlForFaceRec = getPhotoUrlLocal(photo, true)}
						{#if photo.storage && photoUrlForFaceRec}
							<div class="space-y-6">
								<FaceDetectionViewer
									imageUrl={photoUrlForFaceRec}
									photoId={photoId}
									rotation={photo.rotation}
									detectedFaces={photo.faceRecognition?.faces || []}
									getFaceLabel={getFaceLabel}
									people={people}
									getPersonName={getPersonNameById}
									onFaceDetected={async () => {
										// Allow loadPhoto to run again (do not set lastLoadedPhotoId = null,
										// or the reactive block would also call loadPhoto() and we’d return early)
										loadPhotoCalled = false;
										await loadPhoto();
										// Scroll to face matching so user can set who each face is
										setTimeout(() => {
											document.getElementById('face-matching-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
										}, 150);
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

								{#key photo.faceRecognition?.faces?.length || photo._id}
									<FaceMatchingPanel
										photoId={photoId}
										faces={(photo.faceRecognition?.faces || []).map((face: any) => ({
											box: face.box,
											matchedPersonId: face.matchedPersonId != null ? String(face.matchedPersonId) : undefined,
											confidence: face.confidence,
										}))}
										onMatchComplete={async () => {
											// Reload photo to get updated matches and people list
											loadPhotoCalled = false;
											await loadPhoto();
											// Update formData.people to include newly assigned people
											if (photo) {
												formData.people =
													photo.people?.map((person: any) =>
														typeof person === 'string' ? person : person._id?.toString() || person.toString()
													) || [];
												// Trigger reactivity
												formData = { ...formData };
											}
										}}
										onFaceClick={(index) => {
											// Handle face click if needed
										}}
									/>
								{/key}
							</div>
						{/if}
					{/if}

					<!-- EXIF & Metadata -->
					<div class="space-y-6">
						<!-- EXIF (read-only + re-extract) -->
						<div class="bg-(--color-surface-50-950) rounded-lg p-4">
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-sm font-medium text-(--color-surface-800-200)">EXIF (from camera/file)</h3>
								<button
									type="button"
									on:click={handleReExtractExif}
									disabled={reExtractingExif}
									class="px-3 py-1.5 text-sm font-medium text-(--color-primary-700) bg-[color-mix(in_oklab,var(--color-primary-500)_14%,transparent)] border border-[color-mix(in_oklab,var(--color-primary-500)_18%,transparent)] rounded-md hover:bg-[color-mix(in_oklab,var(--color-primary-500)_22%,transparent)] disabled:opacity-50"
								>
									{reExtractingExif ? 'Extracting...' : 'Re-extract from file'}
								</button>
							</div>
							{#if photo.exif && Object.keys(photo.exif).length > 0}
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm max-h-48 overflow-y-auto">
									{#each Object.entries(photo.exif).filter(([k]) => k !== 'gps') as [key, value]}
										<div class="flex gap-2">
											<span class="font-medium text-(--color-surface-600-400) shrink-0">{key}:</span>
											<span class="text-(--color-surface-900-100) truncate" title={formatExifValue(value)}>{formatExifValue(value)}</span>
										</div>
									{/each}
									{#if photo.exif.gps}
										<div class="sm:col-span-2 flex gap-2">
											<span class="font-medium text-(--color-surface-600-400) shrink-0">gps:</span>
											<span class="text-(--color-surface-900-100)">{formatExifValue(photo.exif.gps)}</span>
										</div>
									{/if}
								</div>
							{:else}
								<p class="text-sm text-(--color-surface-600-400)">No EXIF data. Use "Re-extract from file" to read from the image.</p>
							{/if}
						</div>

						<!-- Override EXIF (date/camera) – merged on save -->
						<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4">
							<h3 class="text-sm font-medium text-(--color-surface-800-200) mb-3">Override EXIF (date / camera)</h3>
							<p class="text-xs text-(--color-surface-600-400) mb-3">Override date taken or camera info. Saved values are merged with existing EXIF.</p>
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div>
									<label for="exif-date" class="block text-xs font-medium text-(--color-surface-600-400) mb-1">Date taken</label>
									<input
										id="exif-date"
										type="datetime-local"
										class="w-full px-3 py-2 border border-surface-300-700 rounded-md text-sm"
										value={formData.exifOverrides.dateTime}
										on:input={(e) => {
											formData.exifOverrides = { ...formData.exifOverrides, dateTime: (e.currentTarget as HTMLInputElement).value };
											formData = formData;
										}}
									/>
								</div>
								<div>
									<label for="exif-make" class="block text-xs font-medium text-(--color-surface-600-400) mb-1">Make</label>
									<input
										id="exif-make"
										type="text"
										class="w-full px-3 py-2 border border-surface-300-700 rounded-md text-sm"
										placeholder="e.g. Canon"
										value={formData.exifOverrides.make}
										on:input={(e) => {
											formData.exifOverrides = { ...formData.exifOverrides, make: (e.currentTarget as HTMLInputElement).value };
											formData = formData;
										}}
									/>
								</div>
								<div>
									<label for="exif-model" class="block text-xs font-medium text-(--color-surface-600-400) mb-1">Model</label>
									<input
										id="exif-model"
										type="text"
										class="w-full px-3 py-2 border border-surface-300-700 rounded-md text-sm"
										placeholder="e.g. EOS R5"
										value={formData.exifOverrides.model}
										on:input={(e) => {
											formData.exifOverrides = { ...formData.exifOverrides, model: (e.currentTarget as HTMLInputElement).value };
											formData = formData;
										}}
									/>
								</div>
							</div>
						</div>

						<!-- Custom metadata (editable) -->
						<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-4">
							<h3 class="text-sm font-medium text-(--color-surface-800-200) mb-3">Custom metadata</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label for="meta-rating" class="block text-xs font-medium text-(--color-surface-600-400) mb-1">Rating (0–5)</label>
									<select
										id="meta-rating"
										class="w-full px-3 py-2 border border-surface-300-700 rounded-md text-sm"
										value={formData.metadata?.rating ?? ''}
										on:change={(e) => {
											const v = (e.currentTarget as HTMLSelectElement).value;
											formData.metadata = { ...formData.metadata, rating: v === '' ? undefined : Number(v) };
											formData = formData;
										}}
									>
										<option value="">—</option>
										{#each [1, 2, 3, 4, 5] as n}
											<option value={n}>{n}</option>
										{/each}
									</select>
								</div>
								<div>
									<label for="meta-category" class="block text-xs font-medium text-(--color-surface-600-400) mb-1">Category</label>
									<input
										id="meta-category"
										type="text"
										class="w-full px-3 py-2 border border-surface-300-700 rounded-md text-sm"
										placeholder="e.g. Event, Project"
										value={formData.metadata?.category ?? ''}
										on:input={(e) => {
											const v = (e.currentTarget as HTMLInputElement).value.trim();
											formData.metadata = { ...formData.metadata, category: v || undefined };
											formData = formData;
										}}
									/>
								</div>
							</div>
							<p class="text-xs text-(--color-surface-600-400) mt-2">Rating and category can also be set in bulk from the album page.</p>
						</div>
					</div>

					<!-- Read-only Information -->
					<div class="bg-(--color-surface-50-950) rounded-lg p-4">
						<h3 class="text-sm font-medium text-(--color-surface-800-200) mb-3">Photo Information</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<span class="font-medium text-(--color-surface-800-200)">Filename:</span>
								<span class="ml-2 text-(--color-surface-600-400)">{photo.filename}</span>
							</div>
							{#if photo.uploadedAt}
								<div>
									<span class="font-medium text-(--color-surface-800-200)">Uploaded:</span>
									<span class="ml-2 text-(--color-surface-600-400)">
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
					<div class="flex justify-end space-x-3 pt-6 border-t border-surface-200-800">
						{#if photo.albumId}
							<a
								href="/admin/albums/{photo.albumId}"
								class="px-4 py-2 text-sm font-medium text-(--color-surface-800-200) bg-(--color-surface-50-950) border border-surface-300-700 rounded-md hover:bg-(--color-surface-50-950) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)"
							>
								Cancel
							</a>
						{:else}
							<a
								href="/admin/albums"
								class="px-4 py-2 text-sm font-medium text-(--color-surface-800-200) bg-(--color-surface-50-950) border border-surface-300-700 rounded-md hover:bg-(--color-surface-50-950) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500)"
							>
								Cancel
							</a>
						{/if}
						<button
							type="submit"
							disabled={saving}
							class="px-4 py-2 text-sm font-medium text-white bg-(--color-primary-600) border border-transparent rounded-md hover:bg-(--color-primary-700) focus:outline-none focus:ring-2 focus:ring-(--color-primary-500) disabled:opacity-50 disabled:cursor-not-allowed"
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

<TagSuggestionsModal
	isOpen={showAITagSuggestions}
	suggestions={aiTagSuggestions}
	loading={aiTagSuggestionsLoading}
	error={aiTagSuggestionsError}
	provider={aiTagProvider}
	processingTime={aiTagProcessingTime}
	onApply={handleApplyAITags}
	onDismiss={handleDismissAISuggestion}
	on:close={() => {
		queueSuggestionDismissFeedback('ai', aiTagSuggestions);
		void flushSuggestionDismissFeedback('ai');
		showAITagSuggestions = false;
		aiTagSuggestions = [];
		aiTagSuggestionsError = null;
	}}
	on:apply={(e) => handleApplyAITags(e.detail)}
	on:dismiss={(e) => handleDismissAISuggestion(e.detail)}
/>

<TagSuggestionsModal
	isOpen={showContextTagSuggestions}
	suggestions={contextTagSuggestions}
	loading={contextTagSuggestionsLoading}
	error={contextTagSuggestionsError}
	provider="context"
	processingTime={0}
	onApply={handleApplyContextTags}
	onDismiss={handleDismissContextSuggestion}
	on:close={() => {
		queueSuggestionDismissFeedback('context', contextTagSuggestions);
		void flushSuggestionDismissFeedback('context');
		showContextTagSuggestions = false;
		contextTagSuggestions = [];
		contextTagSuggestionsError = null;
	}}
	on:apply={(e) => handleApplyContextTags(e.detail)}
	on:dismiss={(e) => handleDismissContextSuggestion(e.detail)}
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

<!-- Crop Modal -->
{#if showCropModal && photo}
	{@const fullPhotoUrl = getPhotoFullUrl(photo, '')}
	<div class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
		<div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
			<!-- Background overlay -->
			<div
				class="fixed inset-0 transition-opacity bg-(--color-surface-50-950)0 bg-opacity-75"
				role="button"
				tabindex="-1"
				on:click={() => (showCropModal = false)}
				on:keydown={(e) => {
					if (e.key === 'Escape') {
						showCropModal = false;
					}
				}}
			></div>

			<!-- Modal panel -->
			<div
				class="inline-block align-bottom card preset-outlined-surface-200-800 bg-surface-50-950 shadow-xl text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
			>
				<div class="bg-(--color-surface-50-950) px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-medium text-(--color-surface-950-50)">Crop Photo</h3>
						<button
							type="button"
							on:click={() => (showCropModal = false)}
							class="text-(--color-surface-400-600) hover:text-(--color-surface-600-400)"
							aria-label="Close crop modal"
						>
							<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					{#if fullPhotoUrl}
						<PhotoCropper
							imageUrl={fullPhotoUrl}
							onCrop={handleCrop}
							onCancel={() => (showCropModal = false)}
						/>
					{:else}
						<p class="text-(--color-surface-600-400)">Unable to load image for cropping</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
