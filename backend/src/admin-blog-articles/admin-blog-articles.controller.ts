import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import mongoose, { Types } from 'mongoose';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import { SUPPORTED_LANGUAGES } from '../types/multi-lang';
import { CreateBlogArticleAdminDto } from './dto/create-blog-article-admin.dto';
import { UpdateBlogArticleAdminDto } from './dto/update-blog-article-admin.dto';

const BLOG_COLLECTION = 'blogarticles';

function pickTitleString(title: unknown): string {
  if (typeof title === 'string') return title.trim();
  if (title && typeof title === 'object') {
    const o = title as Record<string, string>;
    const v = o.en || o.he || Object.values(o).find((x) => typeof x === 'string' && x.trim());
    return typeof v === 'string' ? v.trim() : '';
  }
  return '';
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeLangMap(val: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!val) return out;
  if (typeof val === 'string') {
    out.en = val.trim();
    return out;
  }
  if (typeof val === 'object') {
    const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
    for (const key of Object.keys(val as object)) {
      if (!langs.includes(key)) continue;
      const s = (val as Record<string, unknown>)[key];
      if (typeof s === 'string' && s.trim()) out[key] = s.trim();
    }
  }
  return out;
}

function serializeArticle(doc: Record<string, unknown>) {
  return {
    ...doc,
    _id: doc._id && typeof (doc._id as { toString?: () => string }).toString === 'function'
      ? (doc._id as { toString: () => string }).toString()
      : doc._id,
  };
}

@Controller('admin/blog-articles')
@UseGuards(AdminGuard)
export class AdminBlogArticlesController {
  private readonly logger = new Logger(AdminBlogArticlesController.name);

  @Get()
  async list(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isPublished') isPublished?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');

      const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const query: Record<string, unknown> = {};
      if (category && String(category).trim()) {
        query.category = String(category).trim();
      }
      if (isPublished === 'true') query.isPublished = true;
      else if (isPublished === 'false') query.isPublished = false;

      if (search && String(search).trim()) {
        const q = String(search).trim();
        const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
        query.$or = [
          { slug: { $regex: q, $options: 'i' } },
          ...langs.map((code) => ({ [`title.${code}`]: { $regex: q, $options: 'i' } })),
        ];
      }

      const collection = db.collection(BLOG_COLLECTION);
      const [articles, total] = await Promise.all([
        collection.find(query).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
        collection.countDocuments(query),
      ]);

      return {
        data: articles.map((a) => serializeArticle(a as Record<string, unknown>)),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 0,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error listing blog articles:', error);
      throw new InternalServerErrorException('Failed to fetch blog articles');
    }
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    try {
      if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const doc = await db.collection(BLOG_COLLECTION).findOne({ _id: new Types.ObjectId(id) });
      if (!doc) throw new NotFoundException('Article not found');
      return serializeArticle(doc as Record<string, unknown>);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error fetching blog article:', error);
      throw new InternalServerErrorException('Failed to fetch blog article');
    }
  }

  @Post()
  async create(@Req() req: Request, @Body() body: CreateBlogArticleAdminDto) {
    try {
      const user = (req as Request & { user?: { id: string } }).user;
      if (!user?.id) throw new BadRequestException('User context missing');

      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');

      const category = String(body.category || '').trim();
      if (!category) throw new BadRequestException('Category is required');

      const titleMap = normalizeLangMap(body.title);
      if (Object.keys(titleMap).length === 0) throw new BadRequestException('Title is required');

      const contentMap = normalizeLangMap(body.content);
      if (Object.keys(contentMap).length === 0) throw new BadRequestException('Content is required');

      const excerptMap = normalizeLangMap(body.excerpt);
      const seoTitleMap = normalizeLangMap(body.seoTitle);
      const seoDescMap = normalizeLangMap(body.seoDescription);

      const tags = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === 'string').map((t) => String(t).trim()) : [];

      const collection = db.collection(BLOG_COLLECTION);
      const baseSlug = body.slug?.trim() ? slugify(body.slug.trim()) : slugify(pickTitleString(body.title));
      const slug = await this.ensureUniqueSlug(collection, baseSlug || 'post');

      const now = new Date();
      const isPublished = Boolean(body.isPublished);
      const doc: Record<string, unknown> = {
        title: titleMap,
        slug,
        category,
        tags,
        content: contentMap,
        isPublished,
        isFeatured: Boolean(body.isFeatured),
        authorId: user.id,
        viewCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      if (Object.keys(excerptMap).length) doc.excerpt = excerptMap;
      if (Object.keys(seoTitleMap).length) doc.seoTitle = seoTitleMap;
      if (Object.keys(seoDescMap).length) doc.seoDescription = seoDescMap;
      if (body.leadingImage && typeof body.leadingImage === 'object') doc.leadingImage = body.leadingImage;
      if (isPublished) doc.publishedAt = now;

      const result = await collection.insertOne(doc);
      const created = await collection.findOne({ _id: result.insertedId });
      if (!created) throw new InternalServerErrorException('Failed to read created article');
      return serializeArticle(created as Record<string, unknown>);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error creating blog article:', error);
      throw new InternalServerErrorException('Failed to create blog article');
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateBlogArticleAdminDto) {
    try {
      if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection(BLOG_COLLECTION);
      const oid = new Types.ObjectId(id);
      const existing = await collection.findOne({ _id: oid });
      if (!existing) throw new NotFoundException('Article not found');

      const $set: Record<string, unknown> = { updatedAt: new Date() };

      if (body.category !== undefined) {
        const c = String(body.category).trim();
        if (!c) throw new BadRequestException('Category cannot be empty');
        $set.category = c;
      }
      if (body.title !== undefined) {
        const titleMap = normalizeLangMap(body.title);
        if (Object.keys(titleMap).length === 0) throw new BadRequestException('Title cannot be empty');
        $set.title = titleMap;
      }
      if (body.content !== undefined) {
        const contentMap = normalizeLangMap(body.content);
        if (Object.keys(contentMap).length === 0) throw new BadRequestException('Content cannot be empty');
        $set.content = contentMap;
      }
      if (body.excerpt !== undefined) {
        const excerptMap = normalizeLangMap(body.excerpt);
        if (Object.keys(excerptMap).length === 0) {
          $set.excerpt = null;
        } else {
          $set.excerpt = excerptMap;
        }
      }
      if (body.seoTitle !== undefined) {
        const m = normalizeLangMap(body.seoTitle);
        $set.seoTitle = Object.keys(m).length ? m : null;
      }
      if (body.seoDescription !== undefined) {
        const m = normalizeLangMap(body.seoDescription);
        $set.seoDescription = Object.keys(m).length ? m : null;
      }
      if (body.tags !== undefined) {
        $set.tags = Array.isArray(body.tags)
          ? body.tags.filter((t) => typeof t === 'string').map((t) => String(t).trim())
          : [];
      }
      if (body.isPublished !== undefined) {
        $set.isPublished = Boolean(body.isPublished);
        if (body.isPublished && !existing.publishedAt) {
          $set.publishedAt = new Date();
        }
      }
      if (body.isFeatured !== undefined) $set.isFeatured = Boolean(body.isFeatured);
      if (body.leadingImage !== undefined) {
        $set.leadingImage = body.leadingImage && typeof body.leadingImage === 'object' ? body.leadingImage : null;
      }
      if (body.slug !== undefined && String(body.slug).trim()) {
        const next = await this.ensureUniqueSlug(collection, slugify(String(body.slug).trim()), oid);
        $set.slug = next;
      }

      await collection.updateOne({ _id: oid }, { $set });
      const updated = await collection.findOne({ _id: oid });
      return serializeArticle(updated as Record<string, unknown>);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error updating blog article:', error);
      throw new InternalServerErrorException('Failed to update blog article');
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const res = await db.collection(BLOG_COLLECTION).deleteOne({ _id: new Types.ObjectId(id) });
      if (res.deletedCount === 0) throw new NotFoundException('Article not found');
      return { success: true, message: 'Article deleted' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error deleting blog article:', error);
      throw new InternalServerErrorException('Failed to delete blog article');
    }
  }

  private async ensureUniqueSlug(
    collection: { findOne: (filter: Record<string, unknown>) => Promise<unknown> },
    base: string,
    excludeId?: Types.ObjectId,
  ): Promise<string> {
    let slug = base || 'post';
    let candidate = slug;
    let i = 1;
    while (true) {
      const q: Record<string, unknown> = { slug: candidate };
      if (excludeId) q._id = { $ne: excludeId };
      const exists = await collection.findOne(q);
      if (!exists) return candidate;
      candidate = `${slug}-${i++}`;
    }
  }
}
