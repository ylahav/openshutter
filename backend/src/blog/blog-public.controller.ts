import {
  BadRequestException,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { ownerSiteUserIdFromRequest } from '../common/utils/owner-site-from-request.util';

const BLOG_COLLECTION = 'blogarticles';
const BLOG_CATEGORIES_COLLECTION = 'blogcategories';

function serializeArticle(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: doc._id && typeof (doc._id as { toString?: () => string }).toString === 'function'
      ? (doc._id as { toString: () => string }).toString()
      : doc._id,
  };
}

function serializeCategory(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id:
      doc._id && typeof (doc._id as { toString?: () => string }).toString === 'function'
        ? (doc._id as { toString: () => string }).toString()
        : doc._id,
  };
}

@Controller('blog')
export class BlogPublicController {
  private readonly logger = new Logger(BlogPublicController.name);

  /**
   * Active blog categories for public navigation (e.g. page-builder module).
   * Declared before @Get(':slug') so "categories" is not captured as a slug.
   * GET /api/blog/categories?includeCounts=true
   */
  @Get('categories')
  async listCategories(@Req() req: Request, @Query('includeCounts') includeCounts?: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');

      const withCounts = includeCounts !== 'false';
      const ownerUserId = ownerSiteUserIdFromRequest(req);

      const categoriesColl = db.collection(BLOG_CATEGORIES_COLLECTION);
      // Treat missing isActive / string "true" as active (legacy), same as admin list filter.
      const rawCategories = await categoriesColl
        .find({
          $or: [{ isActive: true }, { isActive: 'true' }, { isActive: { $exists: false } }],
        })
        .sort({ sortOrder: 1, createdAt: -1 })
        .toArray();

      let countByAlias: Record<string, number> = {};
      if (withCounts) {
        const articleFilter: Record<string, unknown> = { isPublished: true };
        if (ownerUserId) {
          articleFilter.authorId = ownerUserId;
        }
        const countsAgg = await db
          .collection(BLOG_COLLECTION)
          .aggregate([
            { $match: articleFilter },
            { $group: { _id: '$category', count: { $sum: 1 } } },
          ])
          .toArray();
        countByAlias = Object.fromEntries(
          countsAgg
            .filter((row) => row._id != null && String(row._id).trim() !== '')
            .map((row) => [String(row._id), Number(row.count) || 0]),
        );
      }

      const categories = rawCategories.map((c) => {
        const serialized = serializeCategory(c as Record<string, unknown>) as Record<string, unknown>;
        const alias = serialized.alias != null ? String(serialized.alias) : '';
        if (withCounts && alias) {
          serialized.articleCount = countByAlias[alias] ?? 0;
        }
        return serialized;
      });

      return { categories };
    } catch (error) {
      this.logger.error(
        `Error listing blog categories: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException(
        `Failed to list categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * List published blog articles (optionally filtered by category).
   * GET /api/blog
   */
  @Get()
  async list(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');

      const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const ownerUserId = ownerSiteUserIdFromRequest(req);
      const filter: Record<string, unknown> = { isPublished: true };
      if (ownerUserId) {
        filter.authorId = ownerUserId;
      }
      if (category && String(category).trim()) {
        filter.category = String(category).trim();
      }

      const collection = db.collection(BLOG_COLLECTION);
      const [articles, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ publishedAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .toArray(),
        collection.countDocuments(filter),
      ]);

      return {
        articles: articles.map((a) => serializeArticle(a as Record<string, unknown>)),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Error listing blog articles: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Failed to list articles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a published article by slug.
   * GET /api/blog/:slug
   */
  @Get(':slug')
  async getBySlug(@Req() req: Request, @Param('slug') slug: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');

      const normalizedSlug = String(slug).trim().toLowerCase();
      const ownerUserId = ownerSiteUserIdFromRequest(req);
      const filter: Record<string, unknown> = {
        slug: normalizedSlug,
        isPublished: true,
      };
      if (ownerUserId) {
        filter.authorId = ownerUserId;
      }

      const collection = db.collection(BLOG_COLLECTION);
      const article = await collection.findOne(filter);

      if (!article) {
        throw new NotFoundException(`Article not found: ${normalizedSlug}`);
      }

      return { article: serializeArticle(article as Record<string, unknown>) };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching blog article: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Failed to fetch article: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
