import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException, Logger, InternalServerErrorException, HttpException, Request } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { SUPPORTED_LANGUAGES } from '../types/multi-lang';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

/** When the person has no profile image, admin UI can show a crop from a tagged / matched photo. */
export interface FaceAvatarFromPhoto {
  imageUrl: string;
  box?: { x: number; y: number; width: number; height: number };
  sourceWidth: number;
  sourceHeight: number;
  rotation?: number;
}

@Controller('admin/people')
@UseGuards(AdminGuard)
export class PeopleController {
  private readonly logger = new Logger(PeopleController.name);

  /** Safe ObjectId hex from a people.tags element (ObjectId, ref shape, or string). */
  private personTagRefToIdString(tid: any): string {
    if (tid == null) return '';
    try {
      const raw = tid._id != null ? tid._id : tid;
      if (raw == null) return '';
      if (typeof raw === 'string') return raw.trim();
      if (typeof raw.toString === 'function') return String(raw.toString()).trim();
    } catch {
      return '';
    }
    return '';
  }

  /** $set stage: normalize `people` to an array for $unwind (scalar ObjectId supported). */
  private peopleArrayNormSetStage(): { $set: Record<string, any> } {
    return {
      $set: {
        _peopleNorm: {
          $cond: {
            if: { $isArray: '$people' },
            then: '$people',
            else: {
              $cond: {
                if: { $in: [{ $type: '$people' }, ['missing', 'null']] },
                then: [],
                else: ['$people'],
              },
            },
          },
        },
      },
    };
  }

  private photoPrimaryUrl(doc: any): string {
    const u = doc?.storage?.url;
    if (typeof u === 'string' && u.trim()) return u.trim();
    const t = doc?.storage?.thumbnailPath;
    if (typeof t === 'string' && t.trim()) return t.trim();
    return '';
  }

  private faceAvatarFromPhotoDoc(
    doc: any,
    face: { box?: { x: number; y: number; width: number; height: number } } | null,
  ): FaceAvatarFromPhoto | null {
    const imageUrl = this.photoPrimaryUrl(doc);
    if (!imageUrl) return null;
    const dw = Math.max(0, Math.floor(Number(doc?.dimensions?.width) || 0));
    const dh = Math.max(0, Math.floor(Number(doc?.dimensions?.height) || 0));
    const rotation = typeof doc?.rotation === 'number' ? doc.rotation : undefined;
    const box = face?.box;
    if (
      box &&
      dw > 0 &&
      dh > 0 &&
      Number.isFinite(box.x) &&
      Number.isFinite(box.y) &&
      box.width > 0 &&
      box.height > 0
    ) {
      return {
        imageUrl,
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        sourceWidth: dw,
        sourceHeight: dh,
        rotation,
      };
    }
    return { imageUrl, sourceWidth: dw > 0 ? dw : 1, sourceHeight: dh > 0 ? dh : 1, rotation };
  }

  /**
   * One photo-derived avatar per person: prefer a face matched to this person, else most recent photo
   * that lists them in `people`.
   */
  private async buildFaceAvatarFromPhotoMap(
    photosCollection: { aggregate: (pipeline: Record<string, any>[]) => { toArray: () => Promise<any[]> } },
    personIdBsons: Types.ObjectId[],
  ): Promise<Map<string, FaceAvatarFromPhoto>> {
    const map = new Map<string, FaceAvatarFromPhoto>();
    if (personIdBsons.length === 0) return map;

    const facesMatchedPipeline: Record<string, any>[] = [
      { $match: { 'faceRecognition.faces.matchedPersonId': { $in: personIdBsons } } },
      { $unwind: '$faceRecognition.faces' },
      { $match: { 'faceRecognition.faces.matchedPersonId': { $in: personIdBsons } } },
      { $sort: { uploadedAt: -1 } },
      {
        $group: {
          _id: '$faceRecognition.faces.matchedPersonId',
          doc: { $first: '$$ROOT' },
          face: { $first: '$faceRecognition.faces' },
        },
      },
    ];
    try {
      const rows = await photosCollection.aggregate(facesMatchedPipeline).toArray();
      for (const row of rows) {
        const pid = row._id != null ? String(row._id) : '';
        if (!pid) continue;
        const av = this.faceAvatarFromPhotoDoc(row.doc, row.face);
        if (av) map.set(pid, av);
      }
    } catch (e) {
      this.logger.error('Face avatar (matched faces) aggregation failed:', e);
    }

    const stillNeed = personIdBsons.filter((id) => !map.has(id.toString()));
    if (stillNeed.length === 0) return map;

    const peopleRefPipeline: Record<string, any>[] = [
      { $match: { people: { $in: stillNeed } } },
      this.peopleArrayNormSetStage(),
      { $unwind: { path: '$_peopleNorm' } },
      { $match: { _peopleNorm: { $in: stillNeed } } },
      { $sort: { uploadedAt: -1 } },
      { $group: { _id: '$_peopleNorm', doc: { $first: '$$ROOT' } } },
    ];
    try {
      const rows2 = await photosCollection.aggregate(peopleRefPipeline).toArray();
      for (const row of rows2) {
        const pid = row._id != null ? String(row._id) : '';
        if (!pid || map.has(pid)) continue;
        const av = this.faceAvatarFromPhotoDoc(row.doc, null);
        if (av) map.set(pid, av);
      }
    } catch (e) {
      this.logger.error('Face avatar (people refs) aggregation failed:', e);
    }

    return map;
  }

  private tagDocumentDisplayName(tagDoc: { name?: unknown }): string {
    const n = tagDoc?.name;
    if (typeof n === 'string') return n.trim();
    if (n && typeof n === 'object') {
      const o = n as Record<string, string>;
      const v =
        (o.en || o.he || Object.values(o).find((x) => typeof x === 'string' && String(x).trim())) ?? '';
      return String(v).trim();
    }
    return '';
  }

  /** Serialize one person document for admin API: string ids, resolved tag labels, photo count. */
  private mapPersonForAdminResponse(
    person: Record<string, any>,
    tagLabelById: Map<string, string>,
    photoCount: number,
    faceAvatarFromPhoto?: FaceAvatarFromPhoto | null,
  ): Record<string, any> {
    const pid = person._id.toString();
    const tagsResolved = Array.isArray(person.tags)
      ? person.tags
          .map((tid: any) => {
            const tidStr = this.personTagRefToIdString(tid);
            if (!tidStr || !Types.ObjectId.isValid(tidStr)) return null;
            const name = (tagLabelById.get(tidStr) ?? '').trim();
            return { _id: tidStr, name };
          })
          .filter((x): x is { _id: string; name: string } => x != null)
      : [];

    const profUrl =
      person.profileImage && typeof person.profileImage.url === 'string'
        ? person.profileImage.url.trim()
        : '';

    const out: Record<string, any> = {
      ...person,
      _id: pid,
      tags: tagsResolved,
      photoCount,
      createdBy: person.createdBy ? person.createdBy.toString() : null,
    };

    if (!profUrl && faceAvatarFromPhoto?.imageUrl) {
      out.faceAvatarFromPhoto = faceAvatarFromPhoto;
    }

    return out;
  }

  private async enrichSinglePersonForAdmin(db: NonNullable<typeof mongoose.connection.db>, person: Record<string, any>) {
    const tagCollection = db.collection('tags');
    const photosCollection = db.collection('photos');

    const oidList: Types.ObjectId[] = [];
    if (Array.isArray(person.tags)) {
      for (const tid of person.tags) {
        const idStr = this.personTagRefToIdString(tid);
        if (idStr && Types.ObjectId.isValid(idStr)) {
          oidList.push(new Types.ObjectId(idStr));
        }
      }
    }

    const tagLabelById = new Map<string, string>();
    if (oidList.length > 0) {
      const tagDocs = await tagCollection.find({ _id: { $in: oidList } }).project({ name: 1 }).toArray();
      for (const td of tagDocs) {
        tagLabelById.set(td._id.toString(), this.tagDocumentDisplayName(td));
      }
    }

    const photoCount = await photosCollection.countDocuments({ people: person._id });
    const avatarMap = await this.buildFaceAvatarFromPhotoMap(photosCollection, [person._id]);
    const faceAv = avatarMap.get(person._id.toString()) ?? null;
    return this.mapPersonForAdminResponse(person, tagLabelById, photoCount, faceAv);
  }

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

      const tagCollection = db.collection('tags');
      const photosCollection = db.collection('photos');

      const allTagIds = new Set<string>();
      for (const person of people) {
        if (!Array.isArray(person.tags)) continue;
        for (const tid of person.tags) {
          const idStr = this.personTagRefToIdString(tid);
          if (idStr && Types.ObjectId.isValid(idStr)) {
            allTagIds.add(idStr);
          }
        }
      }

      const tagOidList = [...allTagIds].map((id) => new Types.ObjectId(id));
      const tagDocs =
        tagOidList.length > 0
          ? await tagCollection.find({ _id: { $in: tagOidList } }).project({ name: 1 }).toArray()
          : [];

      const tagLabelById = new Map<string, string>();
      for (const td of tagDocs) {
        tagLabelById.set(td._id.toString(), this.tagDocumentDisplayName(td));
      }

      const personIdBsons = people.map((p: any) => p._id);
      const photoCountPipeline: Record<string, any>[] = [
        { $match: { people: { $in: personIdBsons } } },
        this.peopleArrayNormSetStage(),
        { $unwind: { path: '$_peopleNorm' } },
        { $match: { _peopleNorm: { $in: personIdBsons } } },
        { $group: { _id: '$_peopleNorm', count: { $sum: 1 } } },
      ];
      let photoCountRows: { _id?: unknown; count?: number }[] = [];
      if (personIdBsons.length > 0) {
        try {
          photoCountRows = await photosCollection.aggregate(photoCountPipeline).toArray();
        } catch (aggErr) {
          this.logger.error('Photo count aggregation failed:', aggErr);
          photoCountRows = [];
        }
      }

      const photoCountByPersonId = new Map<string, number>();
      for (const row of photoCountRows) {
        if (row._id) {
          photoCountByPersonId.set(row._id.toString(), row.count ?? 0);
        }
      }

      const faceAvatarMap =
        personIdBsons.length > 0
          ? await this.buildFaceAvatarFromPhotoMap(photosCollection, personIdBsons)
          : new Map<string, FaceAvatarFromPhoto>();

      const serializedPeople = people.map((person: any) =>
        this.mapPersonForAdminResponse(
          person,
          tagLabelById,
          photoCountByPersonId.get(person._id.toString()) ?? 0,
          faceAvatarMap.get(person._id.toString()) ?? null,
        ),
      );

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
      if (error instanceof HttpException) throw error;
      this.logger.error('Error fetching people:', error);
      throw new InternalServerErrorException('Failed to fetch people');
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

      return this.enrichSinglePersonForAdmin(db, person);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error fetching person:', error);
      throw new InternalServerErrorException('Failed to fetch person');
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
      if (!person) {
        throw new InternalServerErrorException('Failed to load created person');
      }

      return this.enrichSinglePersonForAdmin(db, person);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error creating person:', error);
      throw new InternalServerErrorException('Failed to create person');
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
      if (!updatedPerson) {
        throw new NotFoundException(`Person not found: ${id}`);
      }

      return this.enrichSinglePersonForAdmin(db, updatedPerson);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error updating person:', error);
      throw new InternalServerErrorException('Failed to update person');
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
      if (error instanceof HttpException) throw error;
      this.logger.error('Error deleting person:', error);
      throw new InternalServerErrorException('Failed to delete person');
    }
  }
}
