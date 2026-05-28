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

function mustReplace(from, to, label) {
	if (!s.includes(from)) {
		console.error(`[${label}] pattern not found`);
		process.exit(1);
	}
	s = s.replace(from, to);
}

mustReplace(
	`let photoId: string = '';
	let photo: Photo | null = null;
	const loading = writable(true);`,
	`$: photoId = $page.params.id ?? '';
	let photo = $state<Photo | null>(null);
	const loading = writable(true);
	let photoLoadDone = false;`,
	'state vars',
);

mustReplace(
	`let error = '';
	
	let tags: Tag[] = [];
	let people: Person[] = [];
	let locations: Location[] = [];
	let loadingOptions = true;
	let loadPhotoCalled = false;`,
	`let error = '';

	let tags: Tag[] = [];
	let people: Person[] = [];
	let locations: Location[] = [];
	let loadingOptions = true;`,
	'remove loadPhotoCalled',
);

mustReplace(
	`\t// Track the last loaded photoId to prevent reloading the same photo
\tlet lastLoadedPhotoId: string | null = null;
\t
\t// Update photoId from route params reactively
\t$: {
\t\tconst id = $page.params.id || '';
\t\tif (id && id !== photoId) {
\t\t\tphotoId = id;
\t\t\t// Reset loading state when navigating to a new photo
\t\t\tloadPhotoCalled = false;
\t\t\tlastLoadedPhotoId = null; // Reset so new photo can be loaded
\t\t}
\t}
\t
\t// Load photo when photoId changes (for navigation between photos)
\t// Only trigger once per photoId change
\t$: if (browser && photoId && !loadPhotoCalled && photoId !== lastLoadedPhotoId) {
\t\tloadPhoto().catch((err) => {
\t\t\tlogger.error('[Reactive] loadPhoto error:', err);
\t\t\terror = handleError(err, 'Failed to load photo');
\t\t\tloading.set(false);
\t\t\tloadPhotoCalled = false; // Reset on error so it can retry
\t\t\tlastLoadedPhotoId = null; // Reset on error
\t\t});
\t}

\t$: {`,
	`\t$: {`,
	'remove reactive loadPhoto',
);

mustReplace(
	`\tasync function loadPhoto() {
\t\tif (loadPhotoCalled) {
\t\t\treturn;
\t\t}
\t\t
\t\tif (!photoId) {
\t\t\terror = 'No photo ID provided';
\t\t\tloading.set(false);
\t\t\treturn;
\t\t}
\t\t
\t\tloadPhotoCalled = true;
\t\t
\t\tlet timeoutId`,
	`\tasync function loadPhoto() {
\t\tif (photoLoadDone) {
\t\t\treturn;
\t\t}

\t\tif (!photoId) {
\t\t\terror = 'No photo ID provided';
\t\t\tloading.set(false);
\t\t\treturn;
\t\t}

\t\tphotoLoadDone = true;

\t\tlet timeoutId`,
	'loadPhoto guard',
);

mustReplace(
				`const responseData = await response.json();
				loading.set(false);
				// Extract photo data from response`,
				`const responseData = await response.json();
				// Extract photo data from response`,
	'remove early loading false',
);

mustReplace(
				`lastLoadedPhotoId = photoId; // Mark this photo as loaded
				
				// Debug: Log storage information`,
				`// Debug: Log storage information`,
	'remove lastLoadedPhotoId',
);

mustReplace(
	`\t\t\t// Don't reset loadPhotoCalled here - it's reset when photoId changes in the reactive block above`,
	`\t\t\t// photoLoadDone stays true until photoId changes`,
	'finally comment',
);

mustReplace(
	`onMount(() => {
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
	});`,
	`onMount(() => {
		if (!browser) {
			loading.set(false);
			return;
		}

		if (photoId) {
			void loadPhoto();
		} else {
			error = 'No photo ID provided';
			loading.set(false);
		}

		loadOptions().catch((err) => {
			logger.error('[onMount] loadOptions error:', err);
		});
	});`,
	'onMount',
);

// Reload helpers after crop/rotate/etc.
s = s.replaceAll(
	`loadPhotoCalled = false;
				lastLoadedPhotoId = null;
				loadPhoto();`,
	`photoLoadDone = false;
				void loadPhoto();`,
);
s = s.replace(
	`loadPhotoCalled = false;
			lastLoadedPhotoId = null;
			await loadPhoto();`,
	`photoLoadDone = false;
			await loadPhoto();`,
);
s = s.replace(
	`loadPhotoCalled = false;
										await loadPhoto();`,
	`photoLoadDone = false;
										await loadPhoto();`,
);
s = s.replace(
	`loadPhotoCalled = false;
											await loadPhoto();`,
	`photoLoadDone = false;
											await loadPhoto();`,
);

// Face detection block (curly apostrophe in comment)
s = s.replace(
	/\t\t\t\t\t\t\t\t\t\t\/\/ Allow loadPhoto[\s\S]*?await loadPhoto\(\);/,
	`\t\t\t\t\t\t\t\t\t\tphotoLoadDone = false;
\t\t\t\t\t\t\t\t\t\tawait loadPhoto();`,
);

if (s.includes('loadPhotoCalled') || s.includes('lastLoadedPhotoId')) {
	console.error('Leftover:', s.match(/loadPhotoCalled|lastLoadedPhotoId/g));
	process.exit(1);
}

fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('Patched reactivity:', file);
