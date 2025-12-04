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
exports.TagsController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const db_1 = require("../config/db");
const mongoose_1 = __importStar(require("mongoose"));
let TagsController = class TagsController {
    /**
     * Get all tags with optional search and category filter
     * Path: GET /api/admin/tags
     */
    getTags(search, category, page, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('tags');
                // Build query
                const query = {};
                if (search) {
                    query.$or = [
                        { name: { $regex: search, $options: 'i' } },
                        { description: { $regex: search, $options: 'i' } },
                    ];
                }
                if (category && category !== 'all') {
                    query.category = category;
                }
                // Pagination
                const pageNum = parseInt(page || '1', 10);
                const limitNum = parseInt(limit || '50', 10);
                const skip = (pageNum - 1) * limitNum;
                const [tags, total] = yield Promise.all([
                    collection.find(query).sort({ name: 1 }).skip(skip).limit(limitNum).toArray(),
                    collection.countDocuments(query),
                ]);
                // Convert ObjectIds to strings for JSON serialization
                const serializedTags = tags.map((tag) => {
                    var _a;
                    return (Object.assign(Object.assign({}, tag), { _id: tag._id.toString(), createdBy: ((_a = tag.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || tag.createdBy }));
                });
                return {
                    data: serializedTags,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total,
                        totalPages: Math.ceil(total / limitNum),
                    },
                };
            }
            catch (error) {
                console.error('Error fetching tags:', error);
                throw new common_1.BadRequestException(`Failed to fetch tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Get a specific tag by ID
     * Path: GET /api/admin/tags/:id
     */
    getTag(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('tags');
                const tag = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!tag) {
                    throw new common_1.NotFoundException(`Tag not found: ${id}`);
                }
                // Convert ObjectId to string for JSON serialization
                return Object.assign(Object.assign({}, tag), { _id: tag._id.toString(), createdBy: ((_a = tag.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || tag.createdBy });
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Error fetching tag:', error);
                throw new common_1.BadRequestException(`Failed to fetch tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Create a new tag
     * Path: POST /api/admin/tags
     */
    createTag(body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('tags');
                const { name, description, color, category } = body;
                // Validate required fields
                if (!name || !name.trim()) {
                    throw new common_1.BadRequestException('Tag name is required');
                }
                // Check if tag already exists
                const existingTag = yield collection.findOne({ name: name.trim() });
                if (existingTag) {
                    throw new common_1.BadRequestException('Tag with this name already exists');
                }
                // Validate category
                const validCategories = ['general', 'location', 'event', 'object', 'mood', 'technical', 'custom'];
                const tagCategory = category && validCategories.includes(category) ? category : 'general';
                // Create tag
                const now = new Date();
                const tagData = {
                    name: name.trim(),
                    description: (description === null || description === void 0 ? void 0 : description.trim()) || '',
                    color: color || '#3B82F6',
                    category: tagCategory,
                    isActive: true,
                    usageCount: 0,
                    createdBy: new mongoose_1.Types.ObjectId(), // TODO: Get from auth context
                    createdAt: now,
                    updatedAt: now,
                };
                const result = yield collection.insertOne(tagData);
                const tag = yield collection.findOne({ _id: result.insertedId });
                if (!tag) {
                    throw new common_1.BadRequestException('Failed to retrieve created tag');
                }
                // Convert ObjectId to string for JSON serialization
                return Object.assign(Object.assign({}, tag), { _id: tag._id.toString(), createdBy: ((_a = tag.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || tag.createdBy });
            }
            catch (error) {
                if (error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error creating tag:', error);
                throw new common_1.BadRequestException(`Failed to create tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Update a tag
     * Path: PUT /api/admin/tags/:id
     */
    updateTag(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('tags');
                const tag = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!tag) {
                    throw new common_1.NotFoundException(`Tag not found: ${id}`);
                }
                const { name, description, color, category, isActive } = body;
                // Check if name changed and if new name already exists
                if (name && name.trim() !== tag.name) {
                    const existingTag = yield collection.findOne({ name: name.trim() });
                    if (existingTag) {
                        throw new common_1.BadRequestException('Tag with this name already exists');
                    }
                }
                // Validate category
                const validCategories = ['general', 'location', 'event', 'object', 'mood', 'technical', 'custom'];
                const tagCategory = category && validCategories.includes(category) ? category : tag.category;
                // Update tag
                const updateData = {
                    updatedAt: new Date(),
                };
                if (name !== undefined)
                    updateData.name = name.trim();
                if (description !== undefined)
                    updateData.description = (description === null || description === void 0 ? void 0 : description.trim()) || '';
                if (color !== undefined)
                    updateData.color = color;
                if (category !== undefined)
                    updateData.category = tagCategory;
                if (isActive !== undefined)
                    updateData.isActive = isActive;
                yield collection.updateOne({ _id: new mongoose_1.Types.ObjectId(id) }, { $set: updateData });
                const updatedTag = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!updatedTag) {
                    throw new common_1.NotFoundException(`Tag not found after update: ${id}`);
                }
                // Convert ObjectId to string for JSON serialization
                return Object.assign(Object.assign({}, updatedTag), { _id: updatedTag._id.toString(), createdBy: ((_a = updatedTag.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || updatedTag.createdBy });
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error updating tag:', error);
                throw new common_1.BadRequestException(`Failed to update tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Delete a tag
     * Path: DELETE /api/admin/tags/:id
     */
    deleteTag(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('tags');
                const tag = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!tag) {
                    throw new common_1.NotFoundException(`Tag not found: ${id}`);
                }
                yield collection.deleteOne({ _id: new mongoose_1.Types.ObjectId(id) });
                return { success: true, message: 'Tag deleted successfully' };
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Error deleting tag:', error);
                throw new common_1.BadRequestException(`Failed to delete tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.TagsController = TagsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], TagsController.prototype, "getTags", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TagsController.prototype, "getTag", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TagsController.prototype, "createTag", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TagsController.prototype, "updateTag", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TagsController.prototype, "deleteTag", null);
exports.TagsController = TagsController = __decorate([
    (0, common_1.Controller)('admin/tags'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], TagsController);
