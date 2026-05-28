import { handleApiErrorResponse } from '$lib/utils/errorHandler';

export type PhotoEditRecord = Record<string, unknown> & {
	_id?: string;
	title?: unknown;
	description?: unknown;
	isPublished?: boolean;
	isLeading?: boolean;
	isGalleryLeading?: boolean;
	tags?: unknown[];
	people?: unknown[];
	location?: unknown;
	metadata?: Record<string, unknown>;
	exif?: Record<string, unknown> | null;
	faceRecognition?: { faces?: unknown[] };
	canRestoreOriginal?: boolean;
};

export type PhotoEditFormData = {
	title: Record<string, string>;
	description: Record<string, string>;
	isPublished: boolean;
	isLeading: boolean;
	isGalleryLeading: boolean;
	tags: string[];
	people: string[];
	location: string | null;
	metadata: Record<string, unknown>;
	exifOverrides: { dateTime: string; make: string; model: string };
};

export function normalizeLoadedPhoto(raw: PhotoEditRecord): PhotoEditRecord {
	let loaded = { ...raw };
	if (loaded.faceRecognition?.faces && Array.isArray(loaded.faceRecognition.faces)) {
		loaded = {
			...loaded,
			faceRecognition: {
				...loaded.faceRecognition,
				faces: loaded.faceRecognition.faces.map((f: unknown) => {
					const face = f as {
						box?: { x: number; y: number; width: number; height: number };
						matchedPersonId?: unknown;
						confidence?: number;
					};
					return {
						box: face.box || { x: 0, y: 0, width: 0, height: 0 },
						matchedPersonId:
							face.matchedPersonId != null ? String(face.matchedPersonId) : undefined,
						confidence: face.confidence,
					};
				}),
			},
		};
	}
	return {
		...loaded,
		canRestoreOriginal: loaded.canRestoreOriginal === true,
	};
}

export function buildFormDataFromPhoto(
	photo: PhotoEditRecord,
	currentLanguage: string,
): { formData: PhotoEditFormData; descriptionLanguage: string } {
	const formData: PhotoEditFormData = {
		title: typeof photo.title === 'string' ? { en: photo.title } : (photo.title as Record<string, string>) || {},
		description:
			typeof photo.description === 'string'
				? { en: photo.description }
				: (photo.description as Record<string, string>) || {},
		isPublished: Boolean(photo.isPublished),
		isLeading: Boolean(photo.isLeading),
		isGalleryLeading: Boolean(photo.isGalleryLeading),
		tags:
			photo.tags?.map((tag: unknown) =>
				typeof tag === 'string' ? tag : String((tag as { _id?: unknown })._id ?? tag),
			) || [],
		people:
			photo.people?.map((person: unknown) =>
				typeof person === 'string' ? person : String((person as { _id?: unknown })._id ?? person),
			) || [],
		location: photo.location
			? typeof photo.location === 'string'
				? photo.location
				: String((photo.location as { _id?: unknown })._id ?? photo.location)
			: null,
		metadata: photo.metadata && typeof photo.metadata === 'object' ? { ...photo.metadata } : {},
		exifOverrides: { dateTime: '', make: '', model: '' },
	};

	const descriptionEntries = Object.entries(formData.description || {}).filter(
		([, value]) => typeof value === 'string' && value.trim().length > 0,
	);
	const firstAvailableLanguage = descriptionEntries.length > 0 ? descriptionEntries[0][0] : 'en';
	const preferredLanguage =
		currentLanguage && formData.description?.[currentLanguage]?.trim()
			? currentLanguage
			: formData.description?.en?.trim()
				? 'en'
				: firstAvailableLanguage;

	const descriptionLanguage = preferredLanguage || currentLanguage || 'en';
	if (
		currentLanguage &&
		formData.description &&
		!formData.description[currentLanguage] &&
		formData.description[descriptionLanguage]
	) {
		formData.description = {
			...formData.description,
			[currentLanguage]: formData.description[descriptionLanguage],
		};
	}

	const ex = photo.exif && typeof photo.exif === 'object' ? photo.exif : {};
	const dt = ex.dateTime ?? ex.dateTimeOriginal ?? ex.dateTimeDigitized;
	formData.exifOverrides = {
		dateTime: dt
			? typeof dt === 'string'
				? dt.slice(0, 16)
				: new Date(dt as Date).toISOString().slice(0, 16)
			: '',
		make: (ex.make as string) ?? '',
		model: (ex.model as string) ?? '',
	};

	return { formData, descriptionLanguage };
}

export async function fetchPhotoForEdit(photoId: string, signal?: AbortSignal): Promise<PhotoEditRecord> {
	const url = `/api/admin/photos/${photoId}?t=${Date.now()}`;
	const response = await fetch(url, {
		cache: 'no-store',
		signal,
		credentials: 'include',
	});
	if (!response.ok) {
		await handleApiErrorResponse(response);
	}
	const responseData = await response.json();
	const loadedPhoto = (responseData.data || responseData) as PhotoEditRecord;
	if (!loadedPhoto || typeof loadedPhoto !== 'object') {
		throw new Error('Invalid photo response');
	}
	return normalizeLoadedPhoto(loadedPhoto);
}
