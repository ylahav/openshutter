// frontend/src/lib/page-builder/modules/AlbumGallery/config.ts
export const albumGalleryConfig = {
	type: 'albumsGrid',
	label: 'Albums Grid',
	description: 'Grid of album galleries with cover images.',
	fields: [
		{ key: 'title', type: 'multilangText', label: 'Title', required: false },
		{ key: 'description', type: 'multilangHTML', label: 'Description', required: false },
		{ key: 'selectedAlbums', type: 'albumPicker', label: 'Selected albums', required: false },
	],
} as const;
