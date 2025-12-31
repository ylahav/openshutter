import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plain, salt);
}

@Controller('admin/users')
@UseGuards(AdminGuard)
export class UsersController {
  /**
   * Get all users
   * Path: GET /api/admin/users
   */
  @Get()
  async getUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('blocked') blocked?: string,
  ) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection not established');
      const collection = db.collection('users');

      // Build query
      const query: any = {};

      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { 'name.en': { $regex: search, $options: 'i' } },
          { 'name.he': { $regex: search, $options: 'i' } },
        ];
      }

      if (role && role !== 'all') {
        query.role = role;
      }

      if (blocked !== undefined && blocked !== null) {
        query.blocked = blocked === 'true';
      }

      const users = await collection.find(query).sort({ username: 1 }).toArray();

      // Convert ObjectIds to strings and remove passwordHash
      const serializedUsers = users.map((user) => {
        const { passwordHash: _, ...rest } = user;
        return {
          ...rest,
          _id: user._id.toString(),
        };
      });

      return {
        data: serializedUsers,
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new BadRequestException(
        `Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a specific user by ID
   * Path: GET /api/admin/users/:id
   */
  @Get(':id')
  async getUser(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection not established');
      const collection = db.collection('users');

      const user = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!user) {
        throw new NotFoundException(`User not found: ${id}`);
      }

      // Remove passwordHash and convert ObjectId to string
      const { passwordHash: _, ...rest } = user;
      return {
        ...rest,
        _id: user._id.toString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching user:', error);
      throw new BadRequestException(
        `Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a new user
   * Path: POST /api/admin/users
   */
  @Post()
  async createUser(@Body() body: any) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection not established');
      const collection = db.collection('users');

      const { name, username, password, role, groupAliases, blocked, allowedStorageProviders } = body;

      // Validate required fields
      if (!name || !username || !password || !role) {
        throw new BadRequestException('Name, username, password, and role are required');
      }

      // Validate name - must have at least one language
      const nameObj = name || {};
      const hasName = typeof name === 'string' ? !!name.trim() : Object.values(nameObj || {}).some((v: any) => (v || '').trim());
      if (!hasName) {
        throw new BadRequestException('Name is required in at least one language');
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

      // Validate username
      const normalizedUsername = String(username).trim().toLowerCase();
      if (!normalizedUsername) {
        throw new BadRequestException('Username is required');
      }

      // Check if username already exists
      const existingUser = await collection.findOne({ username: normalizedUsername });
      if (existingUser) {
        throw new BadRequestException('Username already exists');
      }

      // Validate role
      const validRoles = ['admin', 'owner', 'guest'];
      if (!validRoles.includes(role)) {
        throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Validate password
      if (!password || password.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters long');
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const now = new Date();
      const userData = {
        name: normalizedName,
        username: normalizedUsername,
        passwordHash,
        role,
        groupAliases: Array.isArray(groupAliases) ? groupAliases : [],
        blocked: Boolean(blocked),
        allowedStorageProviders: Array.isArray(allowedStorageProviders) && allowedStorageProviders.length > 0
          ? allowedStorageProviders
          : ['local'],
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(userData);
      const user = await collection.findOne({ _id: result.insertedId });

      if (!user) {
        throw new BadRequestException('Failed to retrieve created user');
      }

      // Remove passwordHash and convert ObjectId to string
      const { passwordHash: _, ...rest } = user;
      return {
        ...rest,
        _id: user._id.toString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creating user:', error);
      throw new BadRequestException(
        `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a user
   * Path: PUT /api/admin/users/:id
   */
  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection not established');
      const collection = db.collection('users');

      const user = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!user) {
        throw new NotFoundException(`User not found: ${id}`);
      }

      const { name, password, role, groupAliases, blocked, allowedStorageProviders } = body;

      // Normalize name object if provided
      let normalizedName: Record<string, string> | undefined;
      if (name !== undefined) {
        normalizedName = {};
        if (typeof name === 'string') {
          normalizedName.en = name.trim();
        } else if (name && typeof name === 'object') {
          Object.keys(name).forEach((key) => {
            if (name[key] && typeof name[key] === 'string') {
              normalizedName![key] = name[key].trim();
            }
          });
        }
        // Validate that at least one language has a value
        if (Object.keys(normalizedName).length === 0) {
          throw new BadRequestException('Name is required in at least one language');
        }
      }

      // Validate role if provided
      if (role !== undefined) {
        const validRoles = ['admin', 'owner', 'guest'];
        if (!validRoles.includes(role)) {
          throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
        }
      }

      // Validate password if provided
      if (password !== undefined && password !== null && password !== '') {
        if (password.length < 6) {
          throw new BadRequestException('Password must be at least 6 characters long');
        }
      }

      // Check if blocking/changing role would leave no active admins
      const newRole = role !== undefined ? role : user.role;
      const newBlocked = blocked !== undefined ? Boolean(blocked) : user.blocked;

      if (newRole !== 'admin' || newBlocked) {
        // Check if there are other active admins
        const otherActiveAdmins = await collection.countDocuments({
          _id: { $ne: new Types.ObjectId(id) },
          role: 'admin',
          blocked: { $ne: true },
        });

        if (otherActiveAdmins === 0) {
          throw new BadRequestException(
            'Cannot block or change role: At least one admin must remain active',
          );
        }
      }

      // Update user
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (normalizedName !== undefined) updateData.name = normalizedName;
      if (role !== undefined) updateData.role = role;
      if (Array.isArray(groupAliases)) updateData.groupAliases = groupAliases;
      if (typeof blocked === 'boolean') updateData.blocked = blocked;
      if (Array.isArray(allowedStorageProviders)) updateData.allowedStorageProviders = allowedStorageProviders;
      if (password !== undefined && password !== null && password !== '') {
        updateData.passwordHash = await hashPassword(password);
      }

      await collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: updateData });
      const updatedUser = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!updatedUser) {
        throw new NotFoundException(`User not found after update: ${id}`);
      }

      // Remove passwordHash and convert ObjectId to string
      const { passwordHash: _, ...rest } = updatedUser;
      return {
        ...rest,
        _id: updatedUser._id.toString(),
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error updating user:', error);
      throw new BadRequestException(
        `Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a user
   * Path: DELETE /api/admin/users/:id
   */
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection not established');
      const collection = db.collection('users');

      const user = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!user) {
        throw new NotFoundException(`User not found: ${id}`);
      }

      // Check if this is the last active admin
      if (user.role === 'admin' && !user.blocked) {
        const otherActiveAdmins = await collection.countDocuments({
          _id: { $ne: new Types.ObjectId(id) },
          role: 'admin',
          blocked: { $ne: true },
        });

        if (otherActiveAdmins === 0) {
          throw new BadRequestException('Cannot delete the last active admin');
        }
      }

      await collection.deleteOne({ _id: new Types.ObjectId(id) });

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error deleting user:', error);
      throw new BadRequestException(
        `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
