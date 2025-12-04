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
exports.PeopleController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const db_1 = require("../config/db");
const mongoose_1 = __importStar(require("mongoose"));
const multi_lang_1 = require("../types/multi-lang");
let PeopleController = class PeopleController {
    /**
     * Get all people with optional search and pagination
     * Path: GET /api/admin/people
     */
    getPeople(search, page, limit, isActive) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('people');
                // Build query
                const query = {};
                if (search) {
                    const langs = multi_lang_1.SUPPORTED_LANGUAGES.map((l) => l.code);
                    const fields = ['firstName', 'lastName', 'fullName', 'nickname', 'description'];
                    query.$or = fields.flatMap((f) => langs.map((code) => ({ [`${f}.${code}`]: { $regex: search, $options: 'i' } })));
                }
                if (isActive !== undefined && isActive !== null) {
                    query.isActive = isActive === 'true';
                }
                // Pagination
                const pageNum = parseInt(page || '1', 10);
                const limitNum = parseInt(limit || '20', 10);
                const skip = (pageNum - 1) * limitNum;
                const [people, total] = yield Promise.all([
                    collection.find(query).sort({ fullName: 1 }).skip(skip).limit(limitNum).toArray(),
                    collection.countDocuments(query),
                ]);
                // Serialize ObjectIds to strings
                const serializedPeople = people.map((person) => (Object.assign(Object.assign({}, person), { _id: person._id.toString(), tags: person.tags
                        ? person.tags.map((tag) => (tag._id ? tag._id.toString() : tag.toString()))
                        : [], createdBy: person.createdBy ? person.createdBy.toString() : null })));
                return {
                    data: serializedPeople,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total,
                        totalPages: Math.ceil(total / limitNum),
                    },
                };
            }
            catch (error) {
                console.error('Error fetching people:', error);
                throw new common_1.BadRequestException(`Failed to fetch people: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Get a specific person by ID
     * Path: GET /api/admin/people/:id
     */
    getPerson(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('people');
                const person = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!person) {
                    throw new common_1.NotFoundException(`Person not found: ${id}`);
                }
                return person;
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Error fetching person:', error);
                throw new common_1.BadRequestException(`Failed to fetch person: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Create a new person
     * Path: POST /api/admin/people
     */
    createPerson(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('people');
                const { firstName, lastName, nickname, birthDate, description, tags, isActive } = body;
                // Validate required fields
                const anyFirst = typeof firstName === 'string'
                    ? !!firstName.trim()
                    : Object.values(firstName || {}).some((v) => (v || '').trim());
                const anyLast = typeof lastName === 'string'
                    ? !!lastName.trim()
                    : Object.values(lastName || {}).some((v) => (v || '').trim());
                if (!anyFirst || !anyLast) {
                    throw new common_1.BadRequestException('First name and last name are required in at least one language');
                }
                // Generate fullName from firstName and lastName
                const langs = multi_lang_1.SUPPORTED_LANGUAGES.map((l) => l.code);
                const fullNamesByLang = langs.reduce((acc, lang) => {
                    const first = (firstName === null || firstName === void 0 ? void 0 : firstName[lang]) || '';
                    const last = (lastName === null || lastName === void 0 ? void 0 : lastName[lang]) || '';
                    if (first || last) {
                        acc[lang] = `${first} ${last}`.trim();
                    }
                    return acc;
                }, {});
                // Convert tag strings to ObjectIds
                let tagObjectIds = [];
                if (tags && Array.isArray(tags) && tags.length > 0) {
                    const tagCollection = db.collection('tags');
                    for (const tagName of tags) {
                        if (typeof tagName === 'string') {
                            let tag = yield tagCollection.findOne({ name: tagName.trim() });
                            if (!tag) {
                                const insertResult = yield tagCollection.insertOne({
                                    name: tagName.trim(),
                                    createdBy: new mongoose_1.Types.ObjectId(), // TODO: Get from auth context
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                });
                                tag = yield tagCollection.findOne({ _id: insertResult.insertedId });
                            }
                            if (tag) {
                                tagObjectIds.push(tag._id);
                            }
                        }
                        else if (tagName instanceof mongoose_1.Types.ObjectId) {
                            tagObjectIds.push(tagName);
                        }
                    }
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
                    createdBy: new mongoose_1.Types.ObjectId(), // TODO: Get from auth context
                    createdAt: now,
                    updatedAt: now,
                };
                const result = yield collection.insertOne(personData);
                const person = yield collection.findOne({ _id: result.insertedId });
                return person;
            }
            catch (error) {
                if (error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error creating person:', error);
                throw new common_1.BadRequestException(`Failed to create person: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Update a person
     * Path: PUT /api/admin/people/:id
     */
    updatePerson(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('people');
                const person = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!person) {
                    throw new common_1.NotFoundException(`Person not found: ${id}`);
                }
                const { firstName, lastName, nickname, birthDate, description, tags, isActive } = body;
                // Generate fullName if firstName or lastName changed
                let fullName = person.fullName;
                if (firstName || lastName) {
                    const langs = multi_lang_1.SUPPORTED_LANGUAGES.map((l) => l.code);
                    fullName = langs.reduce((acc, lang) => {
                        var _a, _b;
                        const first = (firstName === null || firstName === void 0 ? void 0 : firstName[lang]) || ((_a = person.firstName) === null || _a === void 0 ? void 0 : _a[lang]) || '';
                        const last = (lastName === null || lastName === void 0 ? void 0 : lastName[lang]) || ((_b = person.lastName) === null || _b === void 0 ? void 0 : _b[lang]) || '';
                        if (first || last) {
                            acc[lang] = `${first} ${last}`.trim();
                        }
                        return acc;
                    }, {});
                }
                // Convert tag strings to ObjectIds
                let tagObjectIds = [];
                if (tags && Array.isArray(tags) && tags.length > 0) {
                    const tagCollection = db.collection('tags');
                    for (const tagName of tags) {
                        if (typeof tagName === 'string') {
                            let tag = yield tagCollection.findOne({ name: tagName.trim() });
                            if (!tag) {
                                const insertResult = yield tagCollection.insertOne({
                                    name: tagName.trim(),
                                    createdBy: new mongoose_1.Types.ObjectId(), // TODO: Get from auth context
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                });
                                tag = yield tagCollection.findOne({ _id: insertResult.insertedId });
                            }
                            if (tag) {
                                tagObjectIds.push(tag._id);
                            }
                        }
                        else if (tagName instanceof mongoose_1.Types.ObjectId) {
                            tagObjectIds.push(tagName);
                        }
                    }
                }
                // Update person
                const updateData = {
                    updatedAt: new Date(),
                };
                if (firstName !== undefined)
                    updateData.firstName = firstName;
                if (lastName !== undefined)
                    updateData.lastName = lastName;
                if (fullName)
                    updateData.fullName = fullName;
                if (nickname !== undefined)
                    updateData.nickname = nickname;
                if (birthDate !== undefined)
                    updateData.birthDate = birthDate ? new Date(birthDate) : null;
                if (description !== undefined)
                    updateData.description = description;
                if (tags !== undefined)
                    updateData.tags = tagObjectIds;
                if (isActive !== undefined)
                    updateData.isActive = isActive;
                yield collection.updateOne({ _id: new mongoose_1.Types.ObjectId(id) }, { $set: updateData });
                const updatedPerson = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                return updatedPerson;
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Error updating person:', error);
                throw new common_1.BadRequestException(`Failed to update person: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Delete a person
     * Path: DELETE /api/admin/people/:id
     */
    deletePerson(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('people');
                const person = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!person) {
                    throw new common_1.NotFoundException(`Person not found: ${id}`);
                }
                yield collection.deleteOne({ _id: new mongoose_1.Types.ObjectId(id) });
                return { success: true, message: 'Person deleted successfully' };
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Error deleting person:', error);
                throw new common_1.BadRequestException(`Failed to delete person: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.PeopleController = PeopleController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], PeopleController.prototype, "getPeople", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PeopleController.prototype, "getPerson", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PeopleController.prototype, "createPerson", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PeopleController.prototype, "updatePerson", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PeopleController.prototype, "deletePerson", null);
exports.PeopleController = PeopleController = __decorate([
    (0, common_1.Controller)('admin/people'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], PeopleController);
