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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const db_1 = require("../config/db");
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt = __importStar(require("bcryptjs"));
const SALT_ROUNDS = 10;
function hashPassword(plain) {
    return __awaiter(this, void 0, void 0, function* () {
        const salt = yield bcrypt.genSalt(SALT_ROUNDS);
        return bcrypt.hash(plain, salt);
    });
}
let UsersController = class UsersController {
    /**
     * Get all users
     * Path: GET /api/admin/users
     */
    getUsers(search, role, blocked) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('users');
                // Build query
                const query = {};
                if (search) {
                    query.$or = [
                        { username: { $regex: search, $options: 'i' } },
                        { 'name.en': { $regex: search, $options: 'i' } },
                        { 'name.he': { $regex: search, $options: 'i' } },
                    ];
                }
                if (role && role !== 'all') {
                    query.role = role;
                }
                if (blocked !== undefined && blocked !== null) {
                    query.blocked = blocked === 'true';
                }
                const users = yield collection.find(query).sort({ username: 1 }).toArray();
                // Convert ObjectIds to strings and remove passwordHash
                const serializedUsers = users.map((user) => {
                    const { passwordHash } = user, rest = __rest(user, ["passwordHash"]);
                    return Object.assign(Object.assign({}, rest), { _id: user._id.toString() });
                });
                return {
                    data: serializedUsers,
                };
            }
            catch (error) {
                console.error('Error fetching users:', error);
                throw new common_1.BadRequestException(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Get a specific user by ID
     * Path: GET /api/admin/users/:id
     */
    getUser(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('users');
                const user = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!user) {
                    throw new common_1.NotFoundException(`User not found: ${id}`);
                }
                // Remove passwordHash and convert ObjectId to string
                const { passwordHash } = user, rest = __rest(user, ["passwordHash"]);
                return Object.assign(Object.assign({}, rest), { _id: user._id.toString() });
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Error fetching user:', error);
                throw new common_1.BadRequestException(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Create a new user
     * Path: POST /api/admin/users
     */
    createUser(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('users');
                const { name, username, password, role, groupAliases, blocked, allowedStorageProviders } = body;
                // Validate required fields
                if (!name || !username || !password || !role) {
                    throw new common_1.BadRequestException('Name, username, password, and role are required');
                }
                // Validate name - must have at least one language
                const nameObj = name || {};
                const hasName = typeof name === 'string' ? !!name.trim() : Object.values(nameObj || {}).some((v) => (v || '').trim());
                if (!hasName) {
                    throw new common_1.BadRequestException('Name is required in at least one language');
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
                // Validate username
                const normalizedUsername = String(username).trim().toLowerCase();
                if (!normalizedUsername) {
                    throw new common_1.BadRequestException('Username is required');
                }
                // Check if username already exists
                const existingUser = yield collection.findOne({ username: normalizedUsername });
                if (existingUser) {
                    throw new common_1.BadRequestException('Username already exists');
                }
                // Validate role
                const validRoles = ['admin', 'owner', 'guest'];
                if (!validRoles.includes(role)) {
                    throw new common_1.BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
                }
                // Validate password
                if (!password || password.length < 6) {
                    throw new common_1.BadRequestException('Password must be at least 6 characters long');
                }
                // Hash password
                const passwordHash = yield hashPassword(password);
                // Create user
                const now = new Date();
                const userData = {
                    name: normalizedName,
                    username: normalizedUsername,
                    passwordHash,
                    role,
                    groupAliases: Array.isArray(groupAliases) ? groupAliases : [],
                    blocked: Boolean(blocked),
                    allowedStorageProviders: Array.isArray(allowedStorageProviders) && allowedStorageProviders.length > 0
                        ? allowedStorageProviders
                        : ['local'],
                    createdAt: now,
                    updatedAt: now,
                };
                const result = yield collection.insertOne(userData);
                const user = yield collection.findOne({ _id: result.insertedId });
                if (!user) {
                    throw new common_1.BadRequestException('Failed to retrieve created user');
                }
                // Remove passwordHash and convert ObjectId to string
                const { passwordHash: _ } = user, rest = __rest(user, ["passwordHash"]);
                return Object.assign(Object.assign({}, rest), { _id: user._id.toString() });
            }
            catch (error) {
                if (error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error creating user:', error);
                throw new common_1.BadRequestException(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Update a user
     * Path: PUT /api/admin/users/:id
     */
    updateUser(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('users');
                const user = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!user) {
                    throw new common_1.NotFoundException(`User not found: ${id}`);
                }
                const { name, password, role, groupAliases, blocked, allowedStorageProviders } = body;
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
                        throw new common_1.BadRequestException('Name is required in at least one language');
                    }
                }
                // Validate role if provided
                if (role !== undefined) {
                    const validRoles = ['admin', 'owner', 'guest'];
                    if (!validRoles.includes(role)) {
                        throw new common_1.BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
                    }
                }
                // Validate password if provided
                if (password !== undefined && password !== null && password !== '') {
                    if (password.length < 6) {
                        throw new common_1.BadRequestException('Password must be at least 6 characters long');
                    }
                }
                // Check if blocking/changing role would leave no active admins
                const newRole = role !== undefined ? role : user.role;
                const newBlocked = blocked !== undefined ? Boolean(blocked) : user.blocked;
                if (newRole !== 'admin' || newBlocked) {
                    // Check if there are other active admins
                    const otherActiveAdmins = yield collection.countDocuments({
                        _id: { $ne: new mongoose_1.Types.ObjectId(id) },
                        role: 'admin',
                        blocked: { $ne: true },
                    });
                    if (otherActiveAdmins === 0) {
                        throw new common_1.BadRequestException('Cannot block or change role: At least one admin must remain active');
                    }
                }
                // Update user
                const updateData = {
                    updatedAt: new Date(),
                };
                if (normalizedName !== undefined)
                    updateData.name = normalizedName;
                if (role !== undefined)
                    updateData.role = role;
                if (Array.isArray(groupAliases))
                    updateData.groupAliases = groupAliases;
                if (typeof blocked === 'boolean')
                    updateData.blocked = blocked;
                if (Array.isArray(allowedStorageProviders))
                    updateData.allowedStorageProviders = allowedStorageProviders;
                if (password !== undefined && password !== null && password !== '') {
                    updateData.passwordHash = yield hashPassword(password);
                }
                yield collection.updateOne({ _id: new mongoose_1.Types.ObjectId(id) }, { $set: updateData });
                const updatedUser = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!updatedUser) {
                    throw new common_1.NotFoundException(`User not found after update: ${id}`);
                }
                // Remove passwordHash and convert ObjectId to string
                const { passwordHash: _ } = updatedUser, rest = __rest(updatedUser, ["passwordHash"]);
                return Object.assign(Object.assign({}, rest), { _id: updatedUser._id.toString() });
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error updating user:', error);
                throw new common_1.BadRequestException(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Delete a user
     * Path: DELETE /api/admin/users/:id
     */
    deleteUser(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const collection = db.collection('users');
                const user = yield collection.findOne({ _id: new mongoose_1.Types.ObjectId(id) });
                if (!user) {
                    throw new common_1.NotFoundException(`User not found: ${id}`);
                }
                // Check if this is the last active admin
                if (user.role === 'admin' && !user.blocked) {
                    const otherActiveAdmins = yield collection.countDocuments({
                        _id: { $ne: new mongoose_1.Types.ObjectId(id) },
                        role: 'admin',
                        blocked: { $ne: true },
                    });
                    if (otherActiveAdmins === 0) {
                        throw new common_1.BadRequestException('Cannot delete the last active admin');
                    }
                }
                yield collection.deleteOne({ _id: new mongoose_1.Types.ObjectId(id) });
                return { success: true, message: 'User deleted successfully' };
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Error deleting user:', error);
                throw new common_1.BadRequestException(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('role')),
    __param(2, (0, common_1.Query)('blocked')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUser", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createUser", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteUser", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('admin/users'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], UsersController);
