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
		const [Home, Gallery, Album, About, Search, Contact, CmsPage, Login] = await Promise.all([
			import('$templates/noir/Home.svelte'),
			import('$templates/noir/Gallery.svelte'),
			import('$templates/noir/Album.svelte'),
			import('$templates/noir/About.svelte'),
			import('$templates/noir/Search.svelte'),
			import('$templates/noir/Contact.svelte'),
			import('$templates/noir/CmsPage.svelte'),
			import('$templates/noir/Login.svelte')
		]);
		return {
			name: 'noir',
			pages: {
				Home: (Home as ModuleDefault).default,
				Gallery: (Gallery as ModuleDefault).default,
				Album: (Album as ModuleDefault).default,
				About: (About as ModuleDefault).default,
				Search: (Search as ModuleDefault).default,
				Contact: (Contact as ModuleDefault).default,
				CmsPage: (CmsPage as ModuleDefault).default,
				Login: (Login as ModuleDefault).default
			}
		};
	},
	studio: async () => {
		const [Home, Gallery, Album, About, Search, Contact, CmsPage, Login] = await Promise.all([
			import('$templates/studio/Home.svelte'),
			import('$templates/studio/Gallery.svelte'),
			import('$templates/studio/Album.svelte'),
			import('$templates/studio/About.svelte'),
			import('$templates/studio/Search.svelte'),
			import('$templates/studio/Contact.svelte'),
			import('$templates/studio/CmsPage.svelte'),
			import('$templates/studio/Login.svelte')
		]);
		return {
			name: 'studio',
			pages: {
				Home: (Home as ModuleDefault).default,
				Gallery: (Gallery as ModuleDefault).default,
				Album: (Album as ModuleDefault).default,
				About: (About as ModuleDefault).default,
				Search: (Search as ModuleDefault).default,
				Contact: (Contact as ModuleDefault).default,
				CmsPage: (CmsPage as ModuleDefault).default,
				Login: (Login as ModuleDefault).default
			}
		};
	},
	atelier: async () => {
		const [Home, Gallery, Album, About, Search, Contact, CmsPage, Login] = await Promise.all([
			import('$templates/atelier/Home.svelte'),
			import('$templates/atelier/Gallery.svelte'),
			import('$templates/atelier/Album.svelte'),
			import('$templates/atelier/About.svelte'),
			import('$templates/atelier/Search.svelte'),
			import('$templates/atelier/Contact.svelte'),
			import('$templates/atelier/CmsPage.svelte'),
			import('$templates/atelier/Login.svelte')
		]);
		return {
			name: 'atelier',
			pages: {
				Home: (Home as ModuleDefault).default,
				Gallery: (Gallery as ModuleDefault).default,
				Album: (Album as ModuleDefault).default,
				About: (About as ModuleDefault).default,
				Search: (Search as ModuleDefault).default,
				Contact: (Contact as ModuleDefault).default,
				CmsPage: (CmsPage as ModuleDefault).default,
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
