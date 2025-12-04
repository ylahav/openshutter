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
exports.BlogCategoriesController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const db_1 = require("../config/db");
const mongoose_1 = __importStar(require("mongoose"));
const multi_lang_1 = require("../types/multi-lang");
let BlogCategoriesController = class BlogCategoriesController {
    /**
     * Get all blog categories with optional filters
     * Path: GET /api/admin/blog-categories
     */
    getBlogCategories(search, isActive, page, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('blogcategories');
                // Build query
                const query = {};
                if (search) {
                    const langs = multi_lang_1.SUPPORTED_LANGUAGES.map((l) => l.code);
                    query.$or = [
                        { alias: { $regex: search, $options: 'i' } },
                        ...langs.map((code) => ({ [`title.${code}`]: { $regex: search, $options: 'i' } })),
                        ...langs.map((code) => ({ [`description.${code}`]: { $regex: search, $options: 'i' } })),
                    ];
                }
                if (isActive !== undefined && isActive !== null && isActive !== '') {
                    query.isActive = isActive === 'true';
                }
                // Pagination
                const pageNum = parseInt(page || '1', 10);
                const limitNum = parseInt(limit || '10', 10);
                const skip = (pageNum - 1) * limitNum;
                const [categories, total] = yield Promise.all([
                    collection.find(query).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
                    collection.countDocuments(query),
                ]);
                // Convert ObjectIds to strings
                const serializedCategories = categories.map((category) => (Object.assign(Object.assign({}, category), { _id: category._id.toString() })));
                return {
                    data: serializedCategories,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total,
                        totalPages: Math.ceil(total / limitNum),
                    },
                };
            }
            catch (error) {
                console.error('Error fetching blog categories:', error);
                throw new common_1.BadRequestException(`Failed to fetch blog categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Get a specific blog category by ID
     * Path: GET /api/admin/blog-categories/:id
     */
    getBlogCategory(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('blogcategories');
                const category = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!category) {
                    throw new common_1.NotFoundException(`Blog category not found: ${id}`);
                }
                // Convert ObjectId to string
                return Object.assign(Object.assign({}, category), { _id: category._id.toString() });
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Error fetching blog category:', error);
                throw new common_1.BadRequestException(`Failed to fetch blog category: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Create a new blog category
     * Path: POST /api/admin/blog-categories
     */
    createBlogCategory(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('blogcategories');
                const { title, description, leadingImage, isActive, sortOrder, alias } = body;
                // Validate required fields
                if (!title) {
                    throw new common_1.BadRequestException('Title is required');
                }
                // Normalize title object
                const normalizedTitle = {};
                if (typeof title === 'string') {
                    normalizedTitle.en = title.trim();
                }
                else if (title && typeof title === 'object') {
                    Object.keys(title).forEach((key) => {
                        if (title[key] && typeof title[key] === 'string') {
                            normalizedTitle[key] = title[key].trim();
                        }
                    });
                }
                // Validate that at least one language has a value
                if (Object.keys(normalizedTitle).length === 0) {
                    throw new common_1.BadRequestException('Title is required in at least one language');
                }
                // Generate or use provided alias
                let normalizedAlias;
                if (alias && alias.trim()) {
                    normalizedAlias = alias.trim().toLowerCase();
                }
                else {
                    // Generate alias from title
                    const titleText = normalizedTitle.en || normalizedTitle.he || Object.values(normalizedTitle)[0] || 'untitled';
                    normalizedAlias = titleText
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '');
                }
                // Ensure alias is unique
                let uniqueAlias = normalizedAlias;
                let counter = 1;
                while (yield collection.findOne({ alias: uniqueAlias })) {
                    uniqueAlias = `${normalizedAlias}-${counter}`;
                    counter++;
                }
                // Normalize description object if provided
                let normalizedDescription;
                if (description) {
                    normalizedDescription = {};
                    if (typeof description === 'string') {
                        normalizedDescription.en = description.trim();
                    }
                    else if (typeof description === 'object') {
                        Object.keys(description).forEach((key) => {
                            if (description[key] && typeof description[key] === 'string') {
                                normalizedDescription[key] = description[key].trim();
                            }
                        });
                    }
                    if (Object.keys(normalizedDescription).length === 0) {
                        normalizedDescription = undefined;
                    }
                }
                // Create blog category
                const now = new Date();
                const categoryData = {
                    alias: uniqueAlias,
                    title: normalizedTitle,
                    isActive: isActive !== undefined ? Boolean(isActive) : true,
                    sortOrder: sortOrder !== undefined ? parseInt(String(sortOrder), 10) : 0,
                    createdAt: now,
                    updatedAt: now,
                };
                if (normalizedDescription)
                    categoryData.description = normalizedDescription;
                if (leadingImage)
                    categoryData.leadingImage = leadingImage;
                const result = yield collection.insertOne(categoryData);
                const category = yield collection.findOne({ _id: result.insertedId });
                if (!category) {
                    throw new common_1.BadRequestException('Failed to retrieve created blog category');
                }
                // Convert ObjectId to string
                return Object.assign(Object.assign({}, category), { _id: category._id.toString() });
            }
            catch (error) {
                if (error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error creating blog category:', error);
                throw new common_1.BadRequestException(`Failed to create blog category: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Update a blog category
     * Path: PUT /api/admin/blog-categories/:id
     */
    updateBlogCategory(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('blogcategories');
                const category = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!category) {
                    throw new common_1.NotFoundException(`Blog category not found: ${id}`);
                }
                const { title, description, leadingImage, isActive, sortOrder, alias } = body;
                // Normalize title object if provided
                let normalizedTitle;
                if (title !== undefined) {
                    normalizedTitle = {};
                    if (typeof title === 'string') {
                        normalizedTitle.en = title.trim();
                    }
                    else if (title && typeof title === 'object') {
                        Object.keys(title).forEach((key) => {
                            if (title[key] && typeof title[key] === 'string') {
                                normalizedTitle[key] = title[key].trim();
                            }
                        });
                    }
                    if (Object.keys(normalizedTitle).length === 0) {
                        throw new common_1.BadRequestException('Title is required in at least one language');
                    }
                }
                // Normalize description object if provided
                let normalizedDescription;
                if (description !== undefined) {
                    if (description) {
                        normalizedDescription = {};
                        if (typeof description === 'string') {
                            normalizedDescription.en = description.trim();
                        }
                        else if (typeof description === 'object') {
                            Object.keys(description).forEach((key) => {
                                if (description[key] && typeof description[key] === 'string') {
                                    normalizedDescription[key] = description[key].trim();
                                }
                            });
                        }
                        if (Object.keys(normalizedDescription).length === 0) {
                            normalizedDescription = undefined;
                        }
                    }
                    else {
                        normalizedDescription = undefined;
                    }
                }
                // Check if alias changed and if new alias already exists
                if (alias && alias.trim().toLowerCase() !== category.alias) {
                    const normalizedAlias = alias.trim().toLowerCase();
                    const existingCategory = yield collection.findOne({ alias: normalizedAlias });
                    if (existingCategory) {
                        throw new common_1.BadRequestException('Blog category with this alias already exists');
                    }
                }
                // Update blog category
                const updateData = {
                    updatedAt: new Date(),
                };
                if (normalizedTitle !== undefined)
                    updateData.title = normalizedTitle;
                if (normalizedDescription !== undefined)
                    updateData.description = normalizedDescription;
                if (leadingImage !== undefined)
                    updateData.leadingImage = leadingImage || null;
                if (isActive !== undefined)
                    updateData.isActive = Boolean(isActive);
                if (sortOrder !== undefined)
                    updateData.sortOrder = parseInt(String(sortOrder), 10);
                if (alias !== undefined)
                    updateData.alias = alias.trim().toLowerCase();
                yield collection.updateOne({ _id: new mongoose_1.Types.ObjectId(id) }, { $set: updateData });
                const updatedCategory = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!updatedCategory) {
                    throw new common_1.NotFoundException(`Blog category not found after update: ${id}`);
                }
                // Convert ObjectId to string
                return Object.assign(Object.assign({}, updatedCategory), { _id: updatedCategory._id.toString() });
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error updating blog category:', error);
                throw new common_1.BadRequestException(`Failed to update blog category: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Delete a blog category
     * Path: DELETE /api/admin/blog-categories/:id
     */
    deleteBlogCategory(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('blogcategories');
                const category = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!category) {
                    throw new common_1.NotFoundException(`Blog category not found: ${id}`);
                }
                // Check if category is used by any blog articles
                const articlesCollection = db.collection('blogarticles');
                const articlesWithCategory = yield articlesCollection.countDocuments({
                    category: category.alias,
                });
                if (articlesWithCategory > 0) {
                    throw new common_1.BadRequestException(`Cannot delete category: ${articlesWithCategory} article(s) use this category. Please reassign or delete articles first.`);
                }
                yield collection.deleteOne({ _id: new mongoose_1.Types.ObjectId(id) });
                return { success: true, message: 'Blog category deleted successfully' };
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error deleting blog category:', error);
                throw new common_1.BadRequestException(`Failed to delete blog category: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.BlogCategoriesController = BlogCategoriesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('isActive')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], BlogCategoriesController.prototype, "getBlogCategories", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogCategoriesController.prototype, "getBlogCategory", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BlogCategoriesController.prototype, "createBlogCategory", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BlogCategoriesController.prototype, "updateBlogCategory", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogCategoriesController.prototype, "deleteBlogCategory", null);
exports.BlogCategoriesController = BlogCategoriesController = __decorate([
    (0, common_1.Controller)('admin/blog-categories'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], BlogCategoriesController);
