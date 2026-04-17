import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException, Logger, InternalServerErrorException, Request } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { SUPPORTED_LANGUAGES } from '../types/multi-lang';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { UpdatePageModuleDto } from './dto/update-page-module.dto';
import { DuplicatePageDto } from './dto/duplicate-page.dto';
import { normalizeVisitorPack, type VisitorTemplatePackId } from '../common/utils/visitor-pack.util';

const RESERVED_PAGE_ROLES = ['home', 'gallery', 'login', 'search', 'blog', 'album', 'blog-category', 'blog-article'] as const;

@Controller('admin/pages')
@UseGuards(AdminGuard)
export class PagesController {
  private readonly logger = new Logger(PagesController.name);

  private normalizePageRole(value: unknown): string | undefined {
    const v = String(value ?? '').trim().toLowerCase();
    return RESERVED_PAGE_ROLES.includes(v as typeof RESERVED_PAGE_ROLES[number]) ? v : undefined;
  }

  private normalizeRouteParams(params: unknown): string[] | undefined {
    if (!Array.isArray(params)) return undefined;
    const normalized = params
      .map((p) => String(p ?? '').trim())
      .filter(Boolean);
    return normalized.length ? normalized : undefined;
  }

  private normalizeParentPageId(value: unknown): Types.ObjectId | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    if (!Types.ObjectId.isValid(raw)) {
      throw new BadRequestException('Invalid parentPageId');
    }
    return new Types.ObjectId(raw);
  }

  private async pickUniqueAliasAndSlug(
    collection: { findOne: (filter: Record<string, unknown>) => Promise<unknown> },
    desiredBase: string,
  ): Promise<{ alias: string; slug: string }> {
    const clean =
      String(desiredBase || 'page')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'page';
    let candidate = `${clean}-copy`;
    let n = 1;
    while (await collection.findOne({ $or: [{ alias: candidate }, { slug: candidate }] })) {
      n += 1;
      candidate = `${clean}-copy-${n}`;
    }
    return { alias: candidate, slug: candidate };
  }

  private normalizeFrontendTemplates(
    frontendTemplates: unknown,
    frontendTemplateLegacy: unknown,
  ): VisitorTemplatePackId[] {
    const normalized: VisitorTemplatePackId[] = [];
    const seen = new Set<string>();
    if (Array.isArray(frontendTemplates)) {
      for (const raw of frontendTemplates) {
        const p = normalizeVisitorPack(raw);
        if (!p) {
          throw new BadRequestException('Invalid frontendTemplates value (use noir, studio, atelier)');
        }
        if (!seen.has(p)) {
          normalized.push(p);
          seen.add(p);
        }
      }
      return normalized;
    }
    const legacyRaw = String(frontendTemplateLegacy ?? '').trim();
    if (!legacyRaw) return normalized;
    const p = normalizeVisitorPack(legacyRaw);
    if (!p) {
      throw new BadRequestException('Invalid frontendTemplate (use noir, studio, atelier, or empty for default)');
    }
    return [p];
  }

  private buildRolePackOverlapFilter(pageRole: string, packs: VisitorTemplatePackId[]): Record<string, unknown>[] {
    if (!packs.length) {
      return [
        { frontendTemplates: { $exists: false } },
        { frontendTemplates: { $size: 0 } },
        { frontendTemplate: null },
        { frontendTemplate: '' },
        { frontendTemplate: { $exists: false } },
      ];
    }
    return [
      { frontendTemplates: { $in: packs } },
      { frontendTemplate: { $in: packs } },
    ];
  }

  private async assertNoRolePackOverlap(
    collection: { findOne: (filter: Record<string, unknown>) => Promise<any> },
    pageRole: string | null | undefined,
    packs: VisitorTemplatePackId[],
    excludePageId?: Types.ObjectId,
  ): Promise<void> {
    if (!pageRole) return;
    const overlapOr = this.buildRolePackOverlapFilter(pageRole, packs);
    const filter: Record<string, unknown> = {
      pageRole,
      $or: overlapOr,
    };
    if (excludePageId) {
      filter._id = { $ne: excludePageId };
    }
    const existing = await collection.findOne(filter);
    if (!existing) return;
    throw new BadRequestException(
      packs.length
        ? `A page already exists for role "${pageRole}" with one of the selected packs (${packs.join(', ')})`
        : `A default page already exists for role "${pageRole}"`,
    );
  }

  /**
   * Get all pages with optional filters
   * Path: GET /api/admin/pages
   */
  @Get()
  async getPages(
    @Query('category') category?: string,
    @Query('published') published?: string,
    @Query('search') search?: string,
  ) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('pages');

      // Build query
      const query: any = {};

      if (category && category !== 'all') {
        query.category = category;
      }

      if (published !== undefined && published !== null && published !== 'all') {
        query.isPublished = published === 'true';
      }

      if (search) {
        const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
        query.$or = [
          { alias: { $regex: search, $options: 'i' } },
          ...langs.map((code) => ({ [`title.${code}`]: { $regex: search, $options: 'i' } })),
          ...langs.map((code) => ({ [`subtitle.${code}`]: { $regex: search, $options: 'i' } })),
        ];
      }

      const pages = await collection.find(query).sort({ createdAt: -1 }).toArray();

      // Convert ObjectIds to strings
      const serializedPages = pages.map((page) => ({
        ...page,
        _id: page._id.toString(),
        createdBy: page.createdBy?.toString() || page.createdBy,
        updatedBy: page.updatedBy?.toString() || page.updatedBy,
      }));

      return {
        data: serializedPages,
      };
    } catch (error) {
      this.logger.error('Error fetching pages:', error);
      throw new BadRequestException(
        `Failed to fetch pages: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a specific page by ID
   * Path: GET /api/admin/pages/:id
   */
  @Get(':id')
  async getPage(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('pages');

      const page = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!page) {
        throw new NotFoundException(`Page not found: ${id}`);
      }

      // Convert ObjectId to string
      return {
        ...page,
        _id: page._id.toString(),
        createdBy: page.createdBy?.toString() || page.createdBy,
        updatedBy: page.updatedBy?.toString() || page.updatedBy,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error fetching page:', error);
      throw new BadRequestException(
        `Failed to fetch page: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a new page
   * Path: POST /api/admin/pages
   */
  @Post()
  async createPage(@Request() req: any, @Body() body: CreatePageDto) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('pages');

      // Get user from request (set by AdminGuard)
      const user = req.user;
      if (!user || !user.id) {
        throw new BadRequestException('User not authenticated');
      }

      const { title, subtitle, alias, slug, pageRole, parentPageId, routeParams, leadingImage, frontendTemplate, frontendTemplates, introText, content, category, isPublished, layout } = body;

      // Validate required fields
      if (!title || !alias) {
        throw new BadRequestException('Title and alias are required');
      }

      // Validate title - must have at least one language
      const titleObj = title || {};
      const hasTitle = typeof title === 'string' ? !!title.trim() : Object.values(titleObj || {}).some((v: any) => (v || '').trim());
      if (!hasTitle) {
        throw new BadRequestException('Title is required in at least one language');
      }

      // Normalize title object
      const normalizedTitle: Record<string, string> = {};
      if (typeof title === 'string') {
        normalizedTitle.en = title.trim();
      } else if (title && typeof title === 'object') {
        Object.keys(title).forEach((key) => {
          if (title[key] && typeof title[key] === 'string') {
            normalizedTitle[key] = title[key].trim();
          }
        });
      }

      // Normalize subtitle object if provided
      let normalizedSubtitle: Record<string, string> | undefined;
      if (subtitle) {
        normalizedSubtitle = {};
        if (typeof subtitle === 'string') {
          normalizedSubtitle.en = subtitle.trim();
        } else if (typeof subtitle === 'object') {
          Object.keys(subtitle).forEach((key) => {
            if (subtitle[key] && typeof subtitle[key] === 'string') {
              normalizedSubtitle![key] = subtitle[key].trim();
            }
          });
        }
        if (Object.keys(normalizedSubtitle).length === 0) {
          normalizedSubtitle = undefined;
        }
      }

      // Normalize introText and content (HTML)
      let normalizedIntroText: Record<string, string> | undefined;
      if (introText) {
        normalizedIntroText = {};
        if (typeof introText === 'string') {
          normalizedIntroText.en = introText.trim();
        } else if (typeof introText === 'object') {
          Object.keys(introText).forEach((key) => {
            if (introText[key] && typeof introText[key] === 'string') {
              normalizedIntroText![key] = introText[key].trim();
            }
          });
        }
        if (Object.keys(normalizedIntroText).length === 0) {
          normalizedIntroText = undefined;
        }
      }

      let normalizedContent: Record<string, string> | undefined;
      if (content) {
        normalizedContent = {};
        if (typeof content === 'string') {
          normalizedContent.en = content.trim();
        } else if (typeof content === 'object') {
          Object.keys(content).forEach((key) => {
            if (content[key] && typeof content[key] === 'string') {
              normalizedContent![key] = content[key].trim();
            }
          });
        }
        if (Object.keys(normalizedContent).length === 0) {
          normalizedContent = undefined;
        }
      }

      // Normalize alias/slug
      const normalizedAlias = String(alias).trim().toLowerCase();
      if (!normalizedAlias) {
        throw new BadRequestException('Alias cannot be empty');
      }
      const normalizedSlug = String(slug || alias).trim().toLowerCase();
      if (!normalizedSlug) {
        throw new BadRequestException('Slug cannot be empty');
      }
      const normalizedPageRole = this.normalizePageRole(pageRole);
      const normalizedRouteParams = this.normalizeRouteParams(routeParams);
      const normalizedParentPageId = this.normalizeParentPageId(parentPageId);

      // Validate category
      const validCategories = ['system', 'site'];
      const pageCategory = category && validCategories.includes(category) ? category : 'site';

      // Check if alias already exists
      const existingPage = await collection.findOne({ alias: normalizedAlias });
      if (existingPage) {
        throw new BadRequestException('Page with this alias already exists');
      }
      const existingSlug = await collection.findOne({ slug: normalizedSlug });
      if (existingSlug) {
        throw new BadRequestException('Page with this slug already exists');
      }
      const variantPacks = this.normalizeFrontendTemplates(frontendTemplates, frontendTemplate);
      await this.assertNoRolePackOverlap(collection, normalizedPageRole, variantPacks);
      // Build layout: zones, gridRows, gridColumns, urlParams
      const layoutZones = Array.isArray(layout?.zones)
        ? layout.zones.reduce((acc: string[], zone: string) => {
            const trimmed = String(zone).trim();
            if (trimmed) acc.push(trimmed);
            return acc;
          }, [])
        : undefined;

      const pageLayout: any = {};
      if (layoutZones && layoutZones.length > 0) pageLayout.zones = layoutZones;
      if (typeof layout?.gridRows === 'number' && layout.gridRows > 0) pageLayout.gridRows = layout.gridRows;
      if (typeof layout?.gridColumns === 'number' && layout.gridColumns > 0) pageLayout.gridColumns = layout.gridColumns;
      if (layout?.urlParams != null && String(layout.urlParams).trim() !== '') pageLayout.urlParams = String(layout.urlParams).trim();

      // Create page
      const now = new Date();
      const pageData: any = {
        title: normalizedTitle,
        alias: normalizedAlias,
        slug: normalizedSlug,
        category: pageCategory,
        isPublished: Boolean(isPublished),
        createdBy: new Types.ObjectId(user.id),
        updatedBy: new Types.ObjectId(user.id),
        createdAt: now,
        updatedAt: now,
      };

      if (normalizedSubtitle) pageData.subtitle = normalizedSubtitle;
      if (normalizedPageRole) pageData.pageRole = normalizedPageRole;
      if (normalizedParentPageId !== undefined) pageData.parentPageId = normalizedParentPageId;
      if (normalizedRouteParams) pageData.routeParams = normalizedRouteParams;
      if (leadingImage?.trim()) pageData.leadingImage = leadingImage.trim();
      pageData.frontendTemplates = variantPacks;
      pageData.frontendTemplate = variantPacks.length === 1 ? variantPacks[0] : null;
      if (normalizedIntroText) pageData.introText = normalizedIntroText;
      if (normalizedContent) pageData.content = normalizedContent;
      if (Object.keys(pageLayout).length > 0) pageData.layout = pageLayout;

      const result = await collection.insertOne(pageData);
      const page = await collection.findOne({ _id: result.insertedId });

      if (!page) {
        throw new BadRequestException('Failed to retrieve created page');
      }

      // Convert ObjectId to string
      return {
        ...page,
        _id: page._id.toString(),
        createdBy: page.createdBy?.toString() || page.createdBy,
        updatedBy: page.updatedBy?.toString() || page.updatedBy,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error creating page:', error);
      throw new BadRequestException(
        `Failed to create page: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Duplicate a page and its row/column modules (new alias/slug; optional target pack).
   * Path: POST /api/admin/pages/:id/duplicate
   */
  @Post(':id/duplicate')
  async duplicatePage(@Request() req: any, @Param('id') id: string, @Body() body: DuplicatePageDto) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('pages');
      const modulesCollection = db.collection('page_modules');

      const user = req.user;
      if (!user || !user.id) {
        throw new BadRequestException('User not authenticated');
      }

      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid page id');
      }

      const source = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!source) {
        throw new NotFoundException(`Page not found: ${id}`);
      }

      const normalizedSourceRole = this.normalizePageRole(source.pageRole);
      const srcPacks = this.normalizeFrontendTemplates(source.frontendTemplates, source.frontendTemplate);
      const hasExplicitPacks = body.frontendTemplates !== undefined || body.frontendTemplate !== undefined;

      const newPacks = hasExplicitPacks
        ? this.normalizeFrontendTemplates(body.frontendTemplates, body.frontendTemplate)
        : srcPacks;

      if (normalizedSourceRole && !hasExplicitPacks) {
        throw new BadRequestException(
          'This page has a reserved role — set frontendTemplates on the duplicate (or empty array for default variant).',
        );
      }
      if (normalizedSourceRole) {
        const sameCount = newPacks.length === srcPacks.length;
        const sameSet = sameCount && newPacks.every((p) => srcPacks.includes(p));
        if (sameSet) {
          throw new BadRequestException(
            'Pick a different template selection for the duplicate. Two pages cannot share the same reserved role and pack overlap.',
          );
        }
        await this.assertNoRolePackOverlap(collection, normalizedSourceRole, newPacks);
      }

      let normalizedAlias: string;
      let normalizedSlug: string;
      if (body.alias !== undefined && String(body.alias).trim() !== '') {
        normalizedAlias = String(body.alias).trim().toLowerCase();
        normalizedSlug = String(body.slug || body.alias).trim().toLowerCase();
        if (!normalizedAlias || !normalizedSlug) {
          throw new BadRequestException('Alias and slug cannot be empty');
        }
        if (await collection.findOne({ alias: normalizedAlias })) {
          throw new BadRequestException('Page with this alias already exists');
        }
        if (await collection.findOne({ slug: normalizedSlug })) {
          throw new BadRequestException('Page with this slug already exists');
        }
      } else {
        const picked = await this.pickUniqueAliasAndSlug(collection, String(source.alias || 'page'));
        normalizedAlias = picked.alias;
        normalizedSlug = picked.slug;
      }

      const now = new Date();
      const userOid = new Types.ObjectId(user.id);

      const pageData: Record<string, unknown> = {
        title: source.title,
        alias: normalizedAlias,
        slug: normalizedSlug,
        category: source.category || 'site',
        isPublished: Boolean(source.isPublished),
        createdBy: userOid,
        updatedBy: userOid,
        createdAt: now,
        updatedAt: now,
        frontendTemplates: newPacks,
        frontendTemplate: newPacks.length === 1 ? newPacks[0] : null,
      };

      if (source.subtitle) pageData.subtitle = source.subtitle;
      if (normalizedSourceRole) pageData.pageRole = normalizedSourceRole;
      if (source.parentPageId !== undefined) pageData.parentPageId = source.parentPageId;
      if (Array.isArray(source.routeParams) && source.routeParams.length) pageData.routeParams = source.routeParams;
      if (source.leadingImage) pageData.leadingImage = source.leadingImage;
      if (source.introText) pageData.introText = source.introText;
      if (source.content) pageData.content = source.content;
      if (source.layout && typeof source.layout === 'object') pageData.layout = source.layout;

      const insertResult = await collection.insertOne(pageData);
      const newPageId = insertResult.insertedId;

      const sourceModules = await modulesCollection
        .find({ pageId: source._id })
        .sort({ rowOrder: 1, columnIndex: 1, zone: 1, order: 1, createdAt: 1 })
        .toArray();

      if (sourceModules.length) {
        await modulesCollection.insertMany(
          sourceModules.map((m) => {
            const { _id, ...rest } = m as Record<string, unknown> & { _id: unknown };
            return {
              ...rest,
              pageId: newPageId,
              createdAt: now,
              updatedAt: now,
            };
          }),
        );
      }

      const page = await collection.findOne({ _id: newPageId });
      if (!page) {
        throw new BadRequestException('Failed to retrieve duplicated page');
      }

      return {
        ...page,
        _id: page._id.toString(),
        createdBy: page.createdBy?.toString() || page.createdBy,
        updatedBy: page.updatedBy?.toString() || page.updatedBy,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error duplicating page:', error);
      throw new BadRequestException(
        `Failed to duplicate page: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a page
   * Path: PUT /api/admin/pages/:id
   */
  @Put(':id')
  async updatePage(@Request() req: any, @Param('id') id: string, @Body() body: UpdatePageDto) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('pages');

      // Get user from request (set by AdminGuard)
      const user = req.user;
      if (!user || !user.id) {
        throw new BadRequestException('User not authenticated');
      }

      const page = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!page) {
        throw new NotFoundException(`Page not found: ${id}`);
      }

      const { title, subtitle, alias, slug, pageRole, parentPageId, routeParams, leadingImage, frontendTemplate, frontendTemplates, introText, content, category, isPublished, layout } = body;

      // Normalize title object if provided
      let normalizedTitle: Record<string, string> | undefined;
      if (title !== undefined) {
        normalizedTitle = {};
        if (typeof title === 'string') {
          normalizedTitle.en = title.trim();
        } else if (title && typeof title === 'object') {
          Object.keys(title).forEach((key) => {
            if (title[key] && typeof title[key] === 'string') {
              normalizedTitle![key] = title[key].trim();
            }
          });
        }
        if (Object.keys(normalizedTitle).length === 0) {
          throw new BadRequestException('Title is required in at least one language');
        }
      }

      // Normalize other fields similar to create
      let normalizedSubtitle: Record<string, string> | undefined;
      if (subtitle !== undefined) {
        if (subtitle) {
          normalizedSubtitle = {};
          if (typeof subtitle === 'string') {
            normalizedSubtitle.en = subtitle.trim();
          } else if (typeof subtitle === 'object') {
            Object.keys(subtitle).forEach((key) => {
              if (subtitle[key] && typeof subtitle[key] === 'string') {
                normalizedSubtitle![key] = subtitle[key].trim();
              }
            });
          }
          if (Object.keys(normalizedSubtitle).length === 0) {
            normalizedSubtitle = undefined;
          }
        } else {
          normalizedSubtitle = undefined;
        }
      }

      let normalizedIntroText: Record<string, string> | undefined;
      if (introText !== undefined) {
        if (introText) {
          normalizedIntroText = {};
          if (typeof introText === 'string') {
            normalizedIntroText.en = introText.trim();
          } else if (typeof introText === 'object') {
            Object.keys(introText).forEach((key) => {
              if (introText[key] && typeof introText[key] === 'string') {
                normalizedIntroText![key] = introText[key].trim();
              }
            });
          }
          if (Object.keys(normalizedIntroText).length === 0) {
            normalizedIntroText = undefined;
          }
        } else {
          normalizedIntroText = undefined;
        }
      }

      let normalizedContent: Record<string, string> | undefined;
      if (content !== undefined) {
        if (content) {
          normalizedContent = {};
          if (typeof content === 'string') {
            normalizedContent.en = content.trim();
          } else if (typeof content === 'object') {
            Object.keys(content).forEach((key) => {
              if (content[key] && typeof content[key] === 'string') {
                normalizedContent![key] = content[key].trim();
              }
            });
          }
          if (Object.keys(normalizedContent).length === 0) {
            normalizedContent = undefined;
          }
        } else {
          normalizedContent = undefined;
        }
      }

      // Check if alias changed and if new alias already exists
      if (alias && alias.trim().toLowerCase() !== page.alias) {
        const normalizedAlias = alias.trim().toLowerCase();
        const existingPage = await collection.findOne({ alias: normalizedAlias });
        if (existingPage) {
          throw new BadRequestException('Page with this alias already exists');
        }
      }
      if (slug && slug.trim().toLowerCase() !== page.slug) {
        const normalizedSlug = slug.trim().toLowerCase();
        const existingSlug = await collection.findOne({ slug: normalizedSlug });
        if (existingSlug) {
          throw new BadRequestException('Page with this slug already exists');
        }
      }
      const normalizedPageRole = pageRole === null ? null : this.normalizePageRole(pageRole);
      if (pageRole !== undefined && pageRole !== null && !normalizedPageRole) {
        throw new BadRequestException('Invalid pageRole');
      }

      const nextPageRole: string | null | undefined = pageRole !== undefined ? normalizedPageRole ?? null : page.pageRole;
      const hasNewTemplateInputs = frontendTemplate !== undefined || frontendTemplates !== undefined;
      const nextVariantPacks = hasNewTemplateInputs
        ? this.normalizeFrontendTemplates(frontendTemplates, frontendTemplate)
        : this.normalizeFrontendTemplates(page.frontendTemplates, page.frontendTemplate);

      await this.assertNoRolePackOverlap(collection, nextPageRole, nextVariantPacks, page._id);
      const normalizedRouteParams = routeParams !== undefined ? this.normalizeRouteParams(routeParams) : undefined;
      const normalizedParentPageId = this.normalizeParentPageId(parentPageId);
      if (normalizedParentPageId && String(normalizedParentPageId) === String(page._id)) {
        throw new BadRequestException('parentPageId cannot reference this page');
      }

      // Build layout: zones, gridRows, gridColumns, urlParams
      const layoutZones = Array.isArray(layout?.zones)
        ? layout.zones.reduce((acc: string[], zone: string) => {
            const trimmed = String(zone).trim();
            if (trimmed) acc.push(trimmed);
            return acc;
          }, [])
        : undefined;

      // Validate category
      const validCategories = ['system', 'site'];
      const pageCategory = category && validCategories.includes(category) ? category : page.category;

      // Update page
      const updateData: any = {
        updatedAt: new Date(),
        updatedBy: new Types.ObjectId(user.id),
      };

      if (normalizedTitle !== undefined) updateData.title = normalizedTitle;
      if (normalizedSubtitle !== undefined) updateData.subtitle = normalizedSubtitle;
      if (alias !== undefined) updateData.alias = alias.trim().toLowerCase();
      if (slug !== undefined) updateData.slug = slug.trim().toLowerCase();
      if (pageRole !== undefined) updateData.pageRole = normalizedPageRole || null;
      if (parentPageId !== undefined) updateData.parentPageId = normalizedParentPageId;
      if (routeParams !== undefined) updateData.routeParams = normalizedRouteParams ?? [];
      if (leadingImage !== undefined) updateData.leadingImage = leadingImage?.trim() || null;
      if (hasNewTemplateInputs) {
        updateData.frontendTemplates = nextVariantPacks;
        updateData.frontendTemplate = nextVariantPacks.length === 1 ? nextVariantPacks[0] : null;
      }
      if (normalizedIntroText !== undefined) updateData.introText = normalizedIntroText;
      if (normalizedContent !== undefined) updateData.content = normalizedContent;
      if (category !== undefined) updateData.category = pageCategory;
      if (isPublished !== undefined) updateData.isPublished = Boolean(isPublished);

      // Merge layout: preserve gridRows, gridColumns, urlParams from request, or keep existing
      if (layout !== undefined) {
        const pageLayout: any = { ...(page.layout || {}) };
        if (layoutZones !== undefined) pageLayout.zones = layoutZones;
        if (typeof layout.gridRows === 'number' && layout.gridRows > 0) pageLayout.gridRows = layout.gridRows;
        if (typeof layout.gridColumns === 'number' && layout.gridColumns > 0) pageLayout.gridColumns = layout.gridColumns;
        if (layout.urlParams !== undefined) pageLayout.urlParams = String(layout.urlParams).trim();
        updateData.layout = pageLayout;
      }

      await collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: updateData });
      const updatedPage = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!updatedPage) {
        throw new NotFoundException(`Page not found after update: ${id}`);
      }

      // Convert ObjectId to string
      return {
        ...updatedPage,
        _id: updatedPage._id.toString(),
        createdBy: updatedPage.createdBy?.toString() || updatedPage.createdBy,
        updatedBy: updatedPage.updatedBy?.toString() || updatedPage.updatedBy,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error updating page:', error);
      throw new BadRequestException(
        `Failed to update page: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get modules for a page
   * Path: GET /api/admin/pages/:id/modules
   */
  @Get(':id/modules')
  async getPageModules(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const pagesCollection = db.collection('pages');
      const modulesCollection = db.collection('page_modules');

      const page = await pagesCollection.findOne({ _id: new Types.ObjectId(id) });
      if (!page) {
        throw new NotFoundException(`Page not found: ${id}`);
      }

      const modules = await modulesCollection
        .find({ pageId: page._id })
        .sort({ rowOrder: 1, columnIndex: 1, zone: 1, order: 1, createdAt: 1 })
        .toArray();

      const serialized = modules.map((module) => ({
        ...module,
        _id: module._id.toString(),
        pageId: module.pageId?.toString() || module.pageId,
      }));

      return { data: serialized };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error fetching page modules:', error);
      throw new BadRequestException(
        `Failed to fetch page modules: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a module for a page
   * Path: POST /api/admin/pages/:id/modules
   */
  @Post(':id/modules')
  async createPageModule(@Param('id') id: string, @Body() body: any) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const pagesCollection = db.collection('pages');
      const modulesCollection = db.collection('page_modules');

      const page = await pagesCollection.findOne({ _id: new Types.ObjectId(id) });
      if (!page) {
        throw new NotFoundException(`Page not found: ${id}`);
      }

      const { type, props, zone, order, rowOrder, columnIndex, columnProportion, rowSpan, colSpan } = body;
      
      // Support both old (zone/order) and new (row/column) structure
      const hasRowColumn = rowOrder !== undefined && columnIndex !== undefined && columnProportion !== undefined;
      const hasZoneOrder = zone !== undefined;
      
      if (!type) {
        throw new BadRequestException('Module type is required');
      }
      
      if (!hasRowColumn && !hasZoneOrder) {
        throw new BadRequestException('Either (rowOrder, columnIndex, columnProportion) or (zone) is required');
      }

      const moduleData: any = {
        pageId: page._id,
        type: String(type).trim(),
        props: props && typeof props === 'object' ? props : {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      if (hasRowColumn) {
        moduleData.rowOrder = typeof rowOrder === 'number' ? rowOrder : parseInt(rowOrder, 10);
        moduleData.columnIndex = typeof columnIndex === 'number' ? columnIndex : parseInt(columnIndex, 10);
        moduleData.columnProportion = typeof columnProportion === 'number' ? columnProportion : parseInt(columnProportion, 10);
        if (rowSpan !== undefined) moduleData.rowSpan = typeof rowSpan === 'number' ? rowSpan : parseInt(rowSpan, 10);
        if (colSpan !== undefined) moduleData.colSpan = typeof colSpan === 'number' ? colSpan : parseInt(colSpan, 10);
      } else {
        moduleData.zone = String(zone).trim();
        moduleData.order = typeof order === 'number' ? order : parseInt(order, 10) || 0;
      }

      const result = await modulesCollection.insertOne(moduleData);
      const module = await modulesCollection.findOne({ _id: result.insertedId });
      if (!module) {
        throw new BadRequestException('Failed to retrieve created module');
      }

      return {
        ...module,
        _id: module._id.toString(),
        pageId: module.pageId?.toString() || module.pageId,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error creating page module:', error);
      throw new BadRequestException(
        `Failed to create page module: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a module for a page
   * Path: PUT /api/admin/pages/:id/modules/:moduleId
   */
  @Put(':id/modules/:moduleId')
  async updatePageModule(
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
    @Body() body: UpdatePageModuleDto,
  ) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const pagesCollection = db.collection('pages');
      const modulesCollection = db.collection('page_modules');

      const page = await pagesCollection.findOne({ _id: new Types.ObjectId(id) });
      if (!page) {
        throw new NotFoundException(`Page not found: ${id}`);
      }

      const module = await modulesCollection.findOne({ _id: new Types.ObjectId(moduleId), pageId: page._id });
      if (!module) {
        throw new NotFoundException(`Module not found: ${moduleId}`);
      }

      const { type, props, zone, order, rowOrder, columnIndex, columnProportion, rowSpan, colSpan } = body;
      const updateData: any = { updatedAt: new Date() };

      if (type !== undefined) updateData.type = String(type).trim();
      if (props !== undefined) updateData.props = props && typeof props === 'object' ? props : {};
      
      // Support both old and new structure
      if (rowOrder !== undefined) {
        updateData.rowOrder = typeof rowOrder === 'number' ? rowOrder : parseInt(rowOrder, 10);
      }
      if (columnIndex !== undefined) {
        updateData.columnIndex = typeof columnIndex === 'number' ? columnIndex : parseInt(columnIndex, 10);
      }
      if (columnProportion !== undefined) {
        updateData.columnProportion = typeof columnProportion === 'number' ? columnProportion : parseInt(columnProportion, 10);
      }
      if (rowSpan !== undefined) updateData.rowSpan = typeof rowSpan === 'number' ? rowSpan : parseInt(rowSpan, 10);
      if (colSpan !== undefined) updateData.colSpan = typeof colSpan === 'number' ? colSpan : parseInt(colSpan, 10);
      if (zone !== undefined) updateData.zone = String(zone).trim();
      if (order !== undefined) {
        updateData.order = typeof order === 'number' ? order : parseInt(order, 10) || 0;
      }

      await modulesCollection.updateOne(
        { _id: new Types.ObjectId(moduleId) },
        { $set: updateData },
      );
      const updatedModule = await modulesCollection.findOne({ _id: new Types.ObjectId(moduleId) });
      if (!updatedModule) {
        throw new NotFoundException(`Module not found after update: ${moduleId}`);
      }

      return {
        ...updatedModule,
        _id: updatedModule._id.toString(),
        pageId: updatedModule.pageId?.toString() || updatedModule.pageId,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error updating page module:', error);
      throw new BadRequestException(
        `Failed to update page module: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a module for a page
   * Path: DELETE /api/admin/pages/:id/modules/:moduleId
   */
  @Delete(':id/modules/:moduleId')
  async deletePageModule(@Param('id') id: string, @Param('moduleId') moduleId: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const pagesCollection = db.collection('pages');
      const modulesCollection = db.collection('page_modules');

      const page = await pagesCollection.findOne({ _id: new Types.ObjectId(id) });
      if (!page) {
        throw new NotFoundException(`Page not found: ${id}`);
      }

      const module = await modulesCollection.findOne({ _id: new Types.ObjectId(moduleId), pageId: page._id });
      if (!module) {
        throw new NotFoundException(`Module not found: ${moduleId}`);
      }

      await modulesCollection.deleteOne({ _id: new Types.ObjectId(moduleId) });
      return { success: true, message: 'Module deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error deleting page module:', error);
      throw new BadRequestException(
        `Failed to delete page module: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a page
   * Path: DELETE /api/admin/pages/:id
   */
  @Delete(':id')
  async deletePage(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('pages');

      const page = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!page) {
        throw new NotFoundException(`Page not found: ${id}`);
      }

      await collection.deleteOne({ _id: new Types.ObjectId(id) });

      return { success: true, message: 'Page deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error deleting page:', error);
      throw new BadRequestException(
        `Failed to delete page: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
