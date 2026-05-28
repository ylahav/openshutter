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

// Consolidate imports: move export let block to after all imports as $props()
s = s.replace(
	`} from '$lib/admin/photoEditLoad';

	export let data: PageData;
	import { currentLanguage } from '$stores/language';`,
	`} from '$lib/admin/photoEditLoad';
	import { currentLanguage } from '$stores/language';`,
);

if (!s.includes('$props()')) {
	s = s.replace(
		`import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

	interface Photo {`,
		`import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

	let { data }: { data: PageData } = $props();

	interface Photo {`,
	);
}

s = s.replace(
	`$: photoId = $page.params.id ?? '';`,
	`const photoId = $derived($page.params.id ?? data.photoId ?? '');`,
);

s = s.replace(
	`\t$: {
\t\tconst selectedTagIds = [...new Set((formData.tags || []).map((tagId) => String(tagId).trim()).filter(Boolean))].sort();
\t\tconst relatedTagsKey = photoId && selectedTagIds.length > 0 ? \`\${photoId}:\${selectedTagIds.join(',')}\` : '';

\t\tif (!relatedTagsKey) {
\t\t\tlastRelatedTagsKey = '';
\t\t\trelatedTags = [];
\t\t\trelatedTagsError = null;
\t\t\trelatedTagsLoading = false;
\t\t} else if (relatedTagsKey !== lastRelatedTagsKey) {
\t\t\tlastRelatedTagsKey = relatedTagsKey;
\t\t\tloadRelatedTags(selectedTagIds, relatedTagsKey);
\t\t}
\t}`,
	`\t$effect(() => {
\t\tconst selectedTagIds = [...new Set((formData.tags || []).map((tagId) => String(tagId).trim()).filter(Boolean))].sort();
\t\tconst relatedTagsKey = photoId && selectedTagIds.length > 0 ? \`\${photoId}:\${selectedTagIds.join(',')}\` : '';

\t\tif (!relatedTagsKey) {
\t\t\tlastRelatedTagsKey = '';
\t\t\trelatedTags = [];
\t\t\trelatedTagsError = null;
\t\t\trelatedTagsLoading = false;
\t\t} else if (relatedTagsKey !== lastRelatedTagsKey) {
\t\t\tlastRelatedTagsKey = relatedTagsKey;
\t\t\tloadRelatedTags(selectedTagIds, relatedTagsKey);
\t\t}
\t});`,
);

s = s.replace(
	`if (data.initialPhoto && photoId === data.photoId) {
\t\tapplyLoadedPhotoRecord(data.initialPhoto as PhotoEditRecord);
\t\tphotoLoadDone = true;
\t\tloading.set(false);
\t}

\tonMount(() => {
\t\tif (!browser) {
\t\t\tloading.set(false);
\t\t\treturn;
\t\t}

\t\tif (photoId && !photoLoadDone) {
\t\t\tvoid loadPhoto();
\t\t} else if (!photoId) {`,
	`onMount(() => {
\t\tif (!browser) {
\t\t\tloading.set(false);
\t\t\treturn;
\t\t}

\t\tif (data.initialPhoto && photoId === data.photoId) {
\t\t\tapplyLoadedPhotoRecord(data.initialPhoto as PhotoEditRecord);
\t\t\tphotoLoadDone = true;
\t\t\tloading.set(false);
\t\t} else if (photoId && !photoLoadDone) {
\t\t\tvoid loadPhoto();
\t\t} else if (!photoId) {`,
);

if (s.includes('export let data')) {
	console.error('still has export let data');
	process.exit(1);
}

fs.writeFileSync(file, crlf ? s.replace(/\n/g, '\r\n') : s);
console.log('Fixed runes props:', file);
