import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, BadRequestException, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('admin/groups')
@UseGuards(AdminGuard)
export class GroupsController {
  private readonly logger = new Logger(GroupsController.name);
  /**
   * Get all groups
   * Path: GET /api/admin/groups
   */
  @Get()
  async getGroups() {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('groups');

      const groups = await collection.find({}).sort({ alias: 1 }).toArray();

      // Convert ObjectIds to strings
      const serializedGroups = groups.map((group) => ({
        ...group,
        _id: group._id.toString(),
      }));

      return {
        data: serializedGroups,
      };
    } catch (error) {
      this.logger.error('Error fetching groups:', error);
      throw new BadRequestException(
        `Failed to fetch groups: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a specific group by ID
   * Path: GET /api/admin/groups/:id
   */
  @Get(':id')
  async getGroup(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('groups');

      const group = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!group) {
        throw new NotFoundException(`Group not found: ${id}`);
      }

      // Convert ObjectId to string
      return {
        ...group,
        _id: group._id.toString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error fetching group:', error);
      throw new BadRequestException(
        `Failed to fetch group: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a new group
   * Path: POST /api/admin/groups
   */
  @Post()
  async createGroup(@Body() body: CreateGroupDto) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('groups');

      const { alias, name } = body;

      // Validate required fields
      if (!alias || !alias.trim()) {
        throw new BadRequestException('Alias is required');
      }

      // Validate name - must have at least one language
      const nameObj = name || {};
      const hasName = typeof name === 'string' ? !!name.trim() : Object.values(nameObj || {}).some((v: any) => (v || '').trim());
      if (!hasName) {
        throw new BadRequestException('Name is required in at least one language');
      }

      // Normalize alias
      const normalizedAlias = String(alias).trim().toLowerCase();
      if (!normalizedAlias) {
        throw new BadRequestException('Alias cannot be empty');
      }

      // Normalize name object
      const normalizedName: Record<string, string> = {};
      if (typeof name === 'string') {
        normalizedName.en = name.trim();
      } else if (name && typeof name === 'object') {
        Object.keys(name).forEach((key) => {
          if (name[key] && typeof name[key] === 'string') {
            normalizedName[key] = name[key].trim();
          }
        });
      }

      // Check if alias already exists
      const existingGroup = await collection.findOne({ alias: normalizedAlias });
      if (existingGroup) {
        throw new BadRequestException('Group with this alias already exists');
      }

      // Create group
      const now = new Date();
      const groupData = {
        alias: normalizedAlias,
        name: normalizedName,
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(groupData);
      const group = await collection.findOne({ _id: result.insertedId });

      if (!group) {
        throw new BadRequestException('Failed to retrieve created group');
      }

      // Convert ObjectId to string
      return {
        ...group,
        _id: group._id.toString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error creating group:', error);
      throw new BadRequestException(
        `Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a group (alias is immutable, only name can be updated)
   * Path: PUT /api/admin/groups/:id
   */
  @Put(':id')
  async updateGroup(@Param('id') id: string, @Body() body: UpdateGroupDto) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('groups');

      const group = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!group) {
        throw new NotFoundException(`Group not found: ${id}`);
      }

      const { name } = body;

      // Validate name - must have at least one language
      if (!name) {
        throw new BadRequestException('Name is required');
      }

      // Normalize name object
      const normalizedName: Record<string, string> = {};
      if (typeof name === 'string') {
        normalizedName.en = name.trim();
      } else if (name && typeof name === 'object') {
        Object.keys(name).forEach((key) => {
          if (name[key] && typeof name[key] === 'string') {
            normalizedName[key] = name[key].trim();
          }
        });
      }

      // Validate that at least one language has a value
      if (Object.keys(normalizedName).length === 0) {
        throw new BadRequestException('Name is required in at least one language');
      }

      // Update group (alias is immutable)
      const updateData = {
        name: normalizedName,
        updatedAt: new Date(),
      };

      await collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: updateData });
      const updatedGroup = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!updatedGroup) {
        throw new NotFoundException(`Group not found after update: ${id}`);
      }

      // Convert ObjectId to string
      return {
        ...updatedGroup,
        _id: updatedGroup._id.toString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error updating group:', error);
      throw new BadRequestException(
        `Failed to update group: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a group
   * Path: DELETE /api/admin/groups/:id
   */
  @Delete(':id')
  async deleteGroup(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('groups');

      const group = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!group) {
        throw new NotFoundException(`Group not found: ${id}`);
      }

      // Check if group is used by any users
      const usersCollection = db.collection('users');
      const usersWithGroup = await usersCollection.countDocuments({
        groupAliases: group.alias,
      });

      if (usersWithGroup > 0) {
        throw new BadRequestException(
          `Cannot delete group: ${usersWithGroup} user(s) are assigned to this group. Please remove the group from users first.`,
        );
      }

      // Check if group is used by any albums
      const albumsCollection = db.collection('albums');
      const albumsWithGroup = await albumsCollection.countDocuments({
        allowedGroups: group.alias,
      });

      if (albumsWithGroup > 0) {
        throw new BadRequestException(
          `Cannot delete group: ${albumsWithGroup} album(s) reference this group. Please remove the group from albums first.`,
        );
      }

      await collection.deleteOne({ _id: new Types.ObjectId(id) });

      return { success: true, message: 'Group deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error deleting group:', error);
      throw new BadRequestException(
        `Failed to delete group: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
