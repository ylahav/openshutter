import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'../src/routes/admin/photos/[id]/edit/+page.svelte',
);
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let s = raw.replace(/\r\n/g, '\n');

if (s.includes('export let data')) {
	console.log('SSR data already wired');
	process.exit(0);
}

s = s.replace(
	`import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';`,
	`import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import {
		buildFormDataFromPhoto,
		normalizeLoadedPhoto,
		type PhotoEditRecord,
	} from '$lib/admin/photoEditLoad';

	export let data: PageData;
	import { currentLanguage } from '$stores/language';`,
);

s = s.replace(
	`const loading = writable(true);
	let photoLoadDone = false;`,
	`const loading = writable(!data.initialPhoto && !data.loadError);
	let photoLoadDone = false;`,
);

s = s.replace(
	`let error = '';`,
	`let error = data.loadError ?? '';`,
);

s = s.replace(
	`async function loadPhoto() {
		if (photoLoadDone) {
			return;
		}

		if (!photoId) {`,
	`function applyLoadedPhotoRecord(raw: PhotoEditRecord) {
		const loaded = normalizeLoadedPhoto(raw);
		photo = loaded as Photo;
		const built = buildFormDataFromPhoto(loaded, $currentLanguage);
		formData = { ...built.formData };
		descriptionLanguage = built.descriptionLanguage;
	}

	async function loadPhoto() {
		if (photoLoadDone) {
			return;
		}

		if (!photoId) {`,
);

s = s.replace(
	`let loadedPhoto = responseData.data || responseData;
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
				// Debug: Log storage information
				logger.debug('[loadPhoto] Photo loaded:', {
					photoId,
					hasStorage: !!photo?.storage,
					storage: photo?.storage,
					photoUrl: photo ? getPhotoUrlLocal(photo) : 'N/A',
					faceCount: photo?.faceRecognition?.faces?.length ?? 0,
					responseStructure: { hasData: !!responseData.data, hasSuccess: !!responseData.success }
				});
			} catch (fetchError: any) {`,
	`const loadedPhoto = (responseData.data || responseData) as PhotoEditRecord;
				applyLoadedPhotoRecord(loadedPhoto);
				logger.debug('[loadPhoto] Photo loaded:', {
					photoId,
					hasStorage: !!photo?.storage,
					photoUrl: photo ? getPhotoUrlLocal(photo) : 'N/A',
					faceCount: photo?.faceRecognition?.faces?.length ?? 0,
				});
			} catch (fetchError: any) {`,
);

// Remove duplicate form init block inside loadPhoto (now in applyLoadedPhotoRecord)
const formInitStart = `\n\t\t\t// Initialize form data\n\t\t\tif (photo) {`;
const formInitEnd = `\n\t\t\t\tformData = { ...formData };\n\t\t\t}\n\t\t} catch (err) {`;
const startIdx = s.indexOf(formInitStart);
const endIdx = s.indexOf(formInitEnd);
if (startIdx >= 0 && endIdx > startIdx) {
	s = s.slice(0, startIdx) + s.slice(endIdx);
}

s = s.replace(
	`onMount(() => {
		if (!browser) {
			loading.set(false);
			return;
		}

		if (photoId) {
			void loadPhoto();
		} else {`,
	`if (data.initialPhoto && photoId === data.photoId) {
		applyLoadedPhotoRecord(data.initialPhoto as PhotoEditRecord);
		photoLoadDone = true;
		loading.set(false);
	}

	onMount(() => {
		if (!browser) {
			loading.set(false);
			return;
		}

		if (photoId && !photoLoadDone) {
			void loadPhoto();
		} else if (!photoId) {`,
);

fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('Patched SSR:', file);
