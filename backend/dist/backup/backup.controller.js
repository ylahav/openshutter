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
exports.BackupController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const admin_guard_1 = require("../common/guards/admin.guard");
const db_1 = require("../config/db");
const mongoose_1 = __importStar(require("mongoose"));
let BackupController = class BackupController {
    /**
     * Create database backup
     * Path: POST /api/admin/backup/database
     */
    createDatabaseBackup() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                // Get all collections
                const collections = yield db.listCollections().toArray();
                const backup = {
                    timestamp: new Date().toISOString(),
                    version: '1.0',
                    collections: {},
                };
                // Export each collection
                for (const collectionInfo of collections) {
                    const collectionName = collectionInfo.name;
                    const collection = db.collection(collectionName);
                    const documents = yield collection.find({}).toArray();
                    // Convert ObjectId to string for JSON serialization
                    const serializedDocuments = documents.map((doc) => (Object.assign(Object.assign({}, doc), { _id: doc._id.toString() })));
                    backup.collections[collectionName] = serializedDocuments;
                }
                return {
                    success: true,
                    backup,
                    message: `Backup created with ${Object.keys(backup.collections).length} collections`,
                };
            }
            catch (error) {
                console.error('Database backup error:', error);
                throw new common_1.BadRequestException(`Failed to create database backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Restore database from backup
     * Path: POST /api/admin/backup/restore-database
     */
    restoreDatabase(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { backup } = body;
                if (!backup || !backup.collections) {
                    throw new common_1.BadRequestException('Invalid backup format');
                }
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                // Clear existing collections
                const existingCollections = yield db.listCollections().toArray();
                for (const collectionInfo of existingCollections) {
                    yield db.collection(collectionInfo.name).deleteMany({});
                }
                // Restore each collection
                const restoredCollections = [];
                for (const [collectionName, documents] of Object.entries(backup.collections)) {
                    if (Array.isArray(documents)) {
                        // Convert string IDs back to ObjectId
                        const documentsWithObjectIds = documents.map((doc) => (Object.assign(Object.assign({}, doc), { _id: new mongoose_1.Types.ObjectId(doc._id) })));
                        if (documentsWithObjectIds.length > 0) {
                            yield db.collection(collectionName).insertMany(documentsWithObjectIds);
                            restoredCollections.push(collectionName);
                        }
                    }
                }
                return {
                    success: true,
                    message: `Database restored successfully. Restored ${restoredCollections.length} collections: ${restoredCollections.join(', ')}`,
                };
            }
            catch (error) {
                if (error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Database restore error:', error);
                throw new common_1.BadRequestException(`Failed to restore database: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Create files backup (local storage only)
     * Path: POST /api/admin/backup/files
     * Note: This is a simplified version. Full implementation would require archiver package.
     */
    createFilesBackup() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // For now, return a message that this feature needs additional setup
                // Full implementation would require archiver package and file system access
                return {
                    success: false,
                    message: 'Files backup requires additional dependencies. Please use manual backup of storage directories.',
                };
            }
            catch (error) {
                console.error('Files backup error:', error);
                throw new common_1.BadRequestException(`Failed to create files backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Restore files from backup
     * Path: POST /api/admin/backup/restore-files
     */
    restoreFiles(file) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!file) {
                    throw new common_1.BadRequestException('No backup file provided');
                }
                // This would require additional dependencies like yauzl or adm-zip
                // For now, return a message that this feature needs implementation
                return {
                    success: false,
                    message: 'File restore functionality requires additional dependencies. Please use manual file extraction.',
                };
            }
            catch (error) {
                if (error instanceof common_1.BadRequestException) {
                    throw error;
                }
                console.error('Files restore error:', error);
                throw new common_1.BadRequestException(`Failed to restore files: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.BackupController = BackupController;
__decorate([
    (0, common_1.Post)('database'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "createDatabaseBackup", null);
__decorate([
    (0, common_1.Post)('restore-database'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "restoreDatabase", null);
__decorate([
    (0, common_1.Post)('files'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "createFilesBackup", null);
__decorate([
    (0, common_1.Post)('restore-files'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('backup')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "restoreFiles", null);
exports.BackupController = BackupController = __decorate([
    (0, common_1.Controller)('admin/backup'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], BackupController);
