import type { Component } from 'svelte';
import type { TemplatePack } from './types';
import { logger } from '$lib/utils/logger';
import { normalizeTemplatePackId } from './ids';
import type { TemplatePackId } from './ids';
import type {
	PackAboutPageProps,
	PackAlbumPageProps,
	PackCmsPageProps,
	PackContactPageProps,
	PackGalleryPageProps,
	PackHomePageProps,
	PackLoginPageProps,
	PackSearchPageProps
} from './pack-page-props';

export { TEMPLATE_PACK_IDS, isKnownTemplatePack, normalizeTemplatePackId } from './ids';
export type { TemplatePackId } from './ids';

function packPage<P extends Record<string, any>>(mod: unknown): Component<P> {
	return (mod as { default: Component<P> }).default;
}

const packCache = new Map<TemplatePackId, TemplatePack>();

const packLoaders: Record<TemplatePackId, () => Promise<TemplatePack>> = {
	noir: async () => {
		const [Home, Gallery, Album, Search, Contact, CmsPage, Login] = await Promise.all([
			import('$templates/noir/Home.svelte'),
			import('$templates/noir/Gallery.svelte'),
			import('$templates/noir/Album.svelte'),
			import('$templates/noir/Search.svelte'),
			import('$templates/noir/Contact.svelte'),
			import('$templates/noir/CmsPage.svelte'),
			import('$templates/noir/Login.svelte')
		]);
		return {
			name: 'noir',
			pages: {
				Home: packPage<PackHomePageProps>(Home),
				Gallery: packPage<PackGalleryPageProps>(Gallery),
				Album: packPage<PackAlbumPageProps>(Album),
				About: packPage<PackAboutPageProps>(CmsPage),
				Search: packPage<PackSearchPageProps>(Search),
				Contact: packPage<PackContactPageProps>(Contact),
				CmsPage: packPage<PackCmsPageProps>(CmsPage),
				Login: packPage<PackLoginPageProps>(Login)
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
				Home: packPage<PackHomePageProps>(Home),
				Gallery: packPage<PackGalleryPageProps>(Gallery),
				Album: packPage<PackAlbumPageProps>(Album),
				About: packPage<PackAboutPageProps>(About),
				Search: packPage<PackSearchPageProps>(Search),
				Contact: packPage<PackContactPageProps>(Contact),
				CmsPage: packPage<PackCmsPageProps>(CmsPage),
				Login: packPage<PackLoginPageProps>(Login)
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
				Home: packPage<PackHomePageProps>(Home),
				Gallery: packPage<PackGalleryPageProps>(Gallery),
				Album: packPage<PackAlbumPageProps>(Album),
				About: packPage<PackAboutPageProps>(About),
				Search: packPage<PackSearchPageProps>(Search),
				Contact: packPage<PackContactPageProps>(Contact),
				CmsPage: packPage<PackCmsPageProps>(CmsPage),
				Login: packPage<PackLoginPageProps>(Login)
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
