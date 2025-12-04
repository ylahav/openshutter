import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';

@Controller('admin/tags')
@UseGuards(AdminGuard)
export class TagsController {
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
      if (!db) throw new Error('Database connection not established');
      const collection = db.collection('tags');

      // Build query
      const query: any = {};

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
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
      console.error('Error fetching tags:', error);
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
      if (!db) throw new Error('Database connection not established');
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
      console.error('Error fetching tag:', error);
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
      if (!db) throw new Error('Database connection not established');
      const collection = db.collection('tags');

      const { name, description, color, category } = body;

      // Validate required fields
      if (!name || !name.trim()) {
        throw new BadRequestException('Tag name is required');
      }

      // Check if tag already exists
      const existingTag = await collection.findOne({ name: name.trim() });
      if (existingTag) {
        throw new BadRequestException('Tag with this name already exists');
      }

      // Validate category
      const validCategories = ['general', 'location', 'event', 'object', 'mood', 'technical', 'custom'];
      const tagCategory = category && validCategories.includes(category) ? category : 'general';

      // Create tag
      const now = new Date();
      const tagData = {
        name: name.trim(),
        description: description?.trim() || '',
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
      console.error('Error creating tag:', error);
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
      if (!db) throw new Error('Database connection not established');
      const collection = db.collection('tags');

      const tag = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!tag) {
        throw new NotFoundException(`Tag not found: ${id}`);
      }

      const { name, description, color, category, isActive } = body;

      // Check if name changed and if new name already exists
      if (name && name.trim() !== tag.name) {
        const existingTag = await collection.findOne({ name: name.trim() });
        if (existingTag) {
          throw new BadRequestException('Tag with this name already exists');
        }
      }

      // Validate category
      const validCategories = ['general', 'location', 'event', 'object', 'mood', 'technical', 'custom'];
      const tagCategory = category && validCategories.includes(category) ? category : tag.category;

      // Update tag
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || '';
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
      console.error('Error updating tag:', error);
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
      if (!db) throw new Error('Database connection not established');
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
      console.error('Error deleting tag:', error);
      throw new BadRequestException(
        `Failed to delete tag: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
