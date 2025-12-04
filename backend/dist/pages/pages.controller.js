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
exports.PagesController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const db_1 = require("../config/db");
const mongoose_1 = __importStar(require("mongoose"));
const multi_lang_1 = require("../types/multi-lang");
let PagesController = class PagesController {
    /**
     * Get all pages with optional filters
     * Path: GET /api/admin/pages
     */
    getPages(category, published, search) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('pages');
                // Build query
                const query = {};
                if (category && category !== 'all') {
                    query.category = category;
                }
                if (published !== undefined && published !== null && published !== 'all') {
                    query.isPublished = published === 'true';
                }
                if (search) {
                    const langs = multi_lang_1.SUPPORTED_LANGUAGES.map((l) => l.code);
                    query.$or = [
                        { alias: { $regex: search, $options: 'i' } },
                        ...langs.map((code) => ({ [`title.${code}`]: { $regex: search, $options: 'i' } })),
                        ...langs.map((code) => ({ [`subtitle.${code}`]: { $regex: search, $options: 'i' } })),
                    ];
                }
                const pages = yield collection.find(query).sort({ createdAt: -1 }).toArray();
                // Convert ObjectIds to strings
                const serializedPages = pages.map((page) => {
                    var _a, _b;
                    return (Object.assign(Object.assign({}, page), { _id: page._id.toString(), createdBy: ((_a = page.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || page.createdBy, updatedBy: ((_b = page.updatedBy) === null || _b === void 0 ? void 0 : _b.toString()) || page.updatedBy }));
                });
                return {
                    data: serializedPages,
                };
            }
            catch (error) {
                console.error('Error fetching pages:', error);
                throw new common_1.BadRequestException(`Failed to fetch pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Get a specific page by ID
     * Path: GET /api/admin/pages/:id
     */
    getPage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('pages');
                const page = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!page) {
                    throw new common_1.NotFoundException(`Page not found: ${id}`);
                }
                // Convert ObjectId to string
                return Object.assign(Object.assign({}, page), { _id: page._id.toString(), createdBy: ((_a = page.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || page.createdBy, updatedBy: ((_b = page.updatedBy) === null || _b === void 0 ? void 0 : _b.toString()) || page.updatedBy });
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Error fetching page:', error);
                throw new common_1.BadRequestException(`Failed to fetch page: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Create a new page
     * Path: POST /api/admin/pages
     */
    createPage(body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('pages');
                const { title, subtitle, alias, leadingImage, introText, content, category, isPublished } = body;
                // Validate required fields
                if (!title || !alias) {
                    throw new common_1.BadRequestException('Title and alias are required');
                }
                // Validate title - must have at least one language
                const titleObj = title || {};
                const hasTitle = typeof title === 'string' ? !!title.trim() : Object.values(titleObj || {}).some((v) => (v || '').trim());
                if (!hasTitle) {
                    throw new common_1.BadRequestException('Title is required in at least one language');
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
                // Normalize subtitle object if provided
                let normalizedSubtitle;
                if (subtitle) {
                    normalizedSubtitle = {};
                    if (typeof subtitle === 'string') {
                        normalizedSubtitle.en = subtitle.trim();
                    }
                    else if (typeof subtitle === 'object') {
                        Object.keys(subtitle).forEach((key) => {
                            if (subtitle[key] && typeof subtitle[key] === 'string') {
                                normalizedSubtitle[key] = subtitle[key].trim();
                            }
                        });
                    }
                    if (Object.keys(normalizedSubtitle).length === 0) {
                        normalizedSubtitle = undefined;
                    }
                }
                // Normalize introText and content (HTML)
                let normalizedIntroText;
                if (introText) {
                    normalizedIntroText = {};
                    if (typeof introText === 'string') {
                        normalizedIntroText.en = introText.trim();
                    }
                    else if (typeof introText === 'object') {
                        Object.keys(introText).forEach((key) => {
                            if (introText[key] && typeof introText[key] === 'string') {
                                normalizedIntroText[key] = introText[key].trim();
                            }
                        });
                    }
                    if (Object.keys(normalizedIntroText).length === 0) {
                        normalizedIntroText = undefined;
                    }
                }
                let normalizedContent;
                if (content) {
                    normalizedContent = {};
                    if (typeof content === 'string') {
                        normalizedContent.en = content.trim();
                    }
                    else if (typeof content === 'object') {
                        Object.keys(content).forEach((key) => {
                            if (content[key] && typeof content[key] === 'string') {
                                normalizedContent[key] = content[key].trim();
                            }
                        });
                    }
                    if (Object.keys(normalizedContent).length === 0) {
                        normalizedContent = undefined;
                    }
                }
                // Normalize alias
                const normalizedAlias = String(alias).trim().toLowerCase();
                if (!normalizedAlias) {
                    throw new common_1.BadRequestException('Alias cannot be empty');
                }
                // Validate category
                const validCategories = ['system', 'site'];
                const pageCategory = category && validCategories.includes(category) ? category : 'site';
                // Check if alias already exists
                const existingPage = yield collection.findOne({ alias: normalizedAlias });
                if (existingPage) {
                    throw new common_1.BadRequestException('Page with this alias already exists');
                }
                // Create page
                const now = new Date();
                const pageData = {
                    title: normalizedTitle,
                    alias: normalizedAlias,
                    category: pageCategory,
                    isPublished: Boolean(isPublished),
                    createdBy: new mongoose_1.Types.ObjectId(), // TODO: Get from auth context
                    updatedBy: new mongoose_1.Types.ObjectId(), // TODO: Get from auth context
                    createdAt: now,
                    updatedAt: now,
                };
                if (normalizedSubtitle)
                    pageData.subtitle = normalizedSubtitle;
                if (leadingImage === null || leadingImage === void 0 ? void 0 : leadingImage.trim())
                    pageData.leadingImage = leadingImage.trim();
                if (normalizedIntroText)
                    pageData.introText = normalizedIntroText;
                if (normalizedContent)
                    pageData.content = normalizedContent;
                const result = yield collection.insertOne(pageData);
                const page = yield collection.findOne({ _id: result.insertedId });
                if (!page) {
                    throw new common_1.BadRequestException('Failed to retrieve created page');
                }
                // Convert ObjectId to string
                return Object.assign(Object.assign({}, page), { _id: page._id.toString(), createdBy: ((_a = page.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || page.createdBy, updatedBy: ((_b = page.updatedBy) === null || _b === void 0 ? void 0 : _b.toString()) || page.updatedBy });
            }
            catch (error) {
                if (error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error creating page:', error);
                throw new common_1.BadRequestException(`Failed to create page: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Update a page
     * Path: PUT /api/admin/pages/:id
     */
    updatePage(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('pages');
                const page = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!page) {
                    throw new common_1.NotFoundException(`Page not found: ${id}`);
                }
                const { title, subtitle, alias, leadingImage, introText, content, category, isPublished } = body;
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
                // Normalize other fields similar to create
                let normalizedSubtitle;
                if (subtitle !== undefined) {
                    if (subtitle) {
                        normalizedSubtitle = {};
                        if (typeof subtitle === 'string') {
                            normalizedSubtitle.en = subtitle.trim();
                        }
                        else if (typeof subtitle === 'object') {
                            Object.keys(subtitle).forEach((key) => {
                                if (subtitle[key] && typeof subtitle[key] === 'string') {
                                    normalizedSubtitle[key] = subtitle[key].trim();
                                }
                            });
                        }
                        if (Object.keys(normalizedSubtitle).length === 0) {
                            normalizedSubtitle = undefined;
                        }
                    }
                    else {
                        normalizedSubtitle = undefined;
                    }
                }
                let normalizedIntroText;
                if (introText !== undefined) {
                    if (introText) {
                        normalizedIntroText = {};
                        if (typeof introText === 'string') {
                            normalizedIntroText.en = introText.trim();
                        }
                        else if (typeof introText === 'object') {
                            Object.keys(introText).forEach((key) => {
                                if (introText[key] && typeof introText[key] === 'string') {
                                    normalizedIntroText[key] = introText[key].trim();
                                }
                            });
                        }
                        if (Object.keys(normalizedIntroText).length === 0) {
                            normalizedIntroText = undefined;
                        }
                    }
                    else {
                        normalizedIntroText = undefined;
                    }
                }
                let normalizedContent;
                if (content !== undefined) {
                    if (content) {
                        normalizedContent = {};
                        if (typeof content === 'string') {
                            normalizedContent.en = content.trim();
                        }
                        else if (typeof content === 'object') {
                            Object.keys(content).forEach((key) => {
                                if (content[key] && typeof content[key] === 'string') {
                                    normalizedContent[key] = content[key].trim();
                                }
                            });
                        }
                        if (Object.keys(normalizedContent).length === 0) {
                            normalizedContent = undefined;
                        }
                    }
                    else {
                        normalizedContent = undefined;
                    }
                }
                // Check if alias changed and if new alias already exists
                if (alias && alias.trim().toLowerCase() !== page.alias) {
                    const normalizedAlias = alias.trim().toLowerCase();
                    const existingPage = yield collection.findOne({ alias: normalizedAlias });
                    if (existingPage) {
                        throw new common_1.BadRequestException('Page with this alias already exists');
                    }
                }
                // Validate category
                const validCategories = ['system', 'site'];
                const pageCategory = category && validCategories.includes(category) ? category : page.category;
                // Update page
                const updateData = {
                    updatedAt: new Date(),
                    updatedBy: new mongoose_1.Types.ObjectId(), // TODO: Get from auth context
                };
                if (normalizedTitle !== undefined)
                    updateData.title = normalizedTitle;
                if (normalizedSubtitle !== undefined)
                    updateData.subtitle = normalizedSubtitle;
                if (alias !== undefined)
                    updateData.alias = alias.trim().toLowerCase();
                if (leadingImage !== undefined)
                    updateData.leadingImage = (leadingImage === null || leadingImage === void 0 ? void 0 : leadingImage.trim()) || null;
                if (normalizedIntroText !== undefined)
                    updateData.introText = normalizedIntroText;
                if (normalizedContent !== undefined)
                    updateData.content = normalizedContent;
                if (category !== undefined)
                    updateData.category = pageCategory;
                if (isPublished !== undefined)
                    updateData.isPublished = Boolean(isPublished);
                yield collection.updateOne({ _id: new mongoose_1.Types.ObjectId(id) }, { $set: updateData });
                const updatedPage = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!updatedPage) {
                    throw new common_1.NotFoundException(`Page not found after update: ${id}`);
                }
                // Convert ObjectId to string
                return Object.assign(Object.assign({}, updatedPage), { _id: updatedPage._id.toString(), createdBy: ((_a = updatedPage.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || updatedPage.createdBy, updatedBy: ((_b = updatedPage.updatedBy) === null || _b === void 0 ? void 0 : _b.toString()) || updatedPage.updatedBy });
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error updating page:', error);
                throw new common_1.BadRequestException(`Failed to update page: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Delete a page
     * Path: DELETE /api/admin/pages/:id
     */
    deletePage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('pages');
                const page = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!page) {
                    throw new common_1.NotFoundException(`Page not found: ${id}`);
                }
                yield collection.deleteOne({ _id: new mongoose_1.Types.ObjectId(id) });
                return { success: true, message: 'Page deleted successfully' };
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Error deleting page:', error);
                throw new common_1.BadRequestException(`Failed to delete page: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.PagesController = PagesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('category')),
    __param(1, (0, common_1.Query)('published')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "getPages", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "getPage", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "createPage", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "updatePage", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "deletePage", null);
exports.PagesController = PagesController = __decorate([
    (0, common_1.Controller)('admin/pages'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], PagesController);
