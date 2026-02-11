// frontend/src/lib/page-builder/modules/FeatureGrid/config.ts
export const featureGridConfig = {
	type: 'featureGrid',
	label: 'Feature Grid',
	description: 'Grid of feature cards with icons, titles and descriptions.',
	fields: [
		{ key: 'title', type: 'multilangText', label: 'Title', required: false },
		{ key: 'subtitle', type: 'multilangText', label: 'Subtitle', required: false },
		{ key: 'features', type: 'featureList', label: 'Features', required: false },
	],
} as const;
