import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Language metadata mapping
const languageMetadata: Record<string, { name: string; flag: string }> = {
	en: { name: 'English', flag: '🇺🇸' },
	he: { name: 'Hebrew', flag: '🇮🇱' },
	ar: { name: 'Arabic', flag: '🇸🇦' },
	es: { name: 'Spanish', flag: '🇪🇸' },
	fr: { name: 'French', flag: '🇫🇷' },
	de: { name: 'German', flag: '🇩🇪' },
	it: { name: 'Italian', flag: '🇮🇹' },
	pt: { name: 'Portuguese', flag: '🇵🇹' },
	ru: { name: 'Russian', flag: '🇷🇺' },
	ja: { name: 'Japanese', flag: '🇯🇵' },
	ko: { name: 'Korean', flag: '🇰🇷' },
	zh: { name: 'Chinese', flag: '🇨🇳' },
	nl: { name: 'Dutch', flag: '🇳🇱' },
	sv: { name: 'Swedish', flag: '🇸🇪' },
	no: { name: 'Norwegian', flag: '🇳🇴' },
	da: { name: 'Danish', flag: '🇩🇰' },
	fi: { name: 'Finnish', flag: '🇫🇮' },
	pl: { name: 'Polish', flag: '🇵🇱' },
	tr: { name: 'Turkish', flag: '🇹🇷' },
	hi: { name: 'Hindi', flag: '🇮🇳' }
};

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Read the i18n directory to get available language files
		const i18nPath = join(process.cwd(), 'src', 'i18n');

		// Check if i18n directory exists
		if (!existsSync(i18nPath)) {
			console.warn(`i18n directory not found: ${i18nPath}`);
			// Return default languages from metadata
			const defaultLanguages = Object.keys(languageMetadata).map((code) => ({
				code,
				name: languageMetadata[code].name,
				flag: languageMetadata[code].flag
			}));
			defaultLanguages.sort((a, b) => a.name.localeCompare(b.name));
			return json({
				success: true,
				data: defaultLanguages
			});
		}

		const files = await readdir(i18nPath);

		// Filter for .json files and extract language codes
		const languageFiles = files.filter((file) => file.endsWith('.json')).map((file) => file.replace('.json', ''));

		// Map language codes to their metadata
		const availableLanguages = languageFiles.map((code) => {
			const metadata = languageMetadata[code] || {
				name: code.toUpperCase(),
				flag: '🌐'
			};
			return {
				code,
				name: metadata.name,
				flag: metadata.flag
			};
		});

		// Sort languages alphabetically by name
		availableLanguages.sort((a, b) => a.name.localeCompare(b.name));

		return json({
			success: true,
			data: availableLanguages
		});
	} catch (error) {
		console.error('Error reading language files:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to load available languages: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

