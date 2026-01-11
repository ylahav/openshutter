import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { SiteConfigService } from '../services/site-config';
import { StorageConfigService } from '../services/storage/config';
import { IUserDocument } from '../models/User';
import * as bcrypt from 'bcryptjs';

// Initial admin user configuration
const INITIAL_ADMIN_CREDENTIALS = {
  email: 'admin@openshutter.org',
  password: 'admin123!',
  name: 'System Administrator',
  role: 'admin' as const,
};

@Injectable()
export class DatabaseInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseInitService.name);
  private readonly siteConfigService = SiteConfigService.getInstance();
  private readonly storageConfigService = StorageConfigService.getInstance();

  constructor(
    @InjectModel('User') private userModel: Model<IUserDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('🚀 DatabaseInitService: Starting database initialization...');
    
    // Add a small delay to ensure all modules are fully initialized
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for database connection to be ready
    if (this.connection.readyState !== 1) {
      this.logger.log('⏳ Waiting for database connection...');
      try {
        await new Promise<void>((resolve, reject) => {
          if (this.connection.readyState === 1) {
            resolve();
            return;
          }
          
          const timeout = setTimeout(() => {
            reject(new Error('Database connection timeout after 10 seconds'));
          }, 10000);
          
          this.connection.once('connected', () => {
            clearTimeout(timeout);
            resolve();
          });
          
          this.connection.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
      } catch (error) {
        this.logger.error(`❌ Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        this.logger.error('⚠️  Database initialization will be skipped. Please check MongoDB connection and restart.');
        return;
      }
    }
    
    this.logger.log(`✅ Database connection ready (state: ${this.connection.readyState})`);
    this.logger.log('📝 Starting database initialization...');
    
    try {
      // Initialize in sequence to avoid race conditions
      await this.initializeDefaultAdmin();
      await this.initializeDefaultSiteConfig();
      await this.initializeDefaultStorageConfigs();
      
      this.logger.log('✅ Database initialization completed successfully');
    } catch (error) {
      this.logger.error(`❌ Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      // Don't throw - allow app to start even if initialization fails
      // The app can still function, and initialization can be retried
      this.logger.warn('⚠️  Application will continue, but some features may not work until initialization succeeds.');
    }
  }

  /**
   * Initialize default admin user if no admin exists
   * Made public for manual initialization endpoint
   */
  async initializeDefaultAdmin(): Promise<void> {
    try {
      this.logger.log('Checking for existing admin user...');
      const existingAdmin = await this.userModel.findOne({ role: 'admin' });
      
      if (existingAdmin) {
        this.logger.log(`Admin user already exists (${existingAdmin.username}), skipping creation`);
        return;
      }

      this.logger.log('No admin user found, creating default admin user...');
      
      // Use the same password hashing method as auth.service for consistency
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(INITIAL_ADMIN_CREDENTIALS.password, salt);
      const now = new Date();
      
      const newUser = await this.userModel.create({
        name: { en: INITIAL_ADMIN_CREDENTIALS.name },
        username: INITIAL_ADMIN_CREDENTIALS.email,
        passwordHash,
        role: 'admin',
        groupAliases: [],
        blocked: false,
        allowedStorageProviders: [],
        createdAt: now,
        updatedAt: now,
      });

      this.logger.log(`✅ Default admin user created successfully`);
      this.logger.log(`   Email: ${INITIAL_ADMIN_CREDENTIALS.email}`);
      this.logger.log(`   User ID: ${newUser._id}`);
      this.logger.warn(`⚠️  IMPORTANT: Change the default admin password after first login!`);
    } catch (error) {
      this.logger.error(`Failed to initialize default admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Initialize default site configuration
   * Made public for manual initialization endpoint
   */
  async initializeDefaultSiteConfig(): Promise<void> {
    try {
      this.logger.log('Initializing site configuration...');
      const config = await this.siteConfigService.initializeDefaultConfig();
      this.logger.log(`✅ Default site configuration initialized (ID: ${config._id || 'N/A'})`);
    } catch (error) {
      this.logger.error(`Failed to initialize site config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      throw error;
    }
  }

  /**
   * Initialize default storage configurations
   * Made public for manual initialization endpoint
   */
  async initializeDefaultStorageConfigs(): Promise<void> {
    try {
      this.logger.log('Initializing storage configurations...');
      await this.storageConfigService.initializeDefaultConfigs();
      this.logger.log('✅ Default storage configurations initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize storage configs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      throw error;
    }
  }
}
