import { Controller, Post, Get, Logger, Inject, Body, BadRequestException, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseInitService } from './database-init.service';
import { IUserDocument } from '../models/User';
import * as bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import mongoose from 'mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import { SiteConfigService } from '../services/site-config';
import { StorageManager } from '../services/storage/manager';
import { v4 as uuidv4 } from 'uuid';

@Controller('init')
export class DatabaseInitController {
  private readonly logger = new Logger(DatabaseInitController.name);

  private readonly siteConfigService = SiteConfigService.getInstance();

  constructor(
    private readonly initService: DatabaseInitService,
    @InjectModel('User') private userModel: Model<IUserDocument>,
  ) {}

  /**
   * Manually trigger database initialization
   * Path: POST /api/init
   * 
   * This endpoint can be called to manually initialize the database
   * if automatic initialization failed or was skipped.
   */
  @Post()
  async initialize() {
    this.logger.log('Manual database initialization requested');
    
    try {
      // Call the initialization methods directly
      await this.initService.initializeDefaultAdmin();
      await this.initService.initializeDefaultSiteConfig();
      await this.initService.initializeDefaultStorageConfigs();
      
      return {
        success: true,
        message: 'Database initialized successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Manual initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check initialization status
   * Path: GET /api/init/status
   */
  @Get('status')
  async getStatus() {
    try {
      const adminUser = await this.userModel.findOne({ role: 'admin' });
      const allUsers = await this.userModel.find({}).limit(5);
      
      return {
        message: 'Database initialization status',
        hasAdmin: !!adminUser,
        adminUsername: adminUser?.username || null,
        adminEmail: adminUser?.username || null,
        adminRole: adminUser?.role || null,
        adminBlocked: adminUser?.blocked || false,
        totalUsers: allUsers.length,
        users: allUsers.map((u: any) => ({
          username: u.username,
          role: u.role,
          hasPassword: !!u.passwordHash,
          blocked: u.blocked,
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if default admin password needs to be changed
   * Path: GET /api/init/check-default-password
   * 
   * Returns true if:
   * - Only one user exists (admin@openshutter.org)
   * - The password is still the default (admin123!)
   * - Site is configured
   */
  @Get('check-default-password')
  async checkDefaultPassword() {
    try {
      const DEFAULT_ADMIN_EMAIL = 'admin@openshutter.org';
      const DEFAULT_ADMIN_PASSWORD = 'admin123!';

      // Check if only one user exists
      const allUsers = await this.userModel.find({});
      const userCount = allUsers.length;
      
      if (userCount !== 1) {
        return {
          showLandingPage: false,
          reason: userCount === 0 ? 'no_users' : 'multiple_users',
          userCount,
        };
      }

      // Check if the single user is the default admin
      const adminUser = allUsers[0];
      if (adminUser.username !== DEFAULT_ADMIN_EMAIL || adminUser.role !== 'admin') {
        return {
          showLandingPage: false,
          reason: 'not_default_admin',
          username: adminUser.username,
          role: adminUser.role,
        };
      }

      // Check if password is still the default
      if (!adminUser.passwordHash) {
        return {
          showLandingPage: false,
          reason: 'no_password',
        };
      }

      const isDefaultPassword = await bcrypt.compare(DEFAULT_ADMIN_PASSWORD, adminUser.passwordHash);
      if (!isDefaultPassword) {
        return {
          showLandingPage: false,
          reason: 'password_changed',
        };
      }

      // Check if site is configured
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) {
        return {
          showLandingPage: false,
          reason: 'database_not_connected',
        };
      }

      const siteConfigCollection = db.collection('site_config');
      const siteConfig = await siteConfigCollection.findOne({});
      const isSiteConfigured = !!siteConfig;

      if (!isSiteConfigured) {
        return {
          showLandingPage: false,
          reason: 'site_not_configured',
        };
      }

      // All conditions met - show landing page
      return {
        showLandingPage: true,
        adminEmail: DEFAULT_ADMIN_EMAIL,
        reason: 'default_password_active',
      };
    } catch (error) {
      this.logger.error(`Check default password failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        showLandingPage: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Complete initial setup: update admin user and site config
   * Path: POST /api/init/setup
   * 
   * This endpoint allows updating the admin user credentials and site configuration
   * during initial setup. It's only accessible when default password is still active.
   */
  @Post('setup')
  @UseInterceptors(FileInterceptor('logo', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  }))
  async initialSetup(
    @Req() request: Request,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    // Get form fields from request body (parsed by multer)
    const body = request.body as {
      username?: string;
      password?: string;
      title?: string;
      description?: string;
    };
    try {
      const DEFAULT_ADMIN_EMAIL = 'admin@openshutter.org';
      const DEFAULT_ADMIN_PASSWORD = 'admin123!';

      // Verify we're in setup mode (only one user with default password)
      const allUsers = await this.userModel.find({});
      if (allUsers.length !== 1) {
        throw new BadRequestException('Setup can only be completed when exactly one admin user exists');
      }

      const adminUser = allUsers[0];
      if (adminUser.username !== DEFAULT_ADMIN_EMAIL || adminUser.role !== 'admin') {
        throw new BadRequestException('Setup can only be completed for the default admin user');
      }

      if (!adminUser.passwordHash) {
        throw new BadRequestException('Admin user has no password');
      }

      const isDefaultPassword = await bcrypt.compare(DEFAULT_ADMIN_PASSWORD, adminUser.passwordHash);
      if (!isDefaultPassword) {
        throw new BadRequestException('Setup can only be completed when default password is still active');
      }

      // Update admin user if credentials provided
      if (body.username || body.password) {
        const updateData: any = { updatedAt: new Date() };

        if (body.username) {
          const normalizedUsername = String(body.username).trim().toLowerCase();
          if (!normalizedUsername) {
            throw new BadRequestException('Username cannot be empty');
          }

          // Check if username already exists (excluding current user)
          const existingUser = await this.userModel.findOne({ 
            username: normalizedUsername,
            _id: { $ne: adminUser._id }
          });
          if (existingUser) {
            throw new BadRequestException('Username already exists');
          }

          updateData.username = normalizedUsername;
        }

        if (body.password) {
          if (body.password.length < 6) {
            throw new BadRequestException('Password must be at least 6 characters long');
          }
          const salt = await bcrypt.genSalt(10);
          updateData.passwordHash = await bcrypt.hash(body.password, salt);
        }

        await this.userModel.updateOne({ _id: adminUser._id }, { $set: updateData });
        this.logger.log('Admin user updated during initial setup');
      }

      // Update site config - title is required
      if (!body.title || !body.title.trim()) {
        throw new BadRequestException('Site title is required');
      }

      const siteConfigUpdates: any = {
        title: typeof body.title === 'string' 
          ? { en: body.title.trim() } 
          : body.title,
      };

      if (body.description) {
        siteConfigUpdates.description = typeof body.description === 'string'
          ? { en: body.description }
          : body.description;
      }

      // Handle logo upload
      if (logoFile) {
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimeTypes.includes(logoFile.mimetype)) {
          throw new BadRequestException(`File type ${logoFile.mimetype} is not allowed. Allowed types: images only`);
        }

        const fileExtension = logoFile.originalname.split('.').pop() || 'png';
        const filename = `logo-${uuidv4()}.${fileExtension}`;
        const filePath = `site-assets/${filename}`;

        const storageManager = StorageManager.getInstance();
        const defaultProvider = (process.env.STORAGE_PROVIDER || 'local') as any;
        const uploadResult = await storageManager.uploadBuffer(
          logoFile.buffer,
          filePath,
          defaultProvider,
          logoFile.mimetype
        );

        siteConfigUpdates.logo = `/api/storage/serve/${uploadResult.provider}/${encodeURIComponent(uploadResult.path)}`;
        this.logger.log('Logo uploaded during initial setup');
      }

      // Update site config if there are any updates
      if (Object.keys(siteConfigUpdates).length > 0) {
        await this.siteConfigService.updateConfig(siteConfigUpdates);
        this.logger.log('Site configuration updated during initial setup');
      }

      return {
        success: true,
        message: 'Initial setup completed successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Initial setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to complete initial setup: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
