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

const BASE_TEMPLATES: Record<string, { colors: Record<string, string>; fonts: Record<string, string>; layout: Record<string, string> }> = {
  default: {
    colors: { primary: '#3B82F6', secondary: '#1F2937', accent: '#F59E0B', background: '#FFFFFF', text: '#1F2937', muted: '#6B7280' },
    fonts: { heading: 'Inter', body: 'Inter' },
    layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
  },
  modern: {
    colors: { primary: '#3b82f6', secondary: '#6b7280', accent: '#10b981', background: '#ffffff', text: '#111827', muted: '#6b7280' },
    fonts: { heading: 'Inter', body: 'Inter' },
    layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
  },
  elegant: {
    colors: { primary: '#8b5cf6', secondary: '#a78bfa', accent: '#f59e0b', background: '#ffffff', text: '#1f2937', muted: '#6b7280' },
    fonts: { heading: 'Playfair Display', body: 'Inter' },
    layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
  },
  minimal: {
    colors: { primary: '#000000', secondary: '#6b7280', accent: '#000000', background: '#ffffff', text: '#000000', muted: '#6b7280' },
    fonts: { heading: 'Inter', body: 'Inter' },
    layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1rem' },
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
      const themes = await collection.find({}).sort({ createdAt: -1 }).toArray();
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
        ? (['default', 'minimal', 'elegant', 'modern'].includes(body.baseTemplate) ? body.baseTemplate : 'modern')
        : 'modern';
      const basePalette = typeof body?.basePalette === 'string' && PALETTE_PRESETS[body.basePalette]
        ? body.basePalette
        : null;

      if (!name) {
        throw new BadRequestException('Theme name is required');
      }

      const collection = this.getCollection();
      const base = BASE_TEMPLATES[baseTemplate] || BASE_TEMPLATES.default;
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
        footer: { gridRows: 1, gridColumns: 1 }
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
            type: 'albumGallery',
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
            _id: 'mod_default_footer_text',
            type: 'richText',
            props: {
              title: {},
              body: { en: '<p>&copy; 2024 OpenShutter. All rights reserved.</p>' },
              background: 'gray'
            },
            rowOrder: 0,
            columnIndex: 0,
            rowSpan: 1,
            colSpan: 1
          }
        ]
      };

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
        customLayout: body?.customLayout && typeof body.customLayout === 'object'
          ? { ...base.layout, ...body.customLayout }
          : { ...base.layout },
        componentVisibility: body?.componentVisibility && typeof body.componentVisibility === 'object'
          ? body.componentVisibility
          : {},
        headerConfig: body?.headerConfig && typeof body.headerConfig === 'object'
          ? body.headerConfig
          : {},
        pageModules: body?.pageModules && typeof body.pageModules === 'object'
          ? body.pageModules
          : DEFAULT_PAGE_MODULES,
        pageLayout: body?.pageLayout && typeof body.pageLayout === 'object'
          ? body.pageLayout
          : DEFAULT_PAGE_LAYOUTS,
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
      if (dto.componentVisibility !== undefined) updateData.componentVisibility = dto.componentVisibility;
      if (dto.headerConfig !== undefined) updateData.headerConfig = dto.headerConfig;
      if (dto.pageModules !== undefined) updateData.pageModules = dto.pageModules;
      if (dto.pageLayout !== undefined) updateData.pageLayout = dto.pageLayout;
      if (dto.isPublished !== undefined) updateData.isPublished = dto.isPublished;

      await collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: updateData });
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
