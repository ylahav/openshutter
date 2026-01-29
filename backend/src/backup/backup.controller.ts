import { Controller, Post, Body, UseGuards, BadRequestException, UseInterceptors, UploadedFile, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';

@Controller('admin/backup')
@UseGuards(AdminGuard)
export class BackupController {
  private readonly logger = new Logger(BackupController.name);
  /**
   * Create database backup
   * Path: POST /api/admin/backup/database
   */
  @Post('database')
  async createDatabaseBackup() {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection not established');

      // Get all collections
      const collections = await db.listCollections().toArray();
      const backup: any = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        collections: {},
      };

      // Export each collection
      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();

        // Convert ObjectId to string for JSON serialization
        const serializedDocuments = documents.map((doc) => ({
          ...doc,
          _id: doc._id.toString(),
        }));

        backup.collections[collectionName] = serializedDocuments;
      }

      return {
        success: true,
        backup,
        message: `Backup created with ${Object.keys(backup.collections).length} collections`,
      };
    } catch (error) {
      this.logger.error(`Database backup error: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Failed to create database backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Restore database from backup
   * Path: POST /api/admin/backup/restore-database
   */
  @Post('restore-database')
  async restoreDatabase(@Body() body: any) {
    try {
      const { backup } = body;

      if (!backup || !backup.collections) {
        throw new BadRequestException('Invalid backup format');
      }

      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database connection not established');

      // Clear existing collections
      const existingCollections = await db.listCollections().toArray();
      for (const collectionInfo of existingCollections) {
        await db.collection(collectionInfo.name).deleteMany({});
      }

      // Restore each collection
      const restoredCollections: string[] = [];
      for (const [collectionName, documents] of Object.entries(backup.collections)) {
        if (Array.isArray(documents)) {
          // Convert string IDs back to ObjectId
          const documentsWithObjectIds = documents.map((doc: any) => ({
            ...doc,
            _id: new Types.ObjectId(doc._id),
          }));

          if (documentsWithObjectIds.length > 0) {
            await db.collection(collectionName).insertMany(documentsWithObjectIds);
            restoredCollections.push(collectionName);
          }
        }
      }

      return {
        success: true,
        message: `Database restored successfully. Restored ${restoredCollections.length} collections: ${restoredCollections.join(', ')}`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Database restore error: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Failed to restore database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create files backup (local storage only)
   * Path: POST /api/admin/backup/files
   * Note: This is a simplified version. Full implementation would require archiver package.
   */
  @Post('files')
  async createFilesBackup() {
    try {
      // For now, return a message that this feature needs additional setup
      // Full implementation would require archiver package and file system access
      return {
        success: false,
        message: 'Files backup requires additional dependencies. Please use manual backup of storage directories.',
      };
    } catch (error) {
      this.logger.error(`Files backup error: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Failed to create files backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Restore files from backup
   * Path: POST /api/admin/backup/restore-files
   */
  @Post('restore-files')
  @UseInterceptors(FileInterceptor('backup'))
  async restoreFiles(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('No backup file provided');
      }

      // This would require additional dependencies like yauzl or adm-zip
      // For now, return a message that this feature needs implementation
      return {
        success: false,
        message: 'File restore functionality requires additional dependencies. Please use manual file extraction.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Files restore error: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Failed to restore files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
