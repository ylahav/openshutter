import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { SUPPORTED_LANGUAGES } from '../types/multi-lang';

@Controller('admin/pages')
@UseGuards(AdminGuard)
export class PagesController {
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
      if (!db) throw new Error('Database connection not established');
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
      console.error('Error fetching pages:', error);
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
      if (!db) throw new Error('Database connection not established');
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
      console.error('Error fetching page:', error);
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
  async createPage(@Body() body: any) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection not established');
      const collection = db.collection('pages');

      const { title, subtitle, alias, leadingImage, introText, content, category, isPublished } = body;

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

      // Normalize alias
      const normalizedAlias = String(alias).trim().toLowerCase();
      if (!normalizedAlias) {
        throw new BadRequestException('Alias cannot be empty');
      }

      // Validate category
      const validCategories = ['system', 'site'];
      const pageCategory = category && validCategories.includes(category) ? category : 'site';

      // Check if alias already exists
      const existingPage = await collection.findOne({ alias: normalizedAlias });
      if (existingPage) {
        throw new BadRequestException('Page with this alias already exists');
      }

      // Create page
      const now = new Date();
      const pageData: any = {
        title: normalizedTitle,
        alias: normalizedAlias,
        category: pageCategory,
        isPublished: Boolean(isPublished),
        createdBy: new Types.ObjectId(), // TODO: Get from auth context
        updatedBy: new Types.ObjectId(), // TODO: Get from auth context
        createdAt: now,
        updatedAt: now,
      };

      if (normalizedSubtitle) pageData.subtitle = normalizedSubtitle;
      if (leadingImage?.trim()) pageData.leadingImage = leadingImage.trim();
      if (normalizedIntroText) pageData.introText = normalizedIntroText;
      if (normalizedContent) pageData.content = normalizedContent;

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
      console.error('Error creating page:', error);
      throw new BadRequestException(
        `Failed to create page: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a page
   * Path: PUT /api/admin/pages/:id
   */
  @Put(':id')
  async updatePage(@Param('id') id: string, @Body() body: any) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection not established');
      const collection = db.collection('pages');

      const page = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!page) {
        throw new NotFoundException(`Page not found: ${id}`);
      }

      const { title, subtitle, alias, leadingImage, introText, content, category, isPublished } = body;

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

      // Validate category
      const validCategories = ['system', 'site'];
      const pageCategory = category && validCategories.includes(category) ? category : page.category;

      // Update page
      const updateData: any = {
        updatedAt: new Date(),
        updatedBy: new Types.ObjectId(), // TODO: Get from auth context
      };

      if (normalizedTitle !== undefined) updateData.title = normalizedTitle;
      if (normalizedSubtitle !== undefined) updateData.subtitle = normalizedSubtitle;
      if (alias !== undefined) updateData.alias = alias.trim().toLowerCase();
      if (leadingImage !== undefined) updateData.leadingImage = leadingImage?.trim() || null;
      if (normalizedIntroText !== undefined) updateData.introText = normalizedIntroText;
      if (normalizedContent !== undefined) updateData.content = normalizedContent;
      if (category !== undefined) updateData.category = pageCategory;
      if (isPublished !== undefined) updateData.isPublished = Boolean(isPublished);

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
      console.error('Error updating page:', error);
      throw new BadRequestException(
        `Failed to update page: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      if (!db) throw new Error('Database connection not established');
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
      console.error('Error deleting page:', error);
      throw new BadRequestException(
        `Failed to delete page: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

