import { Controller, Get, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Public list of published themes from the `themes` collection (for the site template switcher).
 * Admin-only CRUD remains on {@link ThemesController} at /api/admin/themes.
 */
@Controller('themes')
export class ThemesPublicController {
  private readonly logger = new Logger(ThemesPublicController.name);

  constructor(@InjectConnection() private connection: Connection) {}

  private getCollection() {
    const db = this.connection.db;
    if (!db) throw new InternalServerErrorException('Database connection not established');
    return db.collection('themes');
  }

  private serialize(doc: any) {
    if (!doc) return null;
    return {
      _id: doc._id?.toString(),
      name: doc.name,
      description: typeof doc.description === 'string' ? doc.description : '',
      baseTemplate: doc.baseTemplate,
      isBuiltIn: !!doc.isBuiltIn,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  @Get()
  async listPublished() {
    try {
      const collection = this.getCollection();
      const themes = await collection.find({ isPublished: { $ne: false } }).sort({ createdAt: -1 }).toArray();
      return themes.map((t) => this.serialize(t));
    } catch (error) {
      this.logger.error('Error fetching public themes:', error);
      throw new InternalServerErrorException(
        `Failed to fetch themes: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
