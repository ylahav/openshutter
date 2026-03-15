import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException, Logger, InternalServerErrorException, HttpException, Req } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminOrOwnerGuard } from '../common/guards/admin-or-owner.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { mailService } from '../services/mail.service';
import { getOwnerGroupAlias } from '../utils/owner-groups';
import type { Request } from 'express';

const SALT_ROUNDS = 10;

/** One possible clause in the users list search $or array. */
interface UsersListQueryOrClause {
  username?: { $regex: string; $options: string };
  'name.en'?: { $regex: string; $options: string };
  'name.he'?: { $regex: string; $options: string };
}

/** MongoDB query filter for GET /admin/users list. */
interface UsersListQuery {
  $or?: UsersListQueryOrClause[];
  role?: string;
  blocked?: boolean;
}

/** Fields we persist on user update (no arbitrary keys). */
interface UserUpdatePayload {
  updatedAt: Date;
  name?: Record<string, string>;
  role?: 'admin' | 'owner' | 'guest';
  groupAliases?: string[];
  blocked?: boolean;
  allowedStorageProviders?: string[];
  passwordHash?: string;
  forcePasswordChange?: boolean;
  preferredLanguage?: string;
  storageConfig?: UpdateUserDto['storageConfig'];
}

/** Raw user document from db.collection('users').findOne(). */
interface UserDocumentRaw {
  _id: Types.ObjectId;
  name?: Record<string, string>;
  username?: string;
  role?: string;
  groupAliases?: string[];
  blocked?: boolean;
  passwordHash?: string;
  forcePasswordChange?: boolean;
  preferredLanguage?: string;
  storageConfig?: UpdateUserDto['storageConfig'];
  createdAt?: Date;
  updatedAt?: Date;
  allowedStorageProviders?: string[];
}

/** Generate a secure random password (6 chars: upper, lower, digits). */
function generateSecurePassword(length = 6): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) result += charset[bytes[i]! % charset.length];
  return result;
}

async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plain, salt);
}

@Controller('admin/users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  /**
   * Get all users (admin or owner; owner needs this for album access restriction UI).
   * Path: GET /api/admin/users
   */
  @Get()
  @UseGuards(AdminOrOwnerGuard)
  async getUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('blocked') blocked?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('users');

      // Build query
      const query: UsersListQuery = {};

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

      // Performance: Add pagination to prevent loading all users at once
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '50', 10);
      const skip = (pageNum - 1) * limitNum;

      const [users, total] = await Promise.all([
        collection.find(query).sort({ username: 1 }).skip(skip).limit(limitNum).toArray(),
        collection.countDocuments(query),
      ]);

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
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error fetching users:', error);
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  /**
   * Get a specific user by ID (admin or owner).
   * Path: GET /api/admin/users/:id
   */
  @Get(':id')
  @UseGuards(AdminOrOwnerGuard)
  async getUser(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
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
      if (error instanceof HttpException) throw error;
      this.logger.error('Error fetching user:', error);
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  /**
   * Create a new user (admin only).
   * Path: POST /api/admin/users
   */
  @Post()
  @UseGuards(AdminGuard)
  async createUser(@Req() _req: Request, @Body() body: CreateUserDto) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('users');

      const { name, username, password: passwordFromBody, role, groupAliases, blocked, allowedStorageProviders, preferredLanguage } = body;

      // Validate required fields (password is optional; system will generate if missing)
      if (!name || !username || !role) {
        throw new BadRequestException('Name, username, and role are required');
      }

      // Validate name - must have at least one language
      const nameObj = (name && typeof name === 'object' ? name : {}) as Record<string, unknown>;
      const hasName = typeof name === 'string' ? !!name.trim() : Object.values(nameObj).some((v) => (v != null && String(v).trim() !== ''));
      if (!hasName) {
        throw new BadRequestException('Name is required in at least one language');
      }

      // Normalize name object
      const normalizedName: Record<string, string> = {};
      if (typeof name === 'string') {
        normalizedName.en = name.trim();
      } else if (name && typeof name === 'object') {
        const nameRecord = name as Record<string, unknown>;
        Object.keys(nameRecord).forEach((key) => {
          const val = nameRecord[key];
          if (val != null && typeof val === 'string') {
            normalizedName[key] = val.trim();
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

      // Use provided password or generate a secure one (sent in welcome email)
      const password =
        passwordFromBody && String(passwordFromBody).trim().length >= 6
          ? String(passwordFromBody).trim()
          : generateSecurePassword();
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
        forcePasswordChange: true,
        preferredLanguage: preferredLanguage?.trim() ?? '',
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(userData);
      const user = await collection.findOne({ _id: result.insertedId });

      if (!user) {
        throw new BadRequestException('Failed to retrieve created user');
      }

      // If this is an owner account, ensure a dedicated group exists and is assigned.
      if (role === 'owner') {
        const ownerIdStr = user._id.toString();
        const ownerGroupAlias = getOwnerGroupAlias(ownerIdStr);

        // Upsert group document for this owner
        const groups = db.collection('groups');
        const displayName =
          normalizedName.en ||
          (Object.values(normalizedName).find((v) => v && v.trim()) as string | undefined) ||
          normalizedUsername;
        await groups.updateOne(
          { alias: ownerGroupAlias },
          {
            $setOnInsert: {
              alias: ownerGroupAlias,
              name: { en: displayName },
              createdAt: now,
              updatedAt: now,
            },
          },
          { upsert: true },
        );

        // Ensure user has this group alias
        await collection.updateOne(
          { _id: user._id },
          { $addToSet: { groupAliases: ownerGroupAlias } },
        );
        // Also reflect in in-memory user document for the response
        user.groupAliases = Array.from(
          new Set([...(user.groupAliases || []), ownerGroupAlias]),
        );
      }

      // Send welcome email if configured (fire-and-forget; do not fail user creation).
      // Pass initial password so template can use {{password}} if desired.
      const displayName =
        normalizedName.en ||
        (Object.values(normalizedName).find((v) => v && v.trim()) as string) ||
        normalizedUsername;
      mailService.sendWelcomeEmail(normalizedUsername, displayName, password).catch(() => {});

      // Remove passwordHash and convert ObjectId to string
      const { passwordHash: _, ...rest } = user;
      return {
        ...rest,
        _id: user._id.toString(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error creating user:', error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  /**
   * Update a user
   * Path: PUT /api/admin/users/:id
   */
  @Put(':id')
  @UseGuards(AdminGuard)
  async updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('users');

      const user = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!user) {
        throw new NotFoundException(`User not found: ${id}`);
      }

      const { name, password, role, groupAliases, blocked, allowedStorageProviders, forcePasswordChange, preferredLanguage, storageConfig } = body;

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
      const updateData: UserUpdatePayload = {
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
      if (forcePasswordChange !== undefined) {
        updateData.forcePasswordChange = Boolean(forcePasswordChange);
      }
      if (preferredLanguage !== undefined) {
        updateData.preferredLanguage = preferredLanguage?.trim() ?? '';
      }
      if (storageConfig !== undefined) {
        updateData.storageConfig = storageConfig;
      }

      await collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: updateData });
      const updatedUser = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!updatedUser) {
        throw new NotFoundException(`User not found after update: ${id}`);
      }

      // If this user is (now) an owner, ensure a dedicated group exists and is assigned.
      const userDoc = updatedUser as UserDocumentRaw;
      if (newRole === 'owner') {
        const ownerIdStr = userDoc._id.toString();
        const ownerGroupAlias = getOwnerGroupAlias(ownerIdStr);

        const groups = db.collection('groups');
        const nameObj = userDoc.name || {};
        const currentName =
          userDoc.name?.en ||
          (Object.values(nameObj).find((v) => v != null && String(v).trim() !== '') as string | undefined) ||
          userDoc.username;

        await groups.updateOne(
          { alias: ownerGroupAlias },
          {
            $setOnInsert: {
              alias: ownerGroupAlias,
              name: { en: currentName },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        );

        await collection.updateOne(
          { _id: userDoc._id },
          { $addToSet: { groupAliases: ownerGroupAlias } },
        );
        userDoc.groupAliases = Array.from(
          new Set([...(userDoc.groupAliases || []), ownerGroupAlias]),
        );
      }

      // Remove passwordHash and convert ObjectId to string
      const { passwordHash: _, ...rest } = userDoc;
      return {
        ...rest,
        _id: userDoc._id.toString(),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error updating user:', error);
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  /**
   * Delete a user
   * Path: DELETE /api/admin/users/:id
   */
  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteUser(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
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
      if (error instanceof HttpException) throw error;
      this.logger.error('Error deleting user:', error);
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
