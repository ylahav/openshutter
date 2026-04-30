import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AdminGuard } from '../common/guards/admin.guard';
import { Types } from 'mongoose';
import { UpdateThemeDto } from './dto/update-theme.dto';
import type { FontSetting } from '../types/template';
import { mergeThemeCustomLayoutForCreate } from '../template/shell-layout';
import { validateTemplatePagesLayer } from '../template/validate-pages-layer';
import { noirFooterLayoutShellInstances, noirFooterPageModules } from '../template/noir-footer-shell';

const PALETTE_PRESETS: Record<string, { colors: Record<string, string> }> = {
  light: {
    colors: {
      primary: '#3B82F6',
      secondary: '#6B7280',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#111827',
      muted: '#6B7280',
    },
  },
  dark: {
    colors: {
      primary: '#60A5FA',
      secondary: '#9CA3AF',
      accent: '#FBBF24',
      background: '#111827',
      text: '#F9FAFB',
      muted: '#9CA3AF',
    },
  },
  highContrast: {
    colors: {
      primary: '#2563EB',
      secondary: '#1F2937',
      accent: '#DC2626',
      background: '#FFFFFF',
      text: '#000000',
      muted: '#4B5563',
    },
  },
  muted: {
    colors: {
      primary: '#6B7280',
      secondary: '#9CA3AF',
      accent: '#A78BFA',
      background: '#F9FAFB',
      text: '#374151',
      muted: '#9CA3AF',
    },
  },
};

const font = (family: string, size?: string, weight?: string): FontSetting =>
  size || weight ? { family, size, weight } : { family };

const BASE_TEMPLATES: Record<string, { colors: Record<string, string>; fonts: Record<string, FontSetting>; layout: Record<string, string> }> = {
  noir: {
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
  },
  studio: {
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
  },
  atelier: {
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
  },
};

@Controller('admin/themes')
@UseGuards(AdminGuard)
export class ThemesController {
  private readonly logger = new Logger(ThemesController.name);

  constructor(@InjectConnection() private connection: Connection) {}

  private getCollection() {
    const db = this.connection.db;
    if (!db) throw new InternalServerErrorException('Database connection not established');
    return db.collection('themes');
  }

  private serialize(doc: any) {
    if (!doc) return null;
    return {
      ...doc,
      _id: doc._id?.toString(),
    };
  }

  @Get()
  async findAll() {
    try {
      const collection = this.getCollection();
      const validPacks = ['noir', 'studio', 'atelier'];
      const themes = await collection.find({ baseTemplate: { $in: validPacks } }).sort({ createdAt: -1 }).toArray();
      return themes.map((t) => this.serialize(t));
    } catch (error) {
      this.logger.error('Error fetching themes:', error);
      throw new BadRequestException(
        `Failed to fetch themes: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundException('Theme not found');
      }
      const collection = this.getCollection();
      const theme = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!theme) throw new NotFoundException('Theme not found');
      return this.serialize(theme);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Error fetching theme:', error);
      throw new BadRequestException(
        `Failed to fetch theme: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Post()
  async create(@Body() body: any) {
    try {
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const baseTemplate = typeof body?.baseTemplate === 'string'
        ? (['noir', 'studio', 'atelier'].includes(body.baseTemplate) ? body.baseTemplate : 'noir')
        : 'noir';
      const basePalette = typeof body?.basePalette === 'string' && PALETTE_PRESETS[body.basePalette]
        ? body.basePalette
        : null;

      if (!name) {
        throw new BadRequestException('Theme name is required');
      }

      const collection = this.getCollection();
      const base = BASE_TEMPLATES[baseTemplate] || BASE_TEMPLATES.noir;
      const palette = basePalette && PALETTE_PRESETS[basePalette]
        ? PALETTE_PRESETS[basePalette].colors
        : base.colors;

      // Default page layouts and modules
      const DEFAULT_PAGE_LAYOUTS = {
        home: { gridRows: 2, gridColumns: 1 },
        gallery: { gridRows: 1, gridColumns: 1 },
        album: { gridRows: 1, gridColumns: 1 },
        search: { gridRows: 1, gridColumns: 1 },
        header: { gridRows: 1, gridColumns: 5 },
        footer: { gridRows: 2, gridColumns: 1 }
      };

      const DEFAULT_PAGE_MODULES = {
        home: [
          {
            _id: 'mod_default_home_hero',
            type: 'hero',
            props: {
              title: { en: 'Welcome to Our Gallery' },
              subtitle: { en: 'Discover amazing moments captured in time' },
              ctaLabel: { en: 'Explore Albums' },
              ctaUrl: '/albums',
              backgroundStyle: 'light'
            },
            rowOrder: 0,
            columnIndex: 0,
            rowSpan: 1,
            colSpan: 1
          },
          {
            _id: 'mod_default_home_albums',
            type: 'albumsGrid',
            props: { albumSource: 'root' },
            rowOrder: 1,
            columnIndex: 0,
            rowSpan: 1,
            colSpan: 1
          }
        ],
        gallery: [
          {
            _id: 'mod_default_gallery_albums',
            type: 'albumsGrid',
            props: { albumSource: 'root' },
            rowOrder: 0,
            columnIndex: 0,
            rowSpan: 1,
            colSpan: 1
          }
        ],
        album: [
          {
            _id: 'mod_default_album_gallery',
            type: 'albumView',
            props: { albumSource: 'current' },
            rowOrder: 0,
            columnIndex: 0,
            rowSpan: 1,
            colSpan: 1
          }
        ],
        search: [
          {
            _id: 'mod_default_search_text',
            type: 'richText',
            props: {
              title: { en: 'Search Results' },
              body: { en: '<p>Use the search bar to find photos, albums, people, and locations.</p>' },
              background: 'white'
            },
            rowOrder: 0,
            columnIndex: 0,
            rowSpan: 1,
            colSpan: 1
          }
        ],
        header: [
          {
            _id: 'mod_default_header_logo',
            type: 'logo',
            props: { showAsLink: true },
            rowOrder: 0,
            columnIndex: 0,
            rowSpan: 1,
            colSpan: 1
          },
          {
            _id: 'mod_default_header_title',
            type: 'siteTitle',
            props: { showAsLink: true },
            rowOrder: 0,
            columnIndex: 1,
            rowSpan: 1,
            colSpan: 1
          },
          {
            _id: 'mod_default_header_menu',
            type: 'menu',
            props: {},
            rowOrder: 0,
            columnIndex: 2,
            rowSpan: 1,
            colSpan: 1
          },
          {
            _id: 'mod_default_header_language',
            type: 'languageSelector',
            props: {
              showFlags: true,
              showNativeNames: true,
              compact: false
            },
            rowOrder: 0,
            columnIndex: 3,
            rowSpan: 1,
            colSpan: 1
          },
          {
            _id: 'mod_default_header_theme',
            type: 'themeToggle',
            props: {},
            rowOrder: 0,
            columnIndex: 4,
            rowSpan: 1,
            colSpan: 1
          }
        ],
        footer: [
          {
            _id: 'mod_default_footer_social',
            type: 'socialMedia',
            props: {
              align: 'center',
              orientation: 'horizontal',
              iconSize: 'md',
              showLabels: false
            },
            rowOrder: 0,
            columnIndex: 0,
            rowSpan: 1,
            colSpan: 1
          },
          {
            _id: 'mod_default_footer_text',
            type: 'richText',
            props: {
              title: {},
              body: { en: '<p>&copy; 2024 OpenShutter. All rights reserved.</p>' },
              background: 'gray'
            },
            rowOrder: 1,
            columnIndex: 0,
            rowSpan: 1,
            colSpan: 1
          }
        ]
      };

      const defaultPageModulesForCreate =
        baseTemplate === 'noir'
          ? {
              ...DEFAULT_PAGE_MODULES,
              footer: noirFooterPageModules as unknown[],
              home: [
                {
                  ...DEFAULT_PAGE_MODULES.home[0],
                  props: {
                    ...DEFAULT_PAGE_MODULES.home[0].props,
                    showCta: false,
                    backgroundStyle: 'galleryLeading',
                  },
                },
                {
                  ...DEFAULT_PAGE_MODULES.home[1],
                  props: {
                    ...DEFAULT_PAGE_MODULES.home[1].props,
                    showHeading: false,
                    showDescription: false,
                    coverAspect: 'square',
                  },
                },
              ],
              gallery: [
                {
                  ...DEFAULT_PAGE_MODULES.gallery[0],
                  props: {
                    ...DEFAULT_PAGE_MODULES.gallery[0].props,
                    showHeading: false,
                    showDescription: false,
                    coverAspect: 'square',
                  },
                },
              ],
            }
          : DEFAULT_PAGE_MODULES;

      const defaultPageLayoutForCreate =
        baseTemplate === 'noir'
          ? { ...DEFAULT_PAGE_LAYOUTS, footer: { gridRows: 1, gridColumns: 1 } }
          : DEFAULT_PAGE_LAYOUTS;

      const theme: any = {
        name,
        description: typeof body?.description === 'string' ? body.description : '',
        baseTemplate,
        basePalette,
        customColors: body?.customColors && typeof body.customColors === 'object'
          ? { ...base.colors, ...body.customColors }
          : { ...palette },
        customFonts: body?.customFonts && typeof body.customFonts === 'object'
          ? { ...base.fonts, ...body.customFonts }
          : { ...base.fonts },
        customLayout: mergeThemeCustomLayoutForCreate(base.layout, body?.customLayout),
        componentVisibility: body?.componentVisibility && typeof body.componentVisibility === 'object'
          ? body.componentVisibility
          : {},
        headerConfig: body?.headerConfig && typeof body.headerConfig === 'object'
          ? body.headerConfig
          : {},
        pageModules: body?.pageModules && typeof body.pageModules === 'object'
          ? body.pageModules
          : defaultPageModulesForCreate,
        pageLayout: body?.pageLayout && typeof body.pageLayout === 'object'
          ? body.pageLayout
          : defaultPageLayoutForCreate,
        layoutPresets:
          body?.layoutPresets && typeof body.layoutPresets === 'object'
            ? body.layoutPresets
            : baseTemplate === 'noir'
              ? noirFooterLayoutShellInstances
              : {},
        layoutShellInstances:
          body?.layoutShellInstances && typeof body.layoutShellInstances === 'object'
            ? body.layoutShellInstances
            : baseTemplate === 'noir'
              ? noirFooterLayoutShellInstances
              : {},
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(theme);
      const inserted = await collection.findOne({ _id: result.insertedId });
      return this.serialize(inserted);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Error creating theme:', error);
      throw new BadRequestException(
        `Failed to create theme: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateThemeDto) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundException('Theme not found');
      }
      const collection = this.getCollection();
      const existing = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!existing) throw new NotFoundException('Theme not found');

      const updateData: any = { updatedAt: new Date() };
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.description !== undefined) updateData.description = dto.description;
      if (dto.baseTemplate !== undefined) updateData.baseTemplate = dto.baseTemplate;
      if (dto.customColors !== undefined) updateData.customColors = dto.customColors;
      if (dto.customFonts !== undefined) updateData.customFonts = dto.customFonts;
      if (dto.customLayout !== undefined) updateData.customLayout = dto.customLayout;
      if (dto.customLayoutByBreakpoint !== undefined) updateData.customLayoutByBreakpoint = dto.customLayoutByBreakpoint;
      if (dto.componentVisibility !== undefined) updateData.componentVisibility = dto.componentVisibility;
      if (dto.headerConfig !== undefined) updateData.headerConfig = dto.headerConfig;
      if (dto.pageModules !== undefined) updateData.pageModules = dto.pageModules;
      if (dto.pageLayout !== undefined) updateData.pageLayout = dto.pageLayout;
      if (dto.pageLayoutByBreakpoint !== undefined) updateData.pageLayoutByBreakpoint = dto.pageLayoutByBreakpoint;
      if (dto.layoutPresets !== undefined) updateData.layoutPresets = dto.layoutPresets;
      // pageModulesByBreakpoint is deprecated: persist only pageModules.
      if (dto.isPublished !== undefined) updateData.isPublished = dto.isPublished;

      // Server-side safety: reject invalid grids/overlaps before persisting.
      // Validate against the *final* theme document (existing + updates).
      validateTemplatePagesLayer({ ...(existing as any), ...(updateData as any) }, { source: `PUT /api/admin/themes/${id}` });

      const updateOps: any = { $set: updateData };
      if (dto.pageModules !== undefined) {
        updateOps.$unset = { ...(updateOps.$unset || {}), pageModulesByBreakpoint: '' };
      }
      await collection.updateOne({ _id: new Types.ObjectId(id) }, updateOps);
      const updated = await collection.findOne({ _id: new Types.ObjectId(id) });
      return this.serialize(updated);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Error updating theme:', error);
      throw new BadRequestException(
        `Failed to update theme: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundException('Theme not found');
      }
      const collection = this.getCollection();
      const existing = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!existing) throw new NotFoundException('Theme not found');
      const result = await collection.deleteOne({ _id: new Types.ObjectId(id) });
      if (result.deletedCount === 0) throw new NotFoundException('Theme not found');
      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Error deleting theme:', error);
      throw new BadRequestException(
        `Failed to delete theme: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @Body('name') newName?: string) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundException('Theme not found');
      }
      const collection = this.getCollection();
      const source = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!source) throw new NotFoundException('Theme not found');

      const copy: any = {
        ...source,
        _id: undefined,
        name: newName || `${source.name} (copy)`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      delete copy._id;

      const result = await collection.insertOne(copy);
      const inserted = await collection.findOne({ _id: result.insertedId });
      return this.serialize(inserted);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Error duplicating theme:', error);
      throw new BadRequestException(
        `Failed to duplicate theme: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
