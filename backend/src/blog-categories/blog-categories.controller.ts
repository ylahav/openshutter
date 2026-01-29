import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { SUPPORTED_LANGUAGES } from '../types/multi-lang';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';

@Controller('admin/blog-categories')
@UseGuards(AdminGuard)
export class BlogCategoriesController {
  private readonly logger = new Logger(BlogCategoriesController.name);
  /**
   * Get all blog categories with optional filters
   * Path: GET /api/admin/blog-categories
   */
  @Get()
  async getBlogCategories(
    @Query('q') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('blogcategories');

      // Build query
      const query: any = {};

      if (search) {
        const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
        query.$or = [
          { alias: { $regex: search, $options: 'i' } },
          ...langs.map((code) => ({ [`title.${code}`]: { $regex: search, $options: 'i' } })),
          ...langs.map((code) => ({ [`description.${code}`]: { $regex: search, $options: 'i' } })),
        ];
      }

      if (isActive !== undefined && isActive !== null && isActive !== '') {
        query.isActive = isActive === 'true';
      }

      // Pagination
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '10', 10);
      const skip = (pageNum - 1) * limitNum;

      const [categories, total] = await Promise.all([
        collection.find(query).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
        collection.countDocuments(query),
      ]);

      // Convert ObjectIds to strings
      const serializedCategories = categories.map((category) => ({
        ...category,
        _id: category._id.toString(),
      }));

      return {
        data: serializedCategories,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching blog categories:', error);
      throw new BadRequestException(
        `Failed to fetch blog categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a specific blog category by ID
   * Path: GET /api/admin/blog-categories/:id
   */
  @Get(':id')
  async getBlogCategory(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('blogcategories');

      const category = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!category) {
        throw new NotFoundException(`Blog category not found: ${id}`);
      }

      // Convert ObjectId to string
      return {
        ...category,
        _id: category._id.toString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error fetching blog category:', error);
      throw new BadRequestException(
        `Failed to fetch blog category: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a new blog category
   * Path: POST /api/admin/blog-categories
   */
  @Post()
  async createBlogCategory(@Body() body: CreateBlogCategoryDto) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('blogcategories');

      const { title, description, leadingImage, isActive, sortOrder, alias } = body;

      // Validate required fields
      if (!title) {
        throw new BadRequestException('Title is required');
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

      // Validate that at least one language has a value
      if (Object.keys(normalizedTitle).length === 0) {
        throw new BadRequestException('Title is required in at least one language');
      }

      // Generate or use provided alias
      let normalizedAlias: string;
      if (alias && alias.trim()) {
        normalizedAlias = alias.trim().toLowerCase();
      } else {
        // Generate alias from title
        const titleText = normalizedTitle.en || normalizedTitle.he || Object.values(normalizedTitle)[0] || 'untitled';
        normalizedAlias = titleText
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      // Ensure alias is unique
      let uniqueAlias = normalizedAlias;
      let counter = 1;
      while (await collection.findOne({ alias: uniqueAlias })) {
        uniqueAlias = `${normalizedAlias}-${counter}`;
        counter++;
      }

      // Normalize description object if provided
      let normalizedDescription: Record<string, string> | undefined;
      if (description) {
        normalizedDescription = {};
        if (typeof description === 'string') {
          normalizedDescription.en = description.trim();
        } else if (typeof description === 'object') {
          Object.keys(description).forEach((key) => {
            if (description[key] && typeof description[key] === 'string') {
              normalizedDescription![key] = description[key].trim();
            }
          });
        }
        if (Object.keys(normalizedDescription).length === 0) {
          normalizedDescription = undefined;
        }
      }

      // Create blog category
      const now = new Date();
      const categoryData: any = {
        alias: uniqueAlias,
        title: normalizedTitle,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: sortOrder !== undefined ? parseInt(String(sortOrder), 10) : 0,
        createdAt: now,
        updatedAt: now,
      };

      if (normalizedDescription) categoryData.description = normalizedDescription;
      if (leadingImage) categoryData.leadingImage = leadingImage;

      const result = await collection.insertOne(categoryData);
      const category = await collection.findOne({ _id: result.insertedId });

      if (!category) {
        throw new BadRequestException('Failed to retrieve created blog category');
      }

      // Convert ObjectId to string
      return {
        ...category,
        _id: category._id.toString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error creating blog category:', error);
      throw new BadRequestException(
        `Failed to create blog category: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a blog category
   * Path: PUT /api/admin/blog-categories/:id
   */
  @Put(':id')
  async updateBlogCategory(@Param('id') id: string, @Body() body: UpdateBlogCategoryDto) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('blogcategories');

      const category = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!category) {
        throw new NotFoundException(`Blog category not found: ${id}`);
      }

      const { title, description, leadingImage, isActive, sortOrder, alias } = body;

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

      // Normalize description object if provided
      let normalizedDescription: Record<string, string> | undefined;
      if (description !== undefined) {
        if (description) {
          normalizedDescription = {};
          if (typeof description === 'string') {
            normalizedDescription.en = description.trim();
          } else if (typeof description === 'object') {
            Object.keys(description).forEach((key) => {
              if (description[key] && typeof description[key] === 'string') {
                normalizedDescription![key] = description[key].trim();
              }
            });
          }
          if (Object.keys(normalizedDescription).length === 0) {
            normalizedDescription = undefined;
          }
        } else {
          normalizedDescription = undefined;
        }
      }

      // Check if alias changed and if new alias already exists
      if (alias && alias.trim().toLowerCase() !== category.alias) {
        const normalizedAlias = alias.trim().toLowerCase();
        const existingCategory = await collection.findOne({ alias: normalizedAlias });
        if (existingCategory) {
          throw new BadRequestException('Blog category with this alias already exists');
        }
      }

      // Update blog category
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (normalizedTitle !== undefined) updateData.title = normalizedTitle;
      if (normalizedDescription !== undefined) updateData.description = normalizedDescription;
      if (leadingImage !== undefined) updateData.leadingImage = leadingImage || null;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);
      if (sortOrder !== undefined) updateData.sortOrder = parseInt(String(sortOrder), 10);
      if (alias !== undefined) updateData.alias = alias.trim().toLowerCase();

      await collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: updateData });
      const updatedCategory = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!updatedCategory) {
        throw new NotFoundException(`Blog category not found after update: ${id}`);
      }

      // Convert ObjectId to string
      return {
        ...updatedCategory,
        _id: updatedCategory._id.toString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error updating blog category:', error);
      throw new BadRequestException(
        `Failed to update blog category: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a blog category
   * Path: DELETE /api/admin/blog-categories/:id
   */
  @Delete(':id')
  async deleteBlogCategory(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('blogcategories');

      const category = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!category) {
        throw new NotFoundException(`Blog category not found: ${id}`);
      }

      // Check if category is used by any blog articles
      const articlesCollection = db.collection('blogarticles');
      const articlesWithCategory = await articlesCollection.countDocuments({
        category: category.alias,
      });

      if (articlesWithCategory > 0) {
        throw new BadRequestException(
          `Cannot delete category: ${articlesWithCategory} article(s) use this category. Please reassign or delete articles first.`,
        );
      }

      await collection.deleteOne({ _id: new Types.ObjectId(id) });

      return { success: true, message: 'Blog category deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error deleting blog category:', error);
      throw new BadRequestException(
        `Failed to delete blog category: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
