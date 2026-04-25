import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { ownerSiteUserIdFromRequest } from '../common/utils/owner-site-from-request.util';
import { normalizeVisitorPack } from '../common/utils/visitor-pack.util';

@Controller('pages')
export class PagesPublicController {
  private readonly logger = new Logger(PagesPublicController.name);
  private static readonly ROLE_QUERY_ALLOWLIST = new Set(['home', 'gallery', 'album', 'login', 'search', 'blog']);

  private static hasPackVariant(page: any, pack: string): boolean {
    if (!page || !pack) return false;
    const multi = Array.isArray(page.frontendTemplates) ? page.frontendTemplates.map((p: unknown) => String(p).trim().toLowerCase()) : [];
    const legacy = String(page.frontendTemplate ?? '').trim().toLowerCase();
    const normalizedPack = String(pack).trim().toLowerCase();
    return multi.includes(normalizedPack) || legacy === normalizedPack;
  }

  private static isDefaultVariant(page: any): boolean {
    if (!page) return false;
    const multi = Array.isArray(page.frontendTemplates) ? page.frontendTemplates : [];
    const legacy = String(page.frontendTemplate ?? '').trim();
    return multi.length === 0 && legacy.length === 0;
  }

  private static readonly DEFAULT_PAGE_LAYOUTS: Record<string, { gridRows: number; gridColumns: number; zones: string[] }> = {
    home: { gridRows: 2, gridColumns: 1, zones: ['main'] },
    gallery: { gridRows: 1, gridColumns: 1, zones: ['main'] },
    album: { gridRows: 1, gridColumns: 1, zones: ['main'] },
    login: { gridRows: 1, gridColumns: 1, zones: ['main'] },
    search: { gridRows: 1, gridColumns: 1, zones: ['main'] },
    blog: { gridRows: 1, gridColumns: 1, zones: ['main'] },
  };

  private static readonly DEFAULT_PAGE_MODULES: Record<string, Array<Record<string, unknown>>> = {
    home: [
      {
        type: 'hero',
        props: {
          title: { en: 'Welcome to Our Gallery' },
          subtitle: { en: 'Discover amazing moments captured in time' },
          ctaLabel: { en: 'Explore Albums' },
          ctaUrl: '/albums',
          backgroundStyle: 'light',
        },
        rowOrder: 0,
        columnIndex: 0,
        columnProportion: 1,
        rowSpan: 1,
        colSpan: 1,
      },
      {
        type: 'albumsGrid',
        props: { albumSource: 'root' },
        rowOrder: 1,
        columnIndex: 0,
        columnProportion: 1,
        rowSpan: 1,
        colSpan: 1,
      },
    ],
    gallery: [
      {
        type: 'albumsGrid',
        props: { albumSource: 'root' },
        rowOrder: 0,
        columnIndex: 0,
        columnProportion: 1,
        rowSpan: 1,
        colSpan: 1,
      },
    ],
    album: [
      {
        type: 'albumView',
        props: { albumSource: 'current' },
        rowOrder: 0,
        columnIndex: 0,
        columnProportion: 1,
        rowSpan: 1,
        colSpan: 1,
      },
    ],
    login: [
      {
        type: 'loginForm',
        props: {},
        rowOrder: 0,
        columnIndex: 0,
        columnProportion: 1,
        rowSpan: 1,
        colSpan: 1,
      },
    ],
    search: [
      {
        type: 'richText',
        props: {
          title: { en: 'Search Results' },
          body: { en: '<p>Use the search bar to find photos, albums, people, and locations.</p>' },
          background: 'white',
        },
        rowOrder: 0,
        columnIndex: 0,
        columnProportion: 1,
        rowSpan: 1,
        colSpan: 1,
      },
    ],
    blog: [
      {
        type: 'blogArticle',
        props: { scope: 'index' },
        rowOrder: 0,
        columnIndex: 0,
        columnProportion: 1,
        rowSpan: 1,
        colSpan: 1,
      },
    ],
  };

  private async ensureReservedPage(
    db: mongoose.mongo.Db,
    role: string,
    ownerUserId: string | null,
  ): Promise<any | null> {
    const pagesCollection = db.collection('pages');
    const modulesCollection = db.collection('page_modules');
    const now = new Date();

    let createdBy: Types.ObjectId | null = null;
    if (ownerUserId && Types.ObjectId.isValid(ownerUserId)) {
      createdBy = new Types.ObjectId(ownerUserId);
    } else {
      const usersCollection = db.collection('users');
      const admin = await usersCollection.findOne({ role: 'admin' }, { projection: { _id: 1 } });
      if (admin?._id) createdBy = new Types.ObjectId(String(admin._id));
      if (!createdBy) {
        const anyUser = await usersCollection.findOne({}, { projection: { _id: 1 } });
        if (anyUser?._id) createdBy = new Types.ObjectId(String(anyUser._id));
      }
    }
    // Last-resort fallback: keep page creation possible even if users bootstrap is incomplete.
    if (!createdBy) createdBy = new Types.ObjectId();

    // Default variant only: one auto-seeded row per role with no pack (see compound unique pageRole + frontendTemplate).
    const existingDefault = await pagesCollection.findOne({
      pageRole: role,
      $or: [
        { frontendTemplates: { $exists: false } },
        { frontendTemplates: { $size: 0 } },
        { frontendTemplate: null },
        { frontendTemplate: '' },
        { frontendTemplate: { $exists: false } },
      ],
    });
    if (existingDefault) {
      if (!existingDefault.isPublished) {
        await pagesCollection.updateOne(
          { _id: existingDefault._id },
          { $set: { isPublished: true, updatedAt: now, updatedBy: createdBy } },
        );
      }
      return await pagesCollection.findOne({ _id: existingDefault._id });
    }

    const alias = role;
    const layout = PagesPublicController.DEFAULT_PAGE_LAYOUTS[role] || { gridRows: 1, gridColumns: 1, zones: ['main'] };
    const pageDoc = {
      title: { en: alias, he: '' },
      alias,
      slug: alias,
      pageRole: role,
      frontendTemplates: [],
      frontendTemplate: null,
      category: 'system',
      isPublished: true,
      layout,
      createdBy,
      updatedBy: createdBy,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const inserted = await pagesCollection.insertOne(pageDoc);
      const pageId = inserted.insertedId;
      const modules = PagesPublicController.DEFAULT_PAGE_MODULES[role] || [];
      if (modules.length) {
        await modulesCollection.insertMany(
          modules.map((m) => ({
            ...m,
            pageId,
            createdAt: now,
            updatedAt: now,
          })),
        );
      }
      this.logger.log(`Auto-created reserved page '${role}'`);
      return await pagesCollection.findOne({ _id: pageId });
    } catch (err: any) {
      // If an old row already uses this slug/alias (or duplicate pageRole), repurpose / recover.
      const isDup =
        err?.code === 11000 || err?.codeName === 'DuplicateKey' || String(err?.message || '').includes('E11000');
      if (isDup) {
        let legacy = await pagesCollection.findOne({ $or: [{ alias }, { slug: alias }] });
        if (!legacy) legacy = await pagesCollection.findOne({ pageRole: role });
        if (legacy) {
          await pagesCollection.updateOne(
            { _id: legacy._id },
            {
              $set: {
                pageRole: role,
                isPublished: true,
                updatedAt: now,
                updatedBy: createdBy,
              },
            },
          );
          this.logger.log(`Assigned reserved role '${role}' to existing page '${alias}'`);
          return await pagesCollection.findOne({ _id: legacy._id });
        }
      }
      this.logger.error(`Failed to auto-create reserved page '${role}': ${err?.message || String(err)}`);
      return null;
    }
  }
  
  /**
   * Get a published page by slug
   * Path: GET /api/pages/:slug
   */
  @Get(':slug')
  async getPageBySlug(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Query('role') role?: string,
    @Query('pack') pack?: string,
    @Query('frontendTemplate') frontendTemplate?: string,
  ) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const pagesCollection = db.collection('pages');
      const modulesCollection = db.collection('page_modules');

      const normalizedSlug = String(slug).trim().toLowerCase();
      const normalizedRole = String(role ?? '').trim().toLowerCase();
      const normalizedPack = normalizeVisitorPack(pack ?? frontendTemplate);
      const ownerUserId = ownerSiteUserIdFromRequest(req);

      let page: any = null;

      if (PagesPublicController.ROLE_QUERY_ALLOWLIST.has(normalizedRole)) {
        const base = { isPublished: true, pageRole: normalizedRole } as Record<string, unknown>;
        if (normalizedPack) {
          page = await pagesCollection.findOne({
            ...base,
            $or: [{ frontendTemplates: normalizedPack }, { frontendTemplates: { $in: [normalizedPack] } }],
          });
        }
        if (!page && normalizedPack) {
          // Legacy single-pack field fallback after multi-pack check.
          page = await pagesCollection.findOne({
            ...base,
            frontendTemplate: normalizedPack,
          });
        }
        if (!page) {
          // Prefer explicit empty multi-pack/default rows first.
          page = await pagesCollection.findOne({
            ...base,
            $or: [{ frontendTemplates: { $size: 0 } }, { frontendTemplates: { $exists: false } }],
          });
        }
        if (!page) {
          // Legacy empty/default variants.
          page = await pagesCollection.findOne({
            ...base,
            $or: [{ frontendTemplate: null }, { frontendTemplate: '' }, { frontendTemplate: { $exists: false } }],
          });
        }
        if (!page) {
          page = await pagesCollection.findOne(base);
        }
        if (!page) {
          page = await this.ensureReservedPage(db, normalizedRole, ownerUserId ?? null);
        }
      } else {
        const pageQuery: Record<string, unknown> = {
          isPublished: true,
          $or: [{ slug: normalizedSlug }, { alias: normalizedSlug }],
        };
        if (
          ownerUserId &&
          Types.ObjectId.isValid(ownerUserId) &&
          !PagesPublicController.ROLE_QUERY_ALLOWLIST.has(normalizedRole)
        ) {
          pageQuery.createdBy = new Types.ObjectId(ownerUserId);
        }
        const candidates = await pagesCollection.find(pageQuery).toArray();
        if (normalizedPack) {
          page = candidates.find((candidate) => PagesPublicController.hasPackVariant(candidate, normalizedPack)) || null;
        }
        if (!page) {
          page = candidates.find((candidate) => PagesPublicController.isDefaultVariant(candidate)) || null;
        }
        if (!page) {
          page = candidates[0] || null;
        }
      }

      if (!page) {
        throw new NotFoundException(
          `Page not found: ${PagesPublicController.ROLE_QUERY_ALLOWLIST.has(normalizedRole) ? normalizedRole : normalizedSlug}`,
        );
      }

      const modules = await modulesCollection
        .find({ pageId: page._id })
        .sort({ rowOrder: 1, columnIndex: 1, zone: 1, order: 1, createdAt: 1 })
        .toArray();

      const serializedPage = {
        ...page,
        _id: page._id.toString(),
        createdBy: page.createdBy?.toString() || page.createdBy,
        updatedBy: page.updatedBy?.toString() || page.updatedBy,
      };

      const serializedModules = modules.map((module) => ({
        ...module,
        _id: module._id.toString(),
        pageId: module.pageId?.toString() || module.pageId,
      }));

      return { page: serializedPage, modules: serializedModules };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching public page: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Failed to fetch page: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
