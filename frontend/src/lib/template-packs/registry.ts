import type { TemplatePack } from './types';
import type { SvelteComponentConstructor } from './types';
import { logger } from '$lib/utils/logger';
import { normalizeTemplatePackId } from './ids';
import type { TemplatePackId } from './ids';
export { TEMPLATE_PACK_IDS, isKnownTemplatePack, normalizeTemplatePackId } from './ids';
export type { TemplatePackId } from './ids';

type ModuleDefault = { default: SvelteComponentConstructor };

const packCache = new Map<TemplatePackId, TemplatePack>();

const packLoaders: Record<TemplatePackId, () => Promise<TemplatePack>> = {
	noir: async () => {
		const [Home, Gallery, Album, Login] = await Promise.all([
			import('$lib/templates/noir/Home.svelte'),
			import('$lib/templates/noir/Gallery.svelte'),
			import('$lib/templates/noir/Album.svelte'),
			import('$lib/templates/noir/Login.svelte')
		]);
		return {
			name: 'noir',
			pages: {
				Home: (Home as ModuleDefault).default,
				Gallery: (Gallery as ModuleDefault).default,
				Album: (Album as ModuleDefault).default,
				Login: (Login as ModuleDefault).default
			}
		};
	},
	studio: async () => {
		const [Home, Gallery, Album, Login] = await Promise.all([
			import('$lib/templates/studio/Home.svelte'),
			import('$lib/templates/studio/Gallery.svelte'),
			import('$lib/templates/studio/Album.svelte'),
			import('$lib/templates/studio/Login.svelte')
		]);
		return {
			name: 'studio',
			pages: {
				Home: (Home as ModuleDefault).default,
				Gallery: (Gallery as ModuleDefault).default,
				Album: (Album as ModuleDefault).default,
				Login: (Login as ModuleDefault).default
			}
		};
	},
	atelier: async () => {
		const [Home, Gallery, Album, Login] = await Promise.all([
			import('$lib/templates/atelier/Home.svelte'),
			import('$lib/templates/atelier/Gallery.svelte'),
			import('$lib/templates/atelier/Album.svelte'),
			import('$lib/templates/atelier/Login.svelte')
		]);
		return {
			name: 'atelier',
			pages: {
				Home: (Home as ModuleDefault).default,
				Gallery: (Gallery as ModuleDefault).default,
				Album: (Album as ModuleDefault).default,
				Login: (Login as ModuleDefault).default
			}
		};
	}
};

export async function getTemplatePack(templateName: string | null | undefined): Promise<TemplatePack> {
	const key = normalizeTemplatePackId(templateName);
	const cached = packCache.get(key);
	if (cached) return cached;

	try {
		const pack = await packLoaders[key]();
		packCache.set(key, pack);
		return pack;
	} catch (err) {
		logger.error(`[TemplatePacks] Failed loading pack "${key}", falling back to atelier`, err);
		const fallback = await packLoaders.atelier();
		packCache.set('atelier', fallback);
		return fallback;
	}
}

export async function listTemplatePacks(): Promise<TemplatePack[]> {
	return Promise.all(Object.keys(packLoaders).map((name) => getTemplatePack(name)));
}
