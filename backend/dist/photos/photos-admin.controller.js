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
exports.PhotosAdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const db_1 = require("../config/db");
const mongoose_1 = __importStar(require("mongoose"));
let PhotosAdminController = class PhotosAdminController {
    /**
     * Get a photo by ID (admin only - includes unpublished)
     * Path: GET /api/admin/photos/:id
     */
    getPhoto(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                let objectId;
                try {
                    objectId = new mongoose_1.Types.ObjectId(id);
                }
                catch (error) {
                    throw new common_1.BadRequestException('Invalid photo ID format');
                }
                const photo = yield db.collection('photos').findOne({ _id: objectId });
                if (!photo) {
                    throw new common_1.NotFoundException('Photo not found');
                }
                // Serialize ObjectIds
                const serialized = Object.assign(Object.assign({}, photo), { _id: photo._id.toString(), albumId: photo.albumId ? photo.albumId.toString() : null, tags: photo.tags
                        ? photo.tags.map((tag) => (tag._id ? tag._id.toString() : tag.toString()))
                        : [], people: photo.people
                        ? photo.people.map((person) => person._id ? person._id.toString() : person.toString())
                        : [], location: photo.location
                        ? photo.location._id
                            ? photo.location._id.toString()
                            : photo.location.toString()
                        : null, uploadedBy: photo.uploadedBy ? photo.uploadedBy.toString() : null });
                // Ensure storage object is properly preserved
                if (photo.storage) {
                    serialized.storage = {
                        provider: photo.storage.provider || 'local',
                        fileId: photo.storage.fileId || '',
                        url: photo.storage.url || '',
                        path: photo.storage.path || '',
                        thumbnailPath: photo.storage.thumbnailPath || photo.storage.url || '',
                        thumbnails: photo.storage.thumbnails || {},
                        blurDataURL: photo.storage.blurDataURL,
                        bucket: photo.storage.bucket,
                        folderId: photo.storage.folderId,
                    };
                }
                return serialized;
            }
            catch (error) {
                console.error('Failed to get photo:', error);
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                throw new Error(`Failed to get photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Update a photo (admin only)
     * Path: PUT /api/admin/photos/:id
     */
    updatePhoto(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                let objectId;
                try {
                    objectId = new mongoose_1.Types.ObjectId(id);
                }
                catch (error) {
                    throw new common_1.BadRequestException('Invalid photo ID format');
                }
                // Check if photo exists
                const photo = yield db.collection('photos').findOne({ _id: objectId });
                if (!photo) {
                    throw new common_1.NotFoundException('Photo not found');
                }
                // Prepare update object
                const update = {
                    updatedAt: new Date(),
                };
                // Update title if provided (handle both string and multilingual formats)
                if (updateData.title !== undefined) {
                    if (typeof updateData.title === 'string') {
                        update.title = updateData.title;
                    }
                    else if (typeof updateData.title === 'object' && updateData.title !== null) {
                        update.title = updateData.title;
                    }
                }
                // Update description if provided
                if (updateData.description !== undefined) {
                    if (typeof updateData.description === 'string') {
                        update.description = updateData.description;
                    }
                    else if (typeof updateData.description === 'object' &&
                        updateData.description !== null) {
                        update.description = updateData.description;
                    }
                    else if (updateData.description === null || updateData.description === '') {
                        update.description = '';
                    }
                }
                // Update boolean flags
                if (updateData.isPublished !== undefined) {
                    update.isPublished = updateData.isPublished;
                }
                if (updateData.isLeading !== undefined) {
                    update.isLeading = updateData.isLeading;
                }
                if (updateData.isGalleryLeading !== undefined) {
                    update.isGalleryLeading = updateData.isGalleryLeading;
                }
                // Update tags if provided (convert string IDs to ObjectIds)
                if (updateData.tags !== undefined && Array.isArray(updateData.tags)) {
                    update.tags = updateData.tags
                        .filter((tagId) => tagId && mongoose_1.Types.ObjectId.isValid(tagId))
                        .map((tagId) => new mongoose_1.Types.ObjectId(tagId));
                }
                // Update people if provided
                if (updateData.people !== undefined && Array.isArray(updateData.people)) {
                    update.people = updateData.people
                        .filter((personId) => personId && mongoose_1.Types.ObjectId.isValid(personId))
                        .map((personId) => new mongoose_1.Types.ObjectId(personId));
                }
                // Update location if provided
                if (updateData.location !== undefined) {
                    if (updateData.location === null || updateData.location === '') {
                        update.location = null;
                    }
                    else if (mongoose_1.Types.ObjectId.isValid(updateData.location)) {
                        update.location = new mongoose_1.Types.ObjectId(updateData.location);
                    }
                    else if (typeof updateData.location === 'object' &&
                        updateData.location._id) {
                        update.location = new mongoose_1.Types.ObjectId(updateData.location._id);
                    }
                }
                // Update EXIF data if provided
                if (updateData.exif !== undefined) {
                    update.exif = updateData.exif;
                }
                // Update metadata if provided
                if (updateData.metadata !== undefined) {
                    update.metadata = updateData.metadata;
                }
                // Perform update
                const result = yield db
                    .collection('photos')
                    .updateOne({ _id: objectId }, { $set: update });
                if (result.matchedCount === 0) {
                    throw new common_1.NotFoundException('Photo not found');
                }
                // Fetch updated photo
                const updatedPhoto = yield db.collection('photos').findOne({ _id: objectId });
                if (!updatedPhoto) {
                    throw new common_1.NotFoundException('Photo not found after update');
                }
                // Serialize ObjectIds
                const serialized = Object.assign(Object.assign({}, updatedPhoto), { _id: updatedPhoto._id.toString(), albumId: updatedPhoto.albumId ? updatedPhoto.albumId.toString() : null, tags: updatedPhoto.tags
                        ? updatedPhoto.tags.map((tag) => tag._id ? tag._id.toString() : tag.toString())
                        : [], people: updatedPhoto.people
                        ? updatedPhoto.people.map((person) => person._id ? person._id.toString() : person.toString())
                        : [], location: updatedPhoto.location
                        ? updatedPhoto.location._id
                            ? updatedPhoto.location._id.toString()
                            : updatedPhoto.location.toString()
                        : null, uploadedBy: updatedPhoto.uploadedBy ? updatedPhoto.uploadedBy.toString() : null });
                // Ensure storage object is properly preserved
                if (updatedPhoto.storage) {
                    serialized.storage = {
                        provider: updatedPhoto.storage.provider || 'local',
                        fileId: updatedPhoto.storage.fileId || '',
                        url: updatedPhoto.storage.url || '',
                        path: updatedPhoto.storage.path || '',
                        thumbnailPath: updatedPhoto.storage.thumbnailPath || updatedPhoto.storage.url || '',
                        thumbnails: updatedPhoto.storage.thumbnails || {},
                        blurDataURL: updatedPhoto.storage.blurDataURL,
                        bucket: updatedPhoto.storage.bucket,
                        folderId: updatedPhoto.storage.folderId,
                    };
                }
                return serialized;
            }
            catch (error) {
                console.error('Failed to update photo:', error);
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                throw new Error(`Failed to update photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Delete a photo (admin only)
     * Path: DELETE /api/admin/photos/:id
     */
    deletePhoto(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                let objectId;
                try {
                    objectId = new mongoose_1.Types.ObjectId(id);
                }
                catch (error) {
                    throw new common_1.BadRequestException('Invalid photo ID format');
                }
                const photo = yield db.collection('photos').findOne({ _id: objectId });
                if (!photo) {
                    throw new common_1.NotFoundException('Photo not found');
                }
                // Delete the photo
                const result = yield db.collection('photos').deleteOne({ _id: objectId });
                if (result.deletedCount === 0) {
                    throw new common_1.NotFoundException('Photo not found');
                }
                // Update album photo count if album exists
                if (photo.albumId) {
                    yield db.collection('albums').updateOne({ _id: photo.albumId }, { $inc: { photoCount: -1 } });
                }
                return { success: true, message: 'Photo deleted successfully' };
            }
            catch (error) {
                console.error('Failed to delete photo:', error);
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                throw new Error(`Failed to delete photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.PhotosAdminController = PhotosAdminController;
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PhotosAdminController.prototype, "getPhoto", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PhotosAdminController.prototype, "updatePhoto", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PhotosAdminController.prototype, "deletePhoto", null);
exports.PhotosAdminController = PhotosAdminController = __decorate([
    (0, common_1.Controller)('admin/photos'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], PhotosAdminController);
