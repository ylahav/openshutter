import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { connectToDatabase } from '$lib/mongodb';
import type { SiteConfig, SiteConfigUpdate } from '$lib/types/site-config';
import { MultiLangUtils } from '$lib/utils/multiLang';

/**
 * Get default configuration
 */
function getDefaultConfig(): SiteConfig {
	return {
		title: { en: 'OpenShutter Gallery' },
		description: { en: 'A beautiful photo gallery showcasing amazing moments' },
		logo: '',
		favicon: '',
		languages: {
			activeLanguages: ['en'],
			defaultLanguage: 'en'
		},
		theme: {
			primaryColor: '#0ea5e9',
			secondaryColor: '#64748b',
			backgroundColor: '#ffffff',
			textColor: '#1e293b'
		},
		seo: {
			metaTitle: { en: 'OpenShutter Gallery - Beautiful Photo Gallery' },
			metaDescription: { en: 'Discover amazing photos in our beautiful gallery' },
			metaKeywords: ['gallery', 'photos', 'photography', 'images', 'art']
		},
		contact: {
			email: '',
			phone: '',
			address: { en: '' },
			socialMedia: {
				facebook: '',
				instagram: '',
				twitter: '',
				linkedin: ''
			}
		},
		homePage: {
			services: [],
			contactTitle: { en: 'Get In Touch' }
		},
		features: {
			enableComments: true,
			enableSharing: true,
			enableDownload: false,
			enableWatermark: false,
			maxUploadSize: '10MB'
		},
		template: {
			activeTemplate: 'modern'
		},
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

/**
 * Migrate existing string-based title/description to multi-language format
 */
function migrateToMultiLang(config: any): any {
	// Convert string title to multi-language format
	if (typeof config.title === 'string') {
		config.title = { en: config.title };
	} else if (config.title && typeof config.title === 'object') {
		// Clean existing multi-language title
		config.title = MultiLangUtils.clean(config.title);
	}

	// Convert string description to multi-language format
	if (typeof config.description === 'string') {
		config.description = { en: config.description };
	} else if (config.description && typeof config.description === 'object') {
		// Clean existing multi-language description
		config.description = MultiLangUtils.clean(config.description);
	}

	return config;
}

/**
 * Get site configuration from database
 */
async function getConfigFromDB(): Promise<SiteConfig | null> {
	const { db } = await connectToDatabase();
	const collection = db.collection('site_config');

	const config = await collection.findOne({});
	if (!config) {
		return null;
	}

	// Migrate to multi-language format if needed
	const migratedConfig = migrateToMultiLang(config);

	// Merge with default config to ensure all fields exist
	const defaultConfig = getDefaultConfig();
	return {
		...defaultConfig,
		...migratedConfig,
		// Ensure languages field exists
		languages: migratedConfig.languages || defaultConfig.languages,
		// Handle backward compatibility for title and description
		title: migratedConfig.title || defaultConfig.title,
		description: migratedConfig.description || defaultConfig.description,
		// Ensure contact.socialMedia object is properly structured
		contact: {
			...defaultConfig.contact,
			...migratedConfig.contact,
			socialMedia: {
				...defaultConfig.contact.socialMedia,
				...(migratedConfig.contact?.socialMedia || {})
			}
		}
	} as unknown as SiteConfig;
}

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const config = await getConfigFromDB();

		// Return default config if none exists
		const finalConfig = config || getDefaultConfig();

		return json({
			success: true,
			data: finalConfig
		});
	} catch (error) {
		console.error('API: Failed to get site config:', error);
		return json({ success: false, error: 'Failed to get site configuration' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const updates: SiteConfigUpdate = await request.json();
		const { db } = await connectToDatabase();
		const collection = db.collection('site_config');

		// Clean multi-language fields if provided
		const cleanedUpdates: any = { ...updates };
		if (updates.title) {
			cleanedUpdates.title = MultiLangUtils.clean(updates.title);
		}
		if (updates.description) {
			cleanedUpdates.description = MultiLangUtils.clean(updates.description);
		}
		if (updates.seo?.metaTitle) {
			cleanedUpdates.seo = {
				...updates.seo,
				metaTitle: MultiLangUtils.clean(updates.seo.metaTitle)
			};
		}
		if (updates.seo?.metaDescription) {
			cleanedUpdates.seo = {
				...updates.seo,
				metaDescription: MultiLangUtils.clean(updates.seo.metaDescription)
			};
		}
		if (updates.contact?.address) {
			cleanedUpdates.contact = {
				...updates.contact,
				address: MultiLangUtils.clean(updates.contact.address)
			};
		}

		const updateData = {
			...cleanedUpdates,
			updatedAt: new Date()
		};

		// Update or create config
		await collection.updateOne({}, { $set: updateData }, { upsert: true });

		// Return updated config
		const config = await getConfigFromDB();
		const finalConfig = config || getDefaultConfig();

		return json({
			success: true,
			data: finalConfig
		});
	} catch (error) {
		console.error('Failed to update site config:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to update site configuration: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

