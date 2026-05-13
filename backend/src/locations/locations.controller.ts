import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Logger,
  InternalServerErrorException,
  Request,
} from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import mongoose, { Types } from 'mongoose';
import { SUPPORTED_LANGUAGES } from '../types/multi-lang';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

/** Nominatim search result (subset). */
type NominatimHit = {
  lat?: string;
  lon?: string;
  display_name?: string;
  boundingbox?: string[];
  address?: Record<string, string>;
};

function areaBoundsFromGoogleGeometry(geom: {
  bounds?: { southwest: { lat: number; lng: number }; northeast: { lat: number; lng: number } };
  viewport?: { southwest: { lat: number; lng: number }; northeast: { lat: number; lng: number } };
}): { south: number; north: number; west: number; east: number } | undefined {
  const box = geom.bounds || geom.viewport;
  if (!box?.southwest || !box?.northeast) return undefined;
  const { southwest: sw, northeast: ne } = box;
  const vals = [sw.lat, ne.lat, sw.lng, ne.lng];
  if (!vals.every((n) => typeof n === 'number' && Number.isFinite(n))) return undefined;
  return {
    south: Math.min(sw.lat, ne.lat),
    north: Math.max(sw.lat, ne.lat),
    west: Math.min(sw.lng, ne.lng),
    east: Math.max(sw.lng, ne.lng),
  };
}

function areaBoundsFromNominatimBbox(hit: NominatimHit): { south: number; north: number; west: number; east: number } | undefined {
  const bb = hit.boundingbox;
  if (!Array.isArray(bb) || bb.length < 4) return undefined;
  const south = parseFloat(bb[0]);
  const north = parseFloat(bb[1]);
  const west = parseFloat(bb[2]);
  const east = parseFloat(bb[3]);
  if (![south, north, west, east].every((n) => Number.isFinite(n))) return undefined;
  if (south < -90 || north > 90 || west < -180 || east > 180) return undefined;
  return { south, north, west, east };
}

function isValidAreaBounds(b: { south: number; north: number; west: number; east: number }): boolean {
  return (
    Number.isFinite(b.south) &&
    Number.isFinite(b.north) &&
    Number.isFinite(b.west) &&
    Number.isFinite(b.east) &&
    b.south >= -90 &&
    b.north <= 90 &&
    b.west >= -180 &&
    b.east <= 180 &&
    b.south < b.north &&
    b.west < b.east
  );
}

@Controller('admin/locations')
@UseGuards(AdminGuard)
export class LocationsController {
  private readonly logger = new Logger(LocationsController.name);
  private readonly nominatimUserAgent = 'OpenShutter/1.0 (admin geocode; contact: admin@localhost)';

  /** Title-case Latin location names for display parity with admin tags. */
  private normalizeLocationNameLatin(raw: string): string {
    const s = raw.trim();
    if (!s) return s;
    if (/[\u0590-\u05FF\u0600-\u06FF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF]/.test(s)) {
      return s;
    }
    return s
      .split(/(\s+)/)
      .map((part) => {
        if (/^\s+$/.test(part) || part === '') return part;
        return part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase();
      })
      .join('');
  }

  private applyNameLatinCasing(name: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(name)) {
      if (typeof v === 'string' && v.trim()) {
        out[k] = this.normalizeLocationNameLatin(v);
      }
    }
    return out;
  }

  private async photoUsageCountByLocationId(
    photosCollection: { aggregate: (p: Record<string, any>[]) => { toArray: () => Promise<any[]> } },
    locationIds: Types.ObjectId[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (locationIds.length === 0) return map;
    try {
      const rows = await photosCollection
        .aggregate([{ $match: { location: { $in: locationIds } } }, { $group: { _id: '$location', count: { $sum: 1 } } }])
        .toArray();
      for (const row of rows) {
        if (row._id) map.set(String(row._id), row.count ?? 0);
      }
    } catch (e) {
      this.logger.error('Location photo usage aggregation failed:', e);
    }
    return map;
  }

  private mergeNominatimAddress(hit: NominatimHit): {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  } {
    const a = hit.address;
    if (!a) return {};
    const line = [a.house_number, a.road].filter(Boolean).join(' ').trim();
    return {
      address: line || undefined,
      city: (a.city || a.town || a.village || a.hamlet || a.municipality) as string | undefined,
      state: (a.state || a.region) as string | undefined,
      country: a.country,
      postalCode: a.postcode,
    };
  }
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

      const photosCollection = db.collection('photos');
      const locIds = locations.map((l: any) => l._id);
      const usageMap = await this.photoUsageCountByLocationId(photosCollection, locIds);

      // Convert ObjectIds to strings; usageCount reflects linked photos (not stale counter field).
      const serializedLocations = locations.map((location: any) => ({
        ...location,
        _id: location._id.toString(),
        createdBy: location.createdBy?.toString() || location.createdBy,
        usageCount: usageMap.get(location._id.toString()) ?? 0,
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
   * Geocode an address (OpenStreetMap Nominatim) or Google Place ID when GOOGLE_MAPS_API_KEY is set.
   * Path: POST /api/admin/locations/geocode
   */
  @Post('geocode')
  async geocode(
    @Body()
    body: {
      query?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
      placeId?: string;
    },
  ) {
    try {
      const googleKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
      const placeId = typeof body.placeId === 'string' ? body.placeId.trim() : '';
      if (placeId && googleKey) {
        const u = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${encodeURIComponent(googleKey)}`;
        const res = await fetch(u, { signal: AbortSignal.timeout(15000) });
        const data = (await res.json()) as {
          status?: string;
          results?: Array<{
            formatted_address?: string;
            geometry?: {
              location?: { lat: number; lng: number };
              bounds?: { southwest: { lat: number; lng: number }; northeast: { lat: number; lng: number } };
              viewport?: { southwest: { lat: number; lng: number }; northeast: { lat: number; lng: number } };
            };
          }>;
        };
        if (data.status === 'OK' && data.results?.[0]) {
          const r = data.results[0];
          const loc = r.geometry?.location;
          const areaBounds = r.geometry ? areaBoundsFromGoogleGeometry(r.geometry) : undefined;
          if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
            return {
              latitude: loc.lat,
              longitude: loc.lng,
              formattedAddress: r.formatted_address,
              areaBounds: areaBounds && isValidAreaBounds(areaBounds) ? areaBounds : undefined,
              source: 'google' as const,
            };
          }
        }
      }

      const parts = [body.address, body.city, body.state, body.postalCode, body.country]
        .map((x) => (typeof x === 'string' ? x.trim() : ''))
        .filter(Boolean);
      const q = (typeof body.query === 'string' ? body.query.trim() : '') || parts.join(', ');
      if (!q) {
        throw new BadRequestException(
          placeId && !googleKey
            ? 'Set GOOGLE_MAPS_API_KEY to resolve a Google Place ID, or fill address fields for OpenStreetMap search.'
            : 'Provide an address (or a free-text query) to geocode.',
        );
      }

      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': this.nominatimUserAgent, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        throw new BadRequestException(`Geocoding service returned HTTP ${res.status}`);
      }
      const list = (await res.json()) as NominatimHit[];
      if (!Array.isArray(list) || list.length === 0) {
        throw new BadRequestException('No results for that address');
      }
      const hit = list[0];
      const lat = parseFloat(String(hit.lat || ''));
      const lon = parseFloat(String(hit.lon || ''));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new BadRequestException('Invalid coordinates in geocoding result');
      }
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new BadRequestException('Coordinates out of range');
      }
      const nb = areaBoundsFromNominatimBbox(hit);
      return {
        latitude: lat,
        longitude: lon,
        displayName: hit.display_name,
        ...this.mergeNominatimAddress(hit),
        areaBounds: nb && isValidAreaBounds(nb) ? nb : undefined,
        source: 'nominatim' as const,
      };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      this.logger.error(`Geocode error: ${e instanceof Error ? e.message : String(e)}`);
      throw new BadRequestException('Geocoding failed');
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
      const photosCollection = db.collection('photos');

      const location = await collection.findOne({ _id: new Types.ObjectId(id) });

      if (!location) {
        throw new NotFoundException(`Location not found: ${id}`);
      }

      const usageMap = await this.photoUsageCountByLocationId(photosCollection, [location._id]);

      // Convert ObjectId to string for JSON serialization
      return {
        ...location,
        _id: location._id.toString(),
        createdBy: location.createdBy?.toString() || location.createdBy,
        usageCount: usageMap.get(location._id.toString()) ?? 0,
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
        locationKind: locationKindRaw,
        areaBounds: areaBoundsRaw,
      } = body;

      const locationKind: 'place' | 'area' = locationKindRaw === 'area' ? 'area' : 'place';

      let normalizedAreaBounds: { south: number; north: number; west: number; east: number } | undefined;
      if (areaBoundsRaw && typeof areaBoundsRaw === 'object' && areaBoundsRaw !== null) {
        const b = {
          south: typeof areaBoundsRaw.south === 'number' ? areaBoundsRaw.south : parseFloat(String(areaBoundsRaw.south)),
          north: typeof areaBoundsRaw.north === 'number' ? areaBoundsRaw.north : parseFloat(String(areaBoundsRaw.north)),
          west: typeof areaBoundsRaw.west === 'number' ? areaBoundsRaw.west : parseFloat(String(areaBoundsRaw.west)),
          east: typeof areaBoundsRaw.east === 'number' ? areaBoundsRaw.east : parseFloat(String(areaBoundsRaw.east)),
        };
        if (isValidAreaBounds(b)) {
          normalizedAreaBounds = b;
        }
      }

      if (locationKind === 'area' && !(city?.trim() || country?.trim())) {
        throw new BadRequestException('Area locations need at least a city or country.');
      }

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

      const nameForStore = this.applyNameLatinCasing(normalizedName);

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

      // Validate coordinates if provided (specific places only)
      if (locationKind === 'place' && coordinates) {
        const lat = typeof coordinates.latitude === 'number' ? coordinates.latitude : parseFloat(String(coordinates.latitude));
        const lng = typeof coordinates.longitude === 'number' ? coordinates.longitude : parseFloat(String(coordinates.longitude));
        if (isNaN(lat) || lat < -90 || lat > 90) {
          throw new BadRequestException('Invalid latitude. Must be between -90 and 90');
        }
        if (isNaN(lng) || lng < -180 || lng > 180) {
          throw new BadRequestException('Invalid longitude. Must be between -180 and 180');
        }
      }

      // Validate category
      const validCategories = ['city', 'colony', 'village', 'kibbutz', 'landmark', 'venue', 'outdoor', 'indoor', 'travel', 'home', 'work', 'custom'];
      const locationCategory = category && validCategories.includes(category) ? category : 'custom';

      // Check for duplicate location (same name and city/country)
      const nameConditions = Object.keys(nameForStore).map((lang) => ({
        [`name.${lang}`]: nameForStore[lang],
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
        locationKind,
        name: nameForStore,
        description: Object.keys(normalizedDescription).length > 0 ? normalizedDescription : null,
        city: city?.trim() || undefined,
        country: country?.trim() || undefined,
        placeId: placeId?.trim() || undefined,
        category: locationCategory,
        isActive: isActive !== undefined ? isActive : true,
        usageCount: 0,
        createdBy: new Types.ObjectId(user.id),
        createdAt: now,
        updatedAt: now,
      };

      if (locationKind === 'area') {
        if (normalizedAreaBounds) {
          locationData.areaBounds = normalizedAreaBounds;
        }
      } else {
        locationData.address = address?.trim() || undefined;
        locationData.state = state?.trim() || undefined;
        locationData.postalCode = postalCode?.trim() || undefined;
        if (coordinates) {
          locationData.coordinates = {
            latitude: typeof coordinates.latitude === 'number' ? coordinates.latitude : parseFloat(String(coordinates.latitude)),
            longitude: typeof coordinates.longitude === 'number' ? coordinates.longitude : parseFloat(String(coordinates.longitude)),
          };
        }
      }

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

      const photosCollection = db.collection('photos');
      const usageMap = await this.photoUsageCountByLocationId(photosCollection, [location._id]);

      // Convert ObjectId to string for JSON serialization
      return {
        ...location,
        _id: location._id.toString(),
        createdBy: location.createdBy?.toString() || location.createdBy,
        usageCount: usageMap.get(location._id.toString()) ?? 0,
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
        locationKind: locationKindBody,
        areaBounds: areaBoundsBody,
      } = body;

      const locAny = location as Record<string, any>;
      const existingKind = locAny.locationKind === 'area' ? 'area' : 'place';
      const nextKind: 'place' | 'area' =
        locationKindBody === 'area' ? 'area' : locationKindBody === 'place' ? 'place' : existingKind;

      const mergedCity =
        (city !== undefined ? (typeof city === 'string' ? city.trim() : '') : String(locAny.city || '').trim()) || '';
      const mergedCountry =
        (country !== undefined ? (typeof country === 'string' ? country.trim() : '') : String(locAny.country || '').trim()) ||
        '';

      if (nextKind === 'area' && !(mergedCity || mergedCountry)) {
        throw new BadRequestException('Area locations need at least a city or country.');
      }
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
        normalizedName = this.applyNameLatinCasing(normalizedName);
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

      // Validate coordinates if provided (specific places only)
      if (nextKind === 'place' && coordinates) {
        const lat = typeof coordinates.latitude === 'number' ? coordinates.latitude : parseFloat(String(coordinates.latitude));
        const lng = typeof coordinates.longitude === 'number' ? coordinates.longitude : parseFloat(String(coordinates.longitude));
        if (isNaN(lat) || lat < -90 || lat > 90) {
          throw new BadRequestException('Invalid latitude. Must be between -90 and 90');
        }
        if (isNaN(lng) || lng < -180 || lng > 180) {
          throw new BadRequestException('Invalid longitude. Must be between -180 and 180');
        }
      }

      // Validate category
      const validCategories = ['city', 'colony', 'village', 'kibbutz', 'landmark', 'venue', 'outdoor', 'indoor', 'travel', 'home', 'work', 'custom'];
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
          if (mergedCity) duplicateQuery.city = mergedCity;
          if (mergedCountry) duplicateQuery.country = mergedCountry;

          const existingLocation = await collection.findOne(duplicateQuery);
          if (existingLocation) {
            throw new BadRequestException('Location with this name and address already exists');
          }
        }
      }

      let normalizedAreaBoundsUpdate: { south: number; north: number; west: number; east: number } | null | undefined = undefined;
      if (areaBoundsBody === null) {
        normalizedAreaBoundsUpdate = null;
      } else if (areaBoundsBody && typeof areaBoundsBody === 'object') {
        const b = {
          south: typeof areaBoundsBody.south === 'number' ? areaBoundsBody.south : parseFloat(String(areaBoundsBody.south)),
          north: typeof areaBoundsBody.north === 'number' ? areaBoundsBody.north : parseFloat(String(areaBoundsBody.north)),
          west: typeof areaBoundsBody.west === 'number' ? areaBoundsBody.west : parseFloat(String(areaBoundsBody.west)),
          east: typeof areaBoundsBody.east === 'number' ? areaBoundsBody.east : parseFloat(String(areaBoundsBody.east)),
        };
        if (isValidAreaBounds(b)) {
          normalizedAreaBoundsUpdate = b;
        }
      }

      // Update location
      const updateData: any = {
        updatedAt: new Date(),
        locationKind: nextKind,
      };

      if (normalizedName !== undefined) updateData.name = normalizedName;
      if (normalizedDescription !== undefined) {
        updateData.description = normalizedDescription; // Can be object with content or null if explicitly cleared
      }
      if (category !== undefined) updateData.category = locationCategory;
      if (isActive !== undefined) updateData.isActive = isActive;

      if (nextKind === 'area') {
        updateData.coordinates = null;
        updateData.address = null;
        updateData.state = null;
        updateData.postalCode = null;
        if (city !== undefined) updateData.city = city?.trim() || null;
        if (country !== undefined) updateData.country = country?.trim() || null;
        if (placeId !== undefined) updateData.placeId = placeId?.trim() || null;
        if (normalizedAreaBoundsUpdate !== undefined) {
          updateData.areaBounds = normalizedAreaBoundsUpdate;
        }
      } else {
        updateData.areaBounds = null;
        if (address !== undefined) updateData.address = address?.trim() || null;
        if (city !== undefined) updateData.city = city?.trim() || null;
        if (state !== undefined) updateData.state = state?.trim() || null;
        if (country !== undefined) updateData.country = country?.trim() || null;
        if (postalCode !== undefined) updateData.postalCode = postalCode?.trim() || null;
        if (coordinates !== undefined) {
          updateData.coordinates = coordinates
            ? {
                latitude: typeof coordinates.latitude === 'number' ? coordinates.latitude : parseFloat(String(coordinates.latitude)),
                longitude: typeof coordinates.longitude === 'number' ? coordinates.longitude : parseFloat(String(coordinates.longitude)),
              }
            : null;
        }
        if (placeId !== undefined) updateData.placeId = placeId?.trim() || null;
      }

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

      const photosCollection = db.collection('photos');
      const usageMap = await this.photoUsageCountByLocationId(photosCollection, [updatedLocation._id]);

      // Convert ObjectId to string for JSON serialization
      return {
        ...updatedLocation,
        _id: updatedLocation._id.toString(),
        createdBy: updatedLocation.createdBy?.toString() || updatedLocation.createdBy,
        usageCount: usageMap.get(updatedLocation._id.toString()) ?? 0,
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
