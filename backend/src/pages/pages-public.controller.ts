import { Controller, Get, Param, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';

@Controller('pages')
export class PagesPublicController {
  private readonly logger = new Logger(PagesPublicController.name);
  
  /**
   * Get a published page by slug
   * Path: GET /api/pages/:slug
   */
  @Get(':slug')
  async getPageBySlug(@Param('slug') slug: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection not established');
      const pagesCollection = db.collection('pages');
      const modulesCollection = db.collection('page_modules');

      const normalizedSlug = String(slug).trim().toLowerCase();
      const page = await pagesCollection.findOne({
        isPublished: true,
        $or: [{ slug: normalizedSlug }, { alias: normalizedSlug }],
      });

      if (!page) {
        throw new NotFoundException(`Page not found: ${normalizedSlug}`);
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
