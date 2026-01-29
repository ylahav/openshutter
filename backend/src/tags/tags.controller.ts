import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { SUPPORTED_LANGUAGES } from '../types/multi-lang';

@Controller('admin/tags')
@UseGuards(AdminGuard)
export class TagsController {
  private readonly logger = new Logger(TagsController.name);
  /**
   * Get all tags with optional search and category filter
   * Path: GET /api/admin/tags
   */
  @Get()
  async getTags(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('tags');

      // Build query
      const query: any = {};

      if (search) {
        // Support search in both string and multi-language fields
        const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
        const searchConditions = [
          // String fields (backward compatibility)
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          // Multi-language fields
          ...langs.map((code) => ({ [`name.${code}`]: { $regex: search, $options: 'i' } })),
          ...langs.map((code) => ({ [`description.${code}`]: { $regex: search, $options: 'i' } }))
        ];
        query.$or = searchConditions;
      }

      if (category && category !== 'all') {
        query.category = category;
      }

      // Pagination
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '50', 10);
      const skip = (pageNum - 1) * limitNum;

      const [tags, total] = await Promise.all([
        collection.find(query).sort({ name: 1 }).skip(skip).limit(limitNum).toArray(),
        collection.countDocuments(query),
      ]);

      // Convert ObjectIds to strings for JSON serialization
      const serializedTags = tags.map((tag) => ({
        ...tag,
        _id: tag._id.toString(),
        createdBy: tag.createdBy?.toString() || tag.createdBy,
      }));

      return {
        data: serializedTags,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching tags:', error);
      throw new BadRequestException(
        `Failed to fetch tags: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a specific tag by ID
   * Path: GET /api/admin/tags/:id
   */
  @Get(':id')
  async getTag(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('tags');

      const tag = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!tag) {
        throw new NotFoundException(`Tag not found: ${id}`);
      }

      // Convert ObjectId to string for JSON serialization
      return {
        ...tag,
        _id: tag._id.toString(),
        createdBy: tag.createdBy?.toString() || tag.createdBy,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error fetching tag:', error);
      throw new BadRequestException(
        `Failed to fetch tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a new tag
   * Path: POST /api/admin/tags
   */
  @Post()
  async createTag(@Body() body: any) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('tags');

      const { name, description, color, category } = body;

      // Validate required fields - support both string and multi-language
      const hasAnyName =
        typeof name === 'string'
          ? !!name.trim()
          : name && typeof name === 'object'
            ? Object.values(name as Record<string, any>).some((v) => typeof v === 'string' && v.trim().length > 0)
            : false;
      if (!hasAnyName) {
        throw new BadRequestException('Tag name is required');
      }

      // Convert name to multi-language format if it's a string
      // Filter out empty strings to keep only languages with actual content
      const nameObj =
        typeof name === 'string'
          ? { en: name.trim() }
          : Object.fromEntries(
              SUPPORTED_LANGUAGES.map((l) => {
                const val = (name as any)?.[l.code];
                return [l.code, typeof val === 'string' ? val.trim() : ''];
              })
                .filter(([_, value]) => value && typeof value === 'string' && value.trim().length > 0)
            );

      // Ensure nameObj is not empty
      if (!nameObj || Object.keys(nameObj).length === 0) {
        throw new BadRequestException('Tag name is required in at least one language');
      }

      // Convert description to multi-language format if it's a string
      // Filter out empty strings to keep only languages with actual content
      const descriptionObj = description
        ? typeof description === 'string'
          ? { en: description.trim() }
          : Object.fromEntries(
              SUPPORTED_LANGUAGES.map((l) => {
                const val = (description as any)?.[l.code];
                return [l.code, typeof val === 'string' ? val.trim() : ''];
              })
                .filter(([_, value]) => value && typeof value === 'string' && value.trim().length > 0)
            )
        : undefined;

      // Check if tag already exists (check by any language name)
      const nameConditions = SUPPORTED_LANGUAGES.map((l) => ({
        [`name.${l.code}`]: (nameObj as any)[l.code]
      })).filter((cond) => Object.values(cond)[0]);
      
      // Also check old string format for backward compatibility
      const existingTagQuery: any = {
        $or: [
          ...(nameConditions.length ? nameConditions : []),
          // Backward compatibility: check string name
          ...(typeof name === 'string' ? [{ name: name.trim() }] : [])
        ]
      };

      const existingTag = await collection.findOne(existingTagQuery);
      if (existingTag) {
        throw new BadRequestException('Tag with this name already exists');
      }

      // Validate category
      const validCategories = ['general', 'location', 'event', 'object', 'mood', 'technical', 'custom'];
      const tagCategory = category && validCategories.includes(category) ? category : 'general';

      // Create tag
      const now = new Date();
      const tagData = {
        name: nameObj,
        description: descriptionObj,
        color: color || '#3B82F6',
        category: tagCategory,
        isActive: true,
        usageCount: 0,
        createdBy: new Types.ObjectId(), // TODO: Get from auth context
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(tagData);
      const tag = await collection.findOne({ _id: result.insertedId });

      if (!tag) {
        throw new BadRequestException('Failed to retrieve created tag');
      }

      // Convert ObjectId to string for JSON serialization
      return {
        ...tag,
        _id: tag._id.toString(),
        createdBy: tag.createdBy?.toString() || tag.createdBy,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error creating tag:', error);
      throw new BadRequestException(
        `Failed to create tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a tag
   * Path: PUT /api/admin/tags/:id
   */
  @Put(':id')
  async updateTag(@Param('id') id: string, @Body() body: any) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('tags');

      const tag = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!tag) {
        throw new NotFoundException(`Tag not found: ${id}`);
      }

      const { name, description, color, category, isActive } = body;

      // Update tag
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (name !== undefined) {
        // Validate required fields - support both string and multi-language
        const hasAnyName =
          typeof name === 'string'
            ? !!name.trim()
            : name && typeof name === 'object'
              ? Object.values(name as Record<string, any>).some((v) => typeof v === 'string' && v.trim().length > 0)
              : false;
        if (!hasAnyName) {
          throw new BadRequestException('Tag name is required');
        }

        // Convert name to multi-language format if it's a string
        const nameObj =
          typeof name === 'string'
            ? { en: name.trim() }
            : Object.fromEntries(
                SUPPORTED_LANGUAGES.map((l) => {
                  const val = (name as any)?.[l.code];
                  return [l.code, typeof val === 'string' ? val.trim() : ''];
                })
                  .filter(([_, value]) => value && typeof value === 'string' && value.trim().length > 0)
              );

        if (!nameObj || Object.keys(nameObj).length === 0) {
          throw new BadRequestException('Tag name is required in at least one language');
        }

        // Check if name changed and if new name already exists
        const nameConditions = SUPPORTED_LANGUAGES.map((l) => ({
          [`name.${l.code}`]: (nameObj as any)[l.code]
        })).filter((cond) => Object.values(cond)[0]);

        const duplicateQuery: any = {
          _id: { $ne: new Types.ObjectId(id) },
          $or: [
            ...(nameConditions.length ? nameConditions : []),
            ...(typeof name === 'string' ? [{ name: name.trim() }] : [])
          ]
        };

        const existingTag = await collection.findOne(duplicateQuery);
        if (existingTag) {
          throw new BadRequestException('Tag with this name already exists');
        }

        updateData.name = nameObj;
      }

      if (description !== undefined) {
        const descriptionObj = description
          ? typeof description === 'string'
            ? { en: description.trim() }
            : Object.fromEntries(
                SUPPORTED_LANGUAGES.map((l) => {
                  const val = (description as any)?.[l.code];
                  return [l.code, typeof val === 'string' ? val.trim() : ''];
                })
                  .filter(([_, value]) => value && typeof value === 'string' && value.trim().length > 0)
              )
          : undefined;
        updateData.description = descriptionObj;
      }

      // Validate category
      const validCategories = ['general', 'location', 'event', 'object', 'mood', 'technical', 'custom'];
      const tagCategory = category && validCategories.includes(category) ? category : tag.category;

      if (color !== undefined) updateData.color = color;
      if (category !== undefined) updateData.category = tagCategory;
      if (isActive !== undefined) updateData.isActive = isActive;

      await collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: updateData });
      const updatedTag = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!updatedTag) {
        throw new NotFoundException(`Tag not found after update: ${id}`);
      }

      // Convert ObjectId to string for JSON serialization
      return {
        ...updatedTag,
        _id: updatedTag._id.toString(),
        createdBy: updatedTag.createdBy?.toString() || updatedTag.createdBy,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error updating tag:', error);
      throw new BadRequestException(
        `Failed to update tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a tag
   * Path: DELETE /api/admin/tags/:id
   */
  @Delete(':id')
  async deleteTag(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('tags');

      const tag = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!tag) {
        throw new NotFoundException(`Tag not found: ${id}`);
      }

      await collection.deleteOne({ _id: new Types.ObjectId(id) });

      return { success: true, message: 'Tag deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error deleting tag:', error);
      throw new BadRequestException(
        `Failed to delete tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
