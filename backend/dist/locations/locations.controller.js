"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationsController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const db_1 = require("../config/db");
const mongoose_1 = __importStar(require("mongoose"));
const multi_lang_1 = require("../types/multi-lang");
let LocationsController = class LocationsController {
    /**
     * Get all locations with optional search and filters
     * Path: GET /api/admin/locations
     */
    getLocations(search, category, page, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('locations');
                // Build query
                const query = {};
                if (search) {
                    const langs = multi_lang_1.SUPPORTED_LANGUAGES.map((l) => l.code);
                    query.$or = [
                        { address: { $regex: search, $options: 'i' } },
                        { city: { $regex: search, $options: 'i' } },
                        { state: { $regex: search, $options: 'i' } },
                        { country: { $regex: search, $options: 'i' } },
                        ...langs.map((code) => ({ [`name.${code}`]: { $regex: search, $options: 'i' } })),
                        ...langs.map((code) => ({ [`description.${code}`]: { $regex: search, $options: 'i' } })),
                    ];
                }
                if (category && category !== 'all') {
                    query.category = category;
                }
                // Pagination
                const pageNum = parseInt(page || '1', 10);
                const limitNum = parseInt(limit || '50', 10);
                const skip = (pageNum - 1) * limitNum;
                const [locations, total] = yield Promise.all([
                    collection.find(query).sort({ name: 1 }).skip(skip).limit(limitNum).toArray(),
                    collection.countDocuments(query),
                ]);
                // Convert ObjectIds to strings for JSON serialization
                const serializedLocations = locations.map((location) => {
                    var _a;
                    return (Object.assign(Object.assign({}, location), { _id: location._id.toString(), createdBy: ((_a = location.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || location.createdBy }));
                });
                return {
                    data: serializedLocations,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total,
                        totalPages: Math.ceil(total / limitNum),
                    },
                };
            }
            catch (error) {
                console.error('Error fetching locations:', error);
                throw new common_1.BadRequestException(`Failed to fetch locations: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Get a specific location by ID
     * Path: GET /api/admin/locations/:id
     */
    getLocation(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('locations');
                const location = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!location) {
                    throw new common_1.NotFoundException(`Location not found: ${id}`);
                }
                // Convert ObjectId to string for JSON serialization
                return Object.assign(Object.assign({}, location), { _id: location._id.toString(), createdBy: ((_a = location.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || location.createdBy });
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Error fetching location:', error);
                throw new common_1.BadRequestException(`Failed to fetch location: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Create a new location
     * Path: POST /api/admin/locations
     */
    createLocation(body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('locations');
                const { name, description, address, city, state, country, postalCode, coordinates, placeId, category, isActive, } = body;
                console.log('Received location create request:', {
                    name: typeof name,
                    description: typeof description,
                    descriptionValue: description,
                    descriptionKeys: description && typeof description === 'object' ? Object.keys(description) : 'N/A',
                    descriptionValues: description && typeof description === 'object' ? Object.values(description) : 'N/A'
                });
                // Validate required fields - name must have at least one language
                const nameObj = name || {};
                const hasName = typeof name === 'string' ? !!name.trim() : Object.values(nameObj || {}).some((v) => (v || '').trim());
                if (!hasName) {
                    throw new common_1.BadRequestException('Location name is required in at least one language');
                }
                // Normalize name object
                const normalizedName = {};
                if (typeof name === 'string') {
                    normalizedName.en = name.trim();
                }
                else if (name && typeof name === 'object') {
                    Object.keys(name).forEach((key) => {
                        if (name[key] && typeof name[key] === 'string') {
                            normalizedName[key] = name[key].trim();
                        }
                    });
                }
                // Normalize description object - filter out empty strings after trimming
                const normalizedDescription = {};
                if (description !== undefined && description !== null) {
                    if (typeof description === 'string') {
                        const trimmed = description.trim();
                        if (trimmed) {
                            normalizedDescription.en = trimmed;
                        }
                    }
                    else if (typeof description === 'object') {
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
                console.log('Normalized description:', normalizedDescription);
                // Validate coordinates if provided
                if (coordinates) {
                    const lat = parseFloat(coordinates.latitude);
                    const lng = parseFloat(coordinates.longitude);
                    if (isNaN(lat) || lat < -90 || lat > 90) {
                        throw new common_1.BadRequestException('Invalid latitude. Must be between -90 and 90');
                    }
                    if (isNaN(lng) || lng < -180 || lng > 180) {
                        throw new common_1.BadRequestException('Invalid longitude. Must be between -180 and 180');
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
                    const duplicateQuery = {
                        $or: nameConditions,
                    };
                    if (city === null || city === void 0 ? void 0 : city.trim())
                        duplicateQuery.city = city.trim();
                    if (country === null || country === void 0 ? void 0 : country.trim())
                        duplicateQuery.country = country.trim();
                    const existingLocation = yield collection.findOne(duplicateQuery);
                    if (existingLocation) {
                        throw new common_1.BadRequestException('Location with this name and address already exists');
                    }
                }
                // Create location
                const now = new Date();
                const locationData = {
                    name: normalizedName,
                    description: Object.keys(normalizedDescription).length > 0 ? normalizedDescription : null,
                    address: (address === null || address === void 0 ? void 0 : address.trim()) || undefined,
                    city: (city === null || city === void 0 ? void 0 : city.trim()) || undefined,
                    state: (state === null || state === void 0 ? void 0 : state.trim()) || undefined,
                    country: (country === null || country === void 0 ? void 0 : country.trim()) || undefined,
                    postalCode: (postalCode === null || postalCode === void 0 ? void 0 : postalCode.trim()) || undefined,
                    coordinates: coordinates
                        ? {
                            latitude: parseFloat(coordinates.latitude),
                            longitude: parseFloat(coordinates.longitude),
                        }
                        : undefined,
                    placeId: (placeId === null || placeId === void 0 ? void 0 : placeId.trim()) || undefined,
                    category: locationCategory,
                    isActive: isActive !== undefined ? isActive : true,
                    usageCount: 0,
                    createdBy: new mongoose_1.Types.ObjectId(), // TODO: Get from auth context
                    createdAt: now,
                    updatedAt: now,
                };
                // Remove undefined fields
                Object.keys(locationData).forEach((key) => {
                    if (locationData[key] === undefined) {
                        delete locationData[key];
                    }
                });
                const result = yield collection.insertOne(locationData);
                const location = yield collection.findOne({ _id: result.insertedId });
                if (!location) {
                    throw new common_1.BadRequestException('Failed to retrieve created location');
                }
                // Convert ObjectId to string for JSON serialization
                return Object.assign(Object.assign({}, location), { _id: location._id.toString(), createdBy: ((_a = location.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || location.createdBy });
            }
            catch (error) {
                if (error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error creating location:', error);
                throw new common_1.BadRequestException(`Failed to create location: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Update a location
     * Path: PUT /api/admin/locations/:id
     */
    updateLocation(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('locations');
                const location = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!location) {
                    throw new common_1.NotFoundException(`Location not found: ${id}`);
                }
                const { name, description, address, city, state, country, postalCode, coordinates, placeId, category, isActive, } = body;
                // Normalize name object if provided
                let normalizedName;
                if (name !== undefined) {
                    normalizedName = {};
                    if (typeof name === 'string') {
                        normalizedName.en = name.trim();
                    }
                    else if (name && typeof name === 'object') {
                        Object.keys(name).forEach((key) => {
                            if (name[key] && typeof name[key] === 'string') {
                                normalizedName[key] = name[key].trim();
                            }
                        });
                    }
                    // Validate that at least one language has a value
                    if (Object.keys(normalizedName).length === 0) {
                        throw new common_1.BadRequestException('Location name is required in at least one language');
                    }
                }
                // Normalize description object if provided - filter out empty strings after trimming
                let normalizedDescription = undefined;
                if (description !== undefined) {
                    normalizedDescription = {};
                    if (typeof description === 'string') {
                        const trimmed = description.trim();
                        if (trimmed) {
                            normalizedDescription.en = trimmed;
                        }
                    }
                    else if (description && typeof description === 'object') {
                        Object.keys(description).forEach((key) => {
                            const val = description[key];
                            if (typeof val === 'string') {
                                const trimmed = val.trim();
                                if (trimmed) {
                                    normalizedDescription[key] = trimmed;
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
                        throw new common_1.BadRequestException('Invalid latitude. Must be between -90 and 90');
                    }
                    if (isNaN(lng) || lng < -180 || lng > 180) {
                        throw new common_1.BadRequestException('Invalid longitude. Must be between -180 and 180');
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
                        const duplicateQuery = {
                            _id: { $ne: new mongoose_1.Types.ObjectId(id) },
                            $or: nameConditions,
                        };
                        if (city === null || city === void 0 ? void 0 : city.trim())
                            duplicateQuery.city = city.trim();
                        if (country === null || country === void 0 ? void 0 : country.trim())
                            duplicateQuery.country = country.trim();
                        const existingLocation = yield collection.findOne(duplicateQuery);
                        if (existingLocation) {
                            throw new common_1.BadRequestException('Location with this name and address already exists');
                        }
                    }
                }
                // Update location
                const updateData = {
                    updatedAt: new Date(),
                };
                if (normalizedName !== undefined)
                    updateData.name = normalizedName;
                if (normalizedDescription !== undefined) {
                    updateData.description = normalizedDescription; // Can be object with content or null if explicitly cleared
                }
                if (address !== undefined)
                    updateData.address = (address === null || address === void 0 ? void 0 : address.trim()) || null;
                if (city !== undefined)
                    updateData.city = (city === null || city === void 0 ? void 0 : city.trim()) || null;
                if (state !== undefined)
                    updateData.state = (state === null || state === void 0 ? void 0 : state.trim()) || null;
                if (country !== undefined)
                    updateData.country = (country === null || country === void 0 ? void 0 : country.trim()) || null;
                if (postalCode !== undefined)
                    updateData.postalCode = (postalCode === null || postalCode === void 0 ? void 0 : postalCode.trim()) || null;
                if (coordinates !== undefined) {
                    updateData.coordinates = coordinates
                        ? {
                            latitude: parseFloat(coordinates.latitude),
                            longitude: parseFloat(coordinates.longitude),
                        }
                        : null;
                }
                if (placeId !== undefined)
                    updateData.placeId = (placeId === null || placeId === void 0 ? void 0 : placeId.trim()) || null;
                if (category !== undefined)
                    updateData.category = locationCategory;
                if (isActive !== undefined)
                    updateData.isActive = isActive;
                // Remove null values
                Object.keys(updateData).forEach((key) => {
                    if (updateData[key] === null) {
                        updateData[key] = null; // Keep null for explicit clearing
                    }
                });
                yield collection.updateOne({ _id: new mongoose_1.Types.ObjectId(id) }, { $set: updateData });
                const updatedLocation = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!updatedLocation) {
                    throw new common_1.NotFoundException(`Location not found after update: ${id}`);
                }
                // Convert ObjectId to string for JSON serialization
                return Object.assign(Object.assign({}, updatedLocation), { _id: updatedLocation._id.toString(), createdBy: ((_a = updatedLocation.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || updatedLocation.createdBy });
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error updating location:', error);
                throw new common_1.BadRequestException(`Failed to update location: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Delete a location
     * Path: DELETE /api/admin/locations/:id
     */
    deleteLocation(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('locations');
                const location = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!location) {
                    throw new common_1.NotFoundException(`Location not found: ${id}`);
                }
                yield collection.deleteOne({ _id: new mongoose_1.Types.ObjectId(id) });
                return { success: true, message: 'Location deleted successfully' };
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Error deleting location:', error);
                throw new common_1.BadRequestException(`Failed to delete location: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.LocationsController = LocationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "getLocations", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "getLocation", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "createLocation", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "updateLocation", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LocationsController.prototype, "deleteLocation", null);
exports.LocationsController = LocationsController = __decorate([
    (0, common_1.Controller)('admin/locations'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], LocationsController);
