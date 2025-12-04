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
exports.GroupsController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const db_1 = require("../config/db");
const mongoose_1 = __importStar(require("mongoose"));
let GroupsController = class GroupsController {
    /**
     * Get all groups
     * Path: GET /api/admin/groups
     */
    getGroups() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('groups');
                const groups = yield collection.find({}).sort({ alias: 1 }).toArray();
                // Convert ObjectIds to strings
                const serializedGroups = groups.map((group) => (Object.assign(Object.assign({}, group), { _id: group._id.toString() })));
                return {
                    data: serializedGroups,
                };
            }
            catch (error) {
                console.error('Error fetching groups:', error);
                throw new common_1.BadRequestException(`Failed to fetch groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Get a specific group by ID
     * Path: GET /api/admin/groups/:id
     */
    getGroup(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('groups');
                const group = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!group) {
                    throw new common_1.NotFoundException(`Group not found: ${id}`);
                }
                // Convert ObjectId to string
                return Object.assign(Object.assign({}, group), { _id: group._id.toString() });
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Error fetching group:', error);
                throw new common_1.BadRequestException(`Failed to fetch group: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Create a new group
     * Path: POST /api/admin/groups
     */
    createGroup(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('groups');
                const { alias, name } = body;
                // Validate required fields
                if (!alias || !alias.trim()) {
                    throw new common_1.BadRequestException('Alias is required');
                }
                // Validate name - must have at least one language
                const nameObj = name || {};
                const hasName = typeof name === 'string' ? !!name.trim() : Object.values(nameObj || {}).some((v) => (v || '').trim());
                if (!hasName) {
                    throw new common_1.BadRequestException('Name is required in at least one language');
                }
                // Normalize alias
                const normalizedAlias = String(alias).trim().toLowerCase();
                if (!normalizedAlias) {
                    throw new common_1.BadRequestException('Alias cannot be empty');
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
                // Check if alias already exists
                const existingGroup = yield collection.findOne({ alias: normalizedAlias });
                if (existingGroup) {
                    throw new common_1.BadRequestException('Group with this alias already exists');
                }
                // Create group
                const now = new Date();
                const groupData = {
                    alias: normalizedAlias,
                    name: normalizedName,
                    createdAt: now,
                    updatedAt: now,
                };
                const result = yield collection.insertOne(groupData);
                const group = yield collection.findOne({ _id: result.insertedId });
                if (!group) {
                    throw new common_1.BadRequestException('Failed to retrieve created group');
                }
                // Convert ObjectId to string
                return Object.assign(Object.assign({}, group), { _id: group._id.toString() });
            }
            catch (error) {
                if (error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error creating group:', error);
                throw new common_1.BadRequestException(`Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Update a group (alias is immutable, only name can be updated)
     * Path: PUT /api/admin/groups/:id
     */
    updateGroup(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('groups');
                const group = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!group) {
                    throw new common_1.NotFoundException(`Group not found: ${id}`);
                }
                const { name } = body;
                // Validate name - must have at least one language
                if (!name) {
                    throw new common_1.BadRequestException('Name is required');
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
                // Validate that at least one language has a value
                if (Object.keys(normalizedName).length === 0) {
                    throw new common_1.BadRequestException('Name is required in at least one language');
                }
                // Update group (alias is immutable)
                const updateData = {
                    name: normalizedName,
                    updatedAt: new Date(),
                };
                yield collection.updateOne({ _id: new mongoose_1.Types.ObjectId(id) }, { $set: updateData });
                const updatedGroup = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!updatedGroup) {
                    throw new common_1.NotFoundException(`Group not found after update: ${id}`);
                }
                // Convert ObjectId to string
                return Object.assign(Object.assign({}, updatedGroup), { _id: updatedGroup._id.toString() });
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error updating group:', error);
                throw new common_1.BadRequestException(`Failed to update group: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Delete a group
     * Path: DELETE /api/admin/groups/:id
     */
    deleteGroup(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('groups');
                const group = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!group) {
                    throw new common_1.NotFoundException(`Group not found: ${id}`);
                }
                // Check if group is used by any users
                const usersCollection = db.collection('users');
                const usersWithGroup = yield usersCollection.countDocuments({
                    groupAliases: group.alias,
                });
                if (usersWithGroup > 0) {
                    throw new common_1.BadRequestException(`Cannot delete group: ${usersWithGroup} user(s) are assigned to this group. Please remove the group from users first.`);
                }
                // Check if group is used by any albums
                const albumsCollection = db.collection('albums');
                const albumsWithGroup = yield albumsCollection.countDocuments({
                    allowedGroups: group.alias,
                });
                if (albumsWithGroup > 0) {
                    throw new common_1.BadRequestException(`Cannot delete group: ${albumsWithGroup} album(s) reference this group. Please remove the group from albums first.`);
                }
                yield collection.deleteOne({ _id: new mongoose_1.Types.ObjectId(id) });
                return { success: true, message: 'Group deleted successfully' };
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error deleting group:', error);
                throw new common_1.BadRequestException(`Failed to delete group: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.GroupsController = GroupsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "getGroups", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "getGroup", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "createGroup", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "updateGroup", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GroupsController.prototype, "deleteGroup", null);
exports.GroupsController = GroupsController = __decorate([
    (0, common_1.Controller)('admin/groups'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], GroupsController);
