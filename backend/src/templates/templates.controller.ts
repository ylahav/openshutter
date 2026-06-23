import { Controller, Get, Param, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import * as mongoose from 'mongoose';
import { AdminGuard } from '../common/guards/admin.guard';
import type { TemplateConfig, FontSetting } from '../types/template';

const font = (family: string, size?: string, weight?: string): FontSetting =>
  size || weight ? { family, size, weight } : { family };

/** Aligns with frontend `DEFAULT_PAGE_LAYOUTS` — default rows/columns per page key when a pack does not override. */
const DEFAULT_PACK_PAGE_LAYOUT: Record<string, { gridRows: number; gridColumns: number }> = {
  home: { gridRows: 2, gridColumns: 1 },
  gallery: { gridRows: 1, gridColumns: 1 },
  album: { gridRows: 1, gridColumns: 1 },
  search: { gridRows: 1, gridColumns: 1 },
  header: { gridRows: 1, gridColumns: 5 },
  footer: { gridRows: 2, gridColumns: 1 },
};

// Import static templates directly
const staticTemplates: Record<string, TemplateConfig> = {
  noir: {
    templateName: 'noir',
    displayName: 'Noir',
    pageAliasPrefix: 'n',
    description: 'Cinematic dark layout — mono typography and full-bleed hero',
    version: '1.0.0',
    author: 'OpenShutter',
    thumbnail: '/templates/noir/thumbnail.jpg',
    category: 'dark',
    features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
    colors: {
      primary: '#f5f5f3',
      secondary: '#a1a1a1',
      accent: '#f5f5f3',
      background: '#080808',
      text: '#f5f5f3',
      muted: 'rgba(245,245,243,0.38)',
      surfaceCard: '#141414',
      surfaceCardSecondary: '#1c1c1c',
      surfaceCardTertiary: '#232323',
      textSubtle: 'rgba(245,245,243,0.16)',
      borderSubtle: 'rgba(255,255,255,0.07)',
      lightBackground: '#f5f5f3',
      lightText: '#080808',
      lightMuted: 'rgba(8,8,8,0.45)',
      lightSurfaceCard: '#e8e8e5',
      lightSurfaceCardSecondary: '#ddddd9',
      lightSurfaceCardTertiary: '#d2d2ce',
      lightTextSubtle: 'rgba(8,8,8,0.22)',
      lightBorderSubtle: 'rgba(0,0,0,0.08)',
    },
    fonts: {
      heading: font('DM Sans', '1.25rem', '300'),
      body: font('DM Mono', '1rem', '400'),
      links: font('DM Mono'),
      lists: font('DM Mono'),
      formInputs: font('DM Mono'),
      formLabels: font('DM Mono'),
    },
    layout: { maxWidth: '1280px', containerPadding: '2rem', gridGap: '0.125rem' },
    pageLayout: { ...DEFAULT_PACK_PAGE_LAYOUT },
    components: {
      hero: 'components/Hero.tsx',
      albumCard: 'components/AlbumCard.tsx',
      photoCard: 'components/PhotoCard.tsx',
      albumList: 'components/AlbumList.tsx',
      gallery: 'components/Gallery.tsx',
      navigation: 'components/Navigation.tsx',
      footer: 'components/Footer.tsx',
    },
    visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
    pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
  },
  studio: {
    templateName: 'studio',
    displayName: 'Studio',
    pageAliasPrefix: 's',
    description: 'Editorial portfolio layout — Syne & Outfit, hero strip, card grid',
    version: '1.0.0',
    author: 'OpenShutter',
    thumbnail: '/templates/studio/thumbnail.jpg',
    category: 'modern',
    features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
    colors: {
      primary: '#2563eb',
      secondary: '#1d4ed8',
      accent: '#60a5fa',
      background: '#0f172a',
      text: '#f1f5f9',
      muted: '#94a3b8',
      surfaceCard: '#1e293b',
      surfaceCardSecondary: '#0f172a',
      surfaceCardTertiary: '#1e293b',
      textSubtle: 'rgba(241,245,249,0.2)',
      borderSubtle: '#334155',
      lightBackground: '#f8fafc',
      lightText: '#0f172a',
      lightMuted: '#64748b',
      lightSurfaceCard: '#ffffff',
      lightSurfaceCardSecondary: '#f8fafc',
      lightSurfaceCardTertiary: '#f1f5f9',
      lightTextSubtle: 'rgba(15,23,42,0.22)',
      lightBorderSubtle: '#e2e8f0',
      heroStrip: '#020617',
      footerStrip: '#020617',
      lightHeroStrip: '#0f172a',
      lightFooterStrip: '#0f172a',
    },
    fonts: {
      heading: font('Syne', '1.25rem', '700'),
      body: font('Outfit', '1rem', '400'),
      links: font('Outfit'),
      lists: font('Outfit'),
      formInputs: font('Outfit'),
      formLabels: font('Outfit'),
    },
    layout: { maxWidth: '1200px', containerPadding: '1.75rem', gridGap: '1rem' },
    pageLayout: { ...DEFAULT_PACK_PAGE_LAYOUT },
    components: {
      hero: 'components/Hero.tsx',
      albumCard: 'components/AlbumCard.tsx',
      photoCard: 'components/PhotoCard.tsx',
      albumList: 'components/AlbumList.tsx',
      gallery: 'components/Gallery.tsx',
      navigation: 'components/Navigation.tsx',
      footer: 'components/Footer.tsx',
    },
    visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
    pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
  },
  atelier: {
    templateName: 'atelier',
    displayName: 'Atelier',
    pageAliasPrefix: 'a',
    description: 'Warm editorial layout — Cormorant Garamond & Jost, tall hero, list albums',
    version: '1.0.0',
    author: 'OpenShutter',
    thumbnail: '/templates/atelier/thumbnail.jpg',
    category: 'elegant',
    features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
    colors: {
      primary: '#b8955a',
      secondary: '#5c4033',
      accent: '#d4b07a',
      background: '#1a1008',
      text: '#f0e8d8',
      muted: '#7a6a58',
      surfaceCard: '#231710',
      surfaceCardSecondary: '#1a1008',
      surfaceCardTertiary: '#2e1f14',
      textSubtle: 'rgba(240,232,216,0.25)',
      borderSubtle: '#3a2a1c',
      lightBackground: '#faf6ef',
      lightText: '#2c1f14',
      lightMuted: '#9c8c7a',
      lightSurfaceCard: '#f2ece0',
      lightSurfaceCardSecondary: '#f2ece0',
      lightSurfaceCardTertiary: '#e8dece',
      lightTextSubtle: 'rgba(44,31,20,0.35)',
      lightBorderSubtle: '#e8dece',
      heroStrip: '#0e0804',
      footerStrip: '#0e0804',
      lightHeroStrip: '#2c1f14',
      lightFooterStrip: '#2c1f14',
      lightPrimary: '#b8955a',
      lightSecondary: '#5c4033',
      lightAccent: '#d4b07a',
      lightTextFaint: 'rgba(44,31,20,0.22)',
      textFaint: 'rgba(240,232,216,0.18)',
      lightHeaderBackground: '#faf6ef',
      headerBackground: '#1a1008',
      lightHeaderBorder: '#e8dece',
      headerBorder: '#3a2a1c',
      lightCardBorder: '#e8dece',
      cardBorder: '#3a2a1c',
      lightHeroImageFilter: 'brightness(0.55) saturate(0.8)',
      heroImageFilter: 'brightness(0.35) saturate(0.6)',
      lightLoginBgFilter: 'brightness(0.3) saturate(0.4) sepia(0.3)',
      loginBgFilter: 'brightness(0.15) saturate(0.3) sepia(0.4)',
    },
    fonts: {
      heading: font('Cormorant Garamond', '1.35rem', '400'),
      body: font('Jost', '1rem', '400'),
      links: font('Jost'),
      lists: font('Jost'),
      formInputs: font('Jost'),
      formLabels: font('Jost'),
    },
    layout: { maxWidth: '960px', containerPadding: '2rem', gridGap: '1rem' },
    pageLayout: { ...DEFAULT_PACK_PAGE_LAYOUT },
    components: {
      hero: 'components/Hero.tsx',
      albumCard: 'components/AlbumCard.tsx',
      photoCard: 'components/PhotoCard.tsx',
      albumList: 'components/AlbumList.tsx',
      gallery: 'components/Gallery.tsx',
      navigation: 'components/Navigation.tsx',
      footer: 'components/Footer.tsx',
    },
    visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
    pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
  },
};

@Controller('admin/templates')
@UseGuards(AdminGuard)
export class TemplatesController {
  /**
   * Get all available templates
   * Path: GET /api/admin/templates
   */
  @Get()
  async getTemplates(): Promise<TemplateConfig[]> {
    // Return all static templates
    return Object.values(staticTemplates);
  }

  /**
   * Export the current DB state for a pack into a kit JSON file.
   *
   * Path: GET /api/admin/templates/:packId/export-kit
   *
   * Reads `pages` rows where frontendTemplates includes the pack (or legacy
   * frontendTemplate matches), their associated `page_modules`, and the
   * `site_config.template.layoutShellInstances` map. Emits a JSON in the same
   * shape as `frontend/src/templates/<pack>/<pack>.kit.json` so the result
   * can be diffed against / merged into the authored pack source by hand, or
   * fed straight back into `install-template-kit.ts` to seed another site.
   *
   * Intentionally a NEW sibling file — the response is delivered as an
   * attachment download, never written to the source tree. The authored
   * `<pack>.kit.json` stays untouched (pack-intent vs site-state boundary).
   */
  @Get(':packId/export-kit')
  async exportKit(@Param('packId') packId: string, @Res() res: Response): Promise<void> {
    const safePack = String(packId || '').trim().toLowerCase();
    if (!safePack || !/^[a-z0-9-]+$/.test(safePack)) {
      throw new NotFoundException(`Invalid pack id: ${packId}`);
    }

    const db = mongoose.connection.db;
    if (!db) throw new NotFoundException('Database not connected');

    // 1. Pages owned by this pack — accept both the array field
    //    (frontendTemplates) and the legacy scalar (frontendTemplate).
    const pageRows = await db
      .collection('pages')
      .find({ $or: [{ frontendTemplates: safePack }, { frontendTemplate: safePack }] })
      .sort({ pageRole: 1, alias: 1 })
      .toArray();

    // 2. Modules per page, keyed by pageId, ordered for stable diffs.
    const pageIds = pageRows.map((p) => p._id).filter(Boolean);
    const moduleRows = pageIds.length
      ? await db
          .collection('page_modules')
          .find({ pageId: { $in: pageIds } })
          .sort({ rowOrder: 1, columnIndex: 1, order: 1 })
          .toArray()
      : [];
    const modulesByPageId = new Map<string, any[]>();
    for (const m of moduleRows) {
      const key = String(m.pageId);
      const list = modulesByPageId.get(key) ?? [];
      list.push(m);
      modulesByPageId.set(key, list);
    }

    // 3. layoutShellInstances from site_config — ship all of them; consumers
    //    can prune what their pages don't reference. (Filtering to only-used
    //    is fragile when shells are renamed; over-include is the safe default.)
    const siteConfig = await db.collection('site_config').findOne({});
    const shells =
      (siteConfig?.template as Record<string, unknown> | undefined)?.layoutShellInstances ?? {};

    // 4. Pack-level meta: kitId is the packId; pageAliasPrefix from
    //    site_config override or null (consumer falls back to PREFIX_BY_PACK).
    const aliasPrefixes =
      (siteConfig?.template as { pageAliasPrefixes?: Record<string, string> } | undefined)
        ?.pageAliasPrefixes ?? {};

    const kitPages = pageRows.map((p) => {
      const modules = (modulesByPageId.get(String(p._id)) ?? []).map((m) => {
        const out: Record<string, unknown> = {
          type: m.type,
          rowOrder: m.rowOrder ?? 0,
          columnIndex: m.columnIndex ?? 0,
          props: m.props ?? {},
        };
        if (m.zone && m.zone !== 'main') out.zone = m.zone;
        else out.zone = 'main';
        if (m.colSpan !== undefined && m.colSpan !== null) out.colSpan = m.colSpan;
        if (m.rowSpan !== undefined && m.rowSpan !== null) out.rowSpan = m.rowSpan;
        if (m.columnProportion !== undefined && m.columnProportion !== null) {
          out.columnProportion = m.columnProportion;
        }
        return out;
      });

      const out: Record<string, unknown> = {
        alias: p.alias,
        slug: p.slug ?? p.alias,
        category: p.category ?? 'system',
        isPublished: p.isPublished ?? true,
        layout: p.layout ?? { zones: ['main'] },
        title: p.title ?? { en: '', he: '' },
        modules,
      };
      if (p.pageRole) out.role = p.pageRole;
      if (p.subtitle) out.subtitle = p.subtitle;
      if (Array.isArray(p.frontendTemplates) && p.frontendTemplates.length > 0) {
        out.frontendTemplates = p.frontendTemplates;
      } else if (typeof p.frontendTemplate === 'string' && p.frontendTemplate) {
        out.frontendTemplates = [p.frontendTemplate];
      }
      return out;
    });

    const kit = {
      $exportedAt: new Date().toISOString(),
      $exportedFrom: `OpenShutter DB snapshot for pack "${safePack}". Pack intent (the authored <pack>.kit.json) lives in code; this snapshot reflects per-site state at export time. Merge by hand or feed back into install-template-kit.ts to seed another site.`,
      meta: {
        kitId: safePack,
        version: 'exported',
        pageAliasPrefix: aliasPrefixes[safePack] ?? null,
      },
      theme: {
        layoutShellInstances: shells,
      },
      pages: kitPages,
    };

    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${safePack}.kit.exported.${stamp}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(kit, null, '\t'));
  }
}
