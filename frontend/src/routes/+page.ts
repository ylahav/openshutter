import type { PageLoad } from './$types';
import type { TemplateAlbum } from '$types';
import { logger } from '$lib/utils/logger';
import { mergeHomeHeroPropsFromSiteTemplate } from '$lib/template/merge-home-hero-from-site-template';
import { getConfiguredPackId } from '$lib/template-packs/resolve-visitor-pack';
import {
	galleryLeadingFetchLimit,
	resolveHeroLayoutFromTemplateInputs
} from '$lib/page-builder/modules/Hero/hero-layout';
import { resolveGalleryLeadingUrlsFromApiJson } from '$lib/page-builder/modules/Hero/gallery-leading-urls';

export const load: PageLoad = async ({ fetch, parent }) => {
  const { visitorTemplatePack, visitorSiteConfig, siteContext } = await parent();
  const pack =
    typeof visitorTemplatePack === 'string' ? visitorTemplatePack : getConfiguredPackId(visitorSiteConfig);

  let rootAlbums: TemplateAlbum[] = [];
  let albumsError: string | null = null;
  let page: any = null;
  let modules: any[] = [];

  try {
    // Fetch root albums (no parent) - API handles access control.
    // Use the frontend API route which will proxy to backend
    const res = await fetch('/api/albums?parentId=root');

    if (!res.ok) {
      logger.error('Failed to fetch root albums:', res.status, res.statusText);
      albumsError = 'Failed to fetch albums';
    } else {
      const albums = await res.json();
      if (Array.isArray(albums)) {
        rootAlbums = albums as TemplateAlbum[];
      } else {
        logger.error('Unexpected albums response format:', albums);
        albumsError = 'Failed to fetch albums';
      }
    }
  } catch (err) {
    logger.error('Error fetching root albums:', err);
    albumsError = 'Failed to fetch albums';
  }

  // Fetch the DB-defined home page via reserved page role.
  // Backend auto-creates it if missing.
  try {
    const pageRes = await fetch(`/api/pages/home?role=home&pack=${encodeURIComponent(pack)}`);
    if (pageRes.ok) {
      const result = await pageRes.json();
      const payload = result?.success ? result?.data : result;
      page = payload?.page ?? payload ?? null;
      modules = Array.isArray(payload?.modules) ? payload.modules : [];
      if (siteContext?.type === 'owner-site' && visitorSiteConfig?.template) {
        modules = mergeHomeHeroPropsFromSiteTemplate(modules, visitorSiteConfig.template) as typeof modules;
      }

      const templateHeroLayoutRaw = (
        visitorSiteConfig?.template as { hero?: { layout?: string } } | undefined
      )?.hero?.layout;
      const heroRows = modules.filter((m) => m && String((m as { type?: string }).type) === 'hero');
      let prefetchedGl: string[] | null = null;
      for (const m of heroRows) {
        const raw = (m as { props?: unknown }).props;
        const props =
          raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
        if (String(props.backgroundStyle ?? 'light') !== 'galleryLeading') continue;
        const resolvedLayout = resolveHeroLayoutFromTemplateInputs({
          heroProps: props,
          templateHeroLayoutRaw,
          packId: pack
        });
        const lim = galleryLeadingFetchLimit({
          backgroundStyle: 'galleryLeading',
          resolvedLayout,
          configLimit: props.heroGalleryLeadingLimit
        });
        if (lim <= 0) continue;
        try {
          const glRes = await fetch(`/api/photos/gallery-leading?limit=${lim}`);
          if (!glRes.ok) continue;
          const json = await glRes.json();
          const urls = resolveGalleryLeadingUrlsFromApiJson(json);
          if (urls.length > 0) {
            prefetchedGl = urls;
            break;
          }
        } catch {
          /* Hero Layout will fetch in the browser */
        }
      }
      if (prefetchedGl?.length) {
        modules = modules.map((m) => {
          if (!m || String((m as { type?: string }).type) !== 'hero') return m;
          const raw = (m as { props?: unknown }).props;
          const p =
            raw && typeof raw === 'object' && !Array.isArray(raw)
              ? { ...(raw as Record<string, unknown>) }
              : {};
          if (String(p.backgroundStyle ?? 'light') !== 'galleryLeading') return m;
          return { ...m, props: { ...p, prefetchedGalleryLeadingUrls: prefetchedGl } };
        });
      }
    } else {
      logger.error('[Home] Failed to fetch DB home page:', pageRes.status, pageRes.statusText);
    }
  } catch (err) {
    logger.error('[Home] Error fetching DB home page:', err);
  }
  
  logger.debug('[Home] Final load result:', { 
    hasPage: !!page,
    modulesCount: modules.length,
  });

  return {
    rootAlbums,
    albumsError,
    page,
    modules
  };
};
