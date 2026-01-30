import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException, Logger, InternalServerErrorException, Request } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { SUPPORTED_LANGUAGES } from '../types/multi-lang';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

@Controller('admin/people')
@UseGuards(AdminGuard)
export class PeopleController {
  private readonly logger = new Logger(PeopleController.name);

  /**
   * Get all people with optional search and pagination
   * Path: GET /api/admin/people
   */
  @Get()
  async getPeople(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
  ) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('people');

      // Build query
      const query: any = {};

      if (search) {
        const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
        const fields = ['firstName', 'lastName', 'fullName', 'nickname', 'description'];
        query.$or = fields.flatMap((f) =>
          langs.map((code) => ({ [`${f}.${code}`]: { $regex: search, $options: 'i' } })),
        );
      }

      if (isActive !== undefined && isActive !== null) {
        query.isActive = isActive === 'true';
      }

      // Pagination
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '20', 10);
      const skip = (pageNum - 1) * limitNum;

      const [people, total] = await Promise.all([
        collection.find(query).sort({ fullName: 1 }).skip(skip).limit(limitNum).toArray(),
        collection.countDocuments(query),
      ]);

      // Serialize ObjectIds to strings
      const serializedPeople = people.map((person: any) => ({
        ...person,
        _id: person._id.toString(),
        tags: person.tags
          ? person.tags.map((tag: any) => (tag._id ? tag._id.toString() : tag.toString()))
          : [],
        createdBy: person.createdBy ? person.createdBy.toString() : null,
      }));

      return {
        data: serializedPeople,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching people:', error);
      throw new BadRequestException(
        `Failed to fetch people: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a specific person by ID
   * Path: GET /api/admin/people/:id
   */
  @Get(':id')
  async getPerson(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('people');

      const person = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!person) {
        throw new NotFoundException(`Person not found: ${id}`);
      }

      return person;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error fetching person:', error);
      throw new BadRequestException(
        `Failed to fetch person: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a new person
   * Path: POST /api/admin/people
   */
  @Post()
  async createPerson(@Request() req: any, @Body() body: any) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('people');

      // Get user from request (set by AdminGuard)
      const user = req.user;
      if (!user || !user.id) {
        throw new BadRequestException('User not authenticated');
      }

      const { firstName, lastName, nickname, birthDate, description, tags, isActive } = body;

      // Validate required fields
      const anyFirst =
        typeof firstName === 'string'
          ? !!firstName.trim()
          : Object.values((firstName as Record<string, string>) || {}).some((v) => (v || '').trim());
      const anyLast =
        typeof lastName === 'string'
          ? !!lastName.trim()
          : Object.values((lastName as Record<string, string>) || {}).some((v) => (v || '').trim());

      if (!anyFirst || !anyLast) {
        throw new BadRequestException(
          'First name and last name are required in at least one language',
        );
      }

      // Generate fullName from firstName and lastName
      const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
      const fullNamesByLang = langs.reduce((acc, lang) => {
        const first = firstName?.[lang] || '';
        const last = lastName?.[lang] || '';
        if (first || last) {
          acc[lang] = `${first} ${last}`.trim();
        }
        return acc;
      }, {} as Record<string, string>);

      // Convert tag strings to ObjectIds
      // Performance optimization: Use bulk operations instead of N+1 queries
      let tagObjectIds: Types.ObjectId[] = [];
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const tagCollection = db.collection('tags');
        const tagNamesToFind: string[] = [];
        const existingObjectIds: Types.ObjectId[] = [];
        
        // Separate string tags from ObjectIds
        for (const tagName of tags) {
          if (typeof tagName === 'string') {
            tagNamesToFind.push(tagName.trim());
          } else if ((tagName as unknown) instanceof Types.ObjectId) {
            existingObjectIds.push(tagName as Types.ObjectId);
          }
        }
        
        // Bulk find existing tags
        if (tagNamesToFind.length > 0) {
          const existingTags = await tagCollection
            .find({ name: { $in: tagNamesToFind } })
            .toArray();
          
          const foundTagNames = new Set(existingTags.map((t: any) => t.name));
          const tagsToCreate = tagNamesToFind.filter((name) => !foundTagNames.has(name));
          
          // Bulk insert new tags
          if (tagsToCreate.length > 0) {
            const newTags = tagsToCreate.map((name) => ({
              name,
              createdBy: new Types.ObjectId(user.id),
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
            const insertResult = await tagCollection.insertMany(newTags);
            existingTags.push(...Object.values(insertResult.insertedIds).map((id, idx) => ({
              _id: id,
              name: tagsToCreate[idx],
            })));
          }
          
          tagObjectIds.push(...existingTags.map((t: any) => t._id));
        }
        
        tagObjectIds.push(...existingObjectIds);
      }

      // Create person
      const now = new Date();
      const personData = {
        firstName,
        lastName,
        fullName: fullNamesByLang,
        nickname: nickname || {},
        birthDate: birthDate ? new Date(birthDate) : undefined,
        description: description || {},
        tags: tagObjectIds,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: new Types.ObjectId(user.id),
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(personData);
      const person = await collection.findOne({ _id: result.insertedId });

      return person;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error creating person:', error);
      throw new BadRequestException(
        `Failed to create person: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a person
   * Path: PUT /api/admin/people/:id
   */
  @Put(':id')
  async updatePerson(@Request() req: any, @Param('id') id: string, @Body() body: UpdatePersonDto) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('people');

      // Get user from request (set by AdminGuard)
      const user = req.user;
      if (!user || !user.id) {
        throw new BadRequestException('User not authenticated');
      }

      const person = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!person) {
        throw new NotFoundException(`Person not found: ${id}`);
      }

      const { firstName, lastName, nickname, birthDate, description, tags, isActive } = body;

      // Generate fullName if firstName or lastName changed
      let fullName = person.fullName;
      if (firstName || lastName) {
        const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
        const firstObj = typeof firstName === 'object' && firstName ? firstName : null;
        const lastObj = typeof lastName === 'object' && lastName ? lastName : null;
        const personFirst = typeof person.firstName === 'object' && person.firstName ? person.firstName : null;
        const personLast = typeof person.lastName === 'object' && person.lastName ? person.lastName : null;
        fullName = langs.reduce((acc, lang) => {
          const first = (firstObj && (firstObj as Record<string, string>)[lang]) || (personFirst && (personFirst as Record<string, string>)[lang]) || '';
          const last = (lastObj && (lastObj as Record<string, string>)[lang]) || (personLast && (personLast as Record<string, string>)[lang]) || '';
          if (first || last) {
            acc[lang] = `${first} ${last}`.trim();
          }
          return acc;
        }, {} as Record<string, string>);
      }

      // Convert tag strings to ObjectIds
      // Performance optimization: Use bulk operations instead of N+1 queries
      let tagObjectIds: Types.ObjectId[] = [];
      if (tags && Array.isArray(tags) && tags.length > 0) {
        const tagCollection = db.collection('tags');
        const tagNamesToFind: string[] = [];
        const existingObjectIds: Types.ObjectId[] = [];
        
        // Separate string tags from ObjectIds
        for (const tagName of tags) {
          if (typeof tagName === 'string') {
            tagNamesToFind.push(tagName.trim());
          } else if ((tagName as unknown) instanceof Types.ObjectId) {
            existingObjectIds.push(tagName as Types.ObjectId);
          }
        }
        
        // Bulk find existing tags
        if (tagNamesToFind.length > 0) {
          const existingTags = await tagCollection
            .find({ name: { $in: tagNamesToFind } })
            .toArray();
          
          const foundTagNames = new Set(existingTags.map((t: any) => t.name));
          const tagsToCreate = tagNamesToFind.filter((name) => !foundTagNames.has(name));
          
          // Bulk insert new tags
          if (tagsToCreate.length > 0) {
            const newTags = tagsToCreate.map((name) => ({
              name,
              createdBy: new Types.ObjectId(user.id),
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
            const insertResult = await tagCollection.insertMany(newTags);
            existingTags.push(...Object.values(insertResult.insertedIds).map((id, idx) => ({
              _id: id,
              name: tagsToCreate[idx],
            })));
          }
          
          tagObjectIds.push(...existingTags.map((t: any) => t._id));
        }
        
        tagObjectIds.push(...existingObjectIds);
      }

      // Update person
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (fullName) updateData.fullName = fullName;
      if (nickname !== undefined) updateData.nickname = nickname;
      if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
      if (description !== undefined) updateData.description = description;
      if (tags !== undefined) updateData.tags = tagObjectIds;
      if (isActive !== undefined) updateData.isActive = isActive;

      await collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: updateData });
      const updatedPerson = await collection.findOne({ _id: new Types.ObjectId(id) });

      return updatedPerson;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error updating person:', error);
      throw new BadRequestException(
        `Failed to update person: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a person
   * Path: DELETE /api/admin/people/:id
   */
  @Delete(':id')
  async deletePerson(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('people');

      const person = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!person) {
        throw new NotFoundException(`Person not found: ${id}`);
      }

      await collection.deleteOne({ _id: new Types.ObjectId(id) });

      return { success: true, message: 'Person deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error deleting person:', error);
      throw new BadRequestException(
        `Failed to delete person: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
