import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException, Logger, InternalServerErrorException, Request } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { SUPPORTED_LANGUAGES } from '../types/multi-lang';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@Controller('admin/locations')
@UseGuards(AdminGuard)
export class LocationsController {
  private readonly logger = new Logger(LocationsController.name);
  /**
   * Get all locations with optional search and filters
   * Path: GET /api/admin/locations
   */
  @Get()
  async getLocations(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('locations');

      // Build query
      const query: any = {};

      if (search) {
        // Performance: Cache language codes to avoid repeated map operations
        const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
        const nameQueries = langs.map((code) => ({ [`name.${code}`]: { $regex: search, $options: 'i' } }));
        const descQueries = langs.map((code) => ({ [`description.${code}`]: { $regex: search, $options: 'i' } }));
        query.$or = [
          { address: { $regex: search, $options: 'i' } },
          { city: { $regex: search, $options: 'i' } },
          { state: { $regex: search, $options: 'i' } },
          { country: { $regex: search, $options: 'i' } },
          ...nameQueries,
          ...descQueries,
        ];
      }

      if (category && category !== 'all') {
        query.category = category;
      }

      // Pagination
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '50', 10);
      const skip = (pageNum - 1) * limitNum;

      const [locations, total] = await Promise.all([
        collection.find(query).sort({ name: 1 }).skip(skip).limit(limitNum).toArray(),
        collection.countDocuments(query),
      ]);

      // Convert ObjectIds to strings for JSON serialization
      const serializedLocations = locations.map((location) => ({
        ...location,
        _id: location._id.toString(),
        createdBy: location.createdBy?.toString() || location.createdBy,
      }));

      return {
        data: serializedLocations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching locations: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Failed to fetch locations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get a specific location by ID
   * Path: GET /api/admin/locations/:id
   */
  @Get(':id')
  async getLocation(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('locations');

      const location = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!location) {
        throw new NotFoundException(`Location not found: ${id}`);
      }

      // Convert ObjectId to string for JSON serialization
      return {
        ...location,
        _id: location._id.toString(),
        createdBy: location.createdBy?.toString() || location.createdBy,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error fetching location: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Failed to fetch location: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a new location
   * Path: POST /api/admin/locations
   */
  @Post()
  async createLocation(@Request() req: any, @Body() body: CreateLocationDto) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('locations');

      // Get user from request (set by AdminGuard)
      const user = req.user;
      if (!user || !user.id) {
        throw new BadRequestException('User not authenticated');
      }

      const {
        name,
        description,
        address,
        city,
        state,
        country,
        postalCode,
        coordinates,
        placeId,
        category,
        isActive,
      } = body;

      this.logger.debug(`Received location create request: ${JSON.stringify({ 
        name: typeof name, 
        description: typeof description, 
        descriptionValue: description,
        descriptionKeys: description && typeof description === 'object' ? Object.keys(description) : 'N/A',
        descriptionValues: description && typeof description === 'object' ? Object.values(description) : 'N/A'
      })}`);

      // Validate required fields - name must have at least one language
      const nameObj = name || {};
      const hasName = typeof name === 'string' ? !!name.trim() : Object.values(nameObj || {}).some((v: any) => (v || '').trim());
      if (!hasName) {
        throw new BadRequestException('Location name is required in at least one language');
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

      // Normalize description object - filter out empty strings after trimming
      const normalizedDescription: Record<string, string> = {};
      if (description !== undefined && description !== null) {
        if (typeof description === 'string') {
          const trimmed = description.trim();
          if (trimmed) {
            normalizedDescription.en = trimmed;
          }
        } else if (typeof description === 'object') {
          Object.keys(description).forEach((key) => {
            const val = description[key];
            if (typeof val === 'string') {
              const trimmed = val.trim();
              // Don't filter out HTML content - even if it's just tags, it's valid content
              if (trimmed) {
                normalizedDescription[key] = trimmed;
              }
            }
          });
        }
      }
      this.logger.debug(`Normalized description: ${JSON.stringify(normalizedDescription)}`);

      // Validate coordinates if provided
      if (coordinates) {
        const lat = parseFloat(coordinates.latitude);
        const lng = parseFloat(coordinates.longitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          throw new BadRequestException('Invalid latitude. Must be between -90 and 90');
        }
        if (isNaN(lng) || lng < -180 || lng > 180) {
          throw new BadRequestException('Invalid longitude. Must be between -180 and 180');
        }
      }

      // Validate category
      const validCategories = ['city', 'landmark', 'venue', 'outdoor', 'indoor', 'travel', 'home', 'work', 'custom'];
      const locationCategory = category && validCategories.includes(category) ? category : 'custom';

      // Check for duplicate location (same name and city/country)
      const nameConditions = Object.keys(normalizedName).map((lang) => ({
        [`name.${lang}`]: normalizedName[lang],
      }));
      if (nameConditions.length > 0) {
        const duplicateQuery: any = {
          $or: nameConditions,
        };
        if (city?.trim()) duplicateQuery.city = city.trim();
        if (country?.trim()) duplicateQuery.country = country.trim();

        const existingLocation = await collection.findOne(duplicateQuery);
        if (existingLocation) {
          throw new BadRequestException('Location with this name and address already exists');
        }
      }

      // Create location
      const now = new Date();
      const locationData: any = {
        name: normalizedName,
        description: Object.keys(normalizedDescription).length > 0 ? normalizedDescription : null,
        address: address?.trim() || undefined,
        city: city?.trim() || undefined,
        state: state?.trim() || undefined,
        country: country?.trim() || undefined,
        postalCode: postalCode?.trim() || undefined,
        coordinates: coordinates
          ? {
              latitude: parseFloat(coordinates.latitude),
              longitude: parseFloat(coordinates.longitude),
            }
          : undefined,
        placeId: placeId?.trim() || undefined,
        category: locationCategory,
        isActive: isActive !== undefined ? isActive : true,
        usageCount: 0,
        createdBy: new Types.ObjectId(user.id),
        createdAt: now,
        updatedAt: now,
      };

      // Remove undefined fields
      Object.keys(locationData).forEach((key) => {
        if (locationData[key] === undefined) {
          delete locationData[key];
        }
      });

      const result = await collection.insertOne(locationData);
      const location = await collection.findOne({ _id: result.insertedId });

      if (!location) {
        throw new BadRequestException('Failed to retrieve created location');
      }

      // Convert ObjectId to string for JSON serialization
      return {
        ...location,
        _id: location._id.toString(),
        createdBy: location.createdBy?.toString() || location.createdBy,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error creating location: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Failed to create location: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update a location
   * Path: PUT /api/admin/locations/:id
   */
  @Put(':id')
  async updateLocation(@Param('id') id: string, @Body() body: UpdateLocationDto) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('locations');

      const location = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!location) {
        throw new NotFoundException(`Location not found: ${id}`);
      }

      const {
        name,
        description,
        address,
        city,
        state,
        country,
        postalCode,
        coordinates,
        placeId,
        category,
        isActive,
      } = body;

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
          throw new BadRequestException('Location name is required in at least one language');
        }
      }

      // Normalize description object if provided - filter out empty strings after trimming
      let normalizedDescription: Record<string, string> | null | undefined = undefined;
      if (description !== undefined) {
        normalizedDescription = {};
        if (typeof description === 'string') {
          const trimmed = description.trim();
          if (trimmed) {
            normalizedDescription.en = trimmed;
          }
        } else if (description && typeof description === 'object') {
          Object.keys(description).forEach((key) => {
            const val = description[key];
            if (typeof val === 'string') {
              const trimmed = val.trim();
              if (trimmed) {
                normalizedDescription![key] = trimmed;
              }
            }
          });
        }
        // Set to null if empty (explicitly provided but empty), undefined means don't update
        if (Object.keys(normalizedDescription).length === 0) {
          normalizedDescription = null;
        }
      }

      // Validate coordinates if provided
      if (coordinates) {
        const lat = parseFloat(coordinates.latitude);
        const lng = parseFloat(coordinates.longitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          throw new BadRequestException('Invalid latitude. Must be between -90 and 90');
        }
        if (isNaN(lng) || lng < -180 || lng > 180) {
          throw new BadRequestException('Invalid longitude. Must be between -180 and 180');
        }
      }

      // Validate category
      const validCategories = ['city', 'landmark', 'venue', 'outdoor', 'indoor', 'travel', 'home', 'work', 'custom'];
      const locationCategory = category && validCategories.includes(category) ? category : location.category;

      // Check for duplicate location if name changed
      if (normalizedName) {
        const nameConditions = Object.keys(normalizedName).map((lang) => ({
          [`name.${lang}`]: normalizedName[lang],
        }));
        if (nameConditions.length > 0) {
          const duplicateQuery: any = {
            _id: { $ne: new Types.ObjectId(id) },
            $or: nameConditions,
          };
          if (city?.trim()) duplicateQuery.city = city.trim();
          if (country?.trim()) duplicateQuery.country = country.trim();

          const existingLocation = await collection.findOne(duplicateQuery);
          if (existingLocation) {
            throw new BadRequestException('Location with this name and address already exists');
          }
        }
      }

      // Update location
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (normalizedName !== undefined) updateData.name = normalizedName;
      if (normalizedDescription !== undefined) {
        updateData.description = normalizedDescription; // Can be object with content or null if explicitly cleared
      }
      if (address !== undefined) updateData.address = address?.trim() || null;
      if (city !== undefined) updateData.city = city?.trim() || null;
      if (state !== undefined) updateData.state = state?.trim() || null;
      if (country !== undefined) updateData.country = country?.trim() || null;
      if (postalCode !== undefined) updateData.postalCode = postalCode?.trim() || null;
      if (coordinates !== undefined) {
        updateData.coordinates = coordinates
          ? {
              latitude: parseFloat(coordinates.latitude),
              longitude: parseFloat(coordinates.longitude),
            }
          : null;
      }
      if (placeId !== undefined) updateData.placeId = placeId?.trim() || null;
      if (category !== undefined) updateData.category = locationCategory;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Remove null values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === null) {
          updateData[key] = null; // Keep null for explicit clearing
        }
      });

      await collection.updateOne({ _id: new Types.ObjectId(id) }, { $set: updateData });
      const updatedLocation = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!updatedLocation) {
        throw new NotFoundException(`Location not found after update: ${id}`);
      }

      // Convert ObjectId to string for JSON serialization
      return {
        ...updatedLocation,
        _id: updatedLocation._id.toString(),
        createdBy: updatedLocation.createdBy?.toString() || updatedLocation.createdBy,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error updating location: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Failed to update location: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a location
   * Path: DELETE /api/admin/locations/:id
   */
  @Delete(':id')
  async deleteLocation(@Param('id') id: string) {
    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) throw new InternalServerErrorException('Database connection not established');
      const collection = db.collection('locations');

      const location = await collection.findOne({ _id: new Types.ObjectId(id) });
      if (!location) {
        throw new NotFoundException(`Location not found: ${id}`);
      }

      await collection.deleteOne({ _id: new Types.ObjectId(id) });

      return { success: true, message: 'Location deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting location: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(
        `Failed to delete location: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
