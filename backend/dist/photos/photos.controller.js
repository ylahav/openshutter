"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
exports.PhotosController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const photos_service_1 = require("./photos.service");
const photo_upload_1 = require("../services/photo-upload");
const file_upload_interceptor_1 = require("../common/interceptors/file-upload.interceptor");
let PhotosController = class PhotosController {
    constructor(photosService, photoUploadService) {
        this.photosService = photosService;
        this.photoUploadService = photoUploadService;
    }
    findAll(page, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            const pageNum = page ? parseInt(page, 10) || 1 : 1;
            const limitNum = limit ? parseInt(limit, 10) || 20 : 20;
            return this.photosService.findAll(pageNum, limitNum);
        });
    }
    findOne(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.photosService.findOne(id);
        });
    }
    upload(file, albumId, title, description, tags) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!file) {
                throw new common_1.BadRequestException('No file provided');
            }
            const result = yield this.photoUploadService.uploadPhoto(file.buffer, file.originalname, file.mimetype, {
                albumId,
                title,
                description,
                tags: tags ? JSON.parse(tags) : [],
            });
            if (!result.success) {
                throw new common_1.BadRequestException(result.error || 'Upload failed');
            }
            return result.photo;
        });
    }
};
exports.PhotosController = PhotosController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PhotosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PhotosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: {
            fileSize: 100 * 1024 * 1024, // 100MB
        },
    }), file_upload_interceptor_1.FileUploadInterceptor),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Query)('albumId')),
    __param(2, (0, common_1.Query)('title')),
    __param(3, (0, common_1.Query)('description')),
    __param(4, (0, common_1.Query)('tags')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], PhotosController.prototype, "upload", null);
exports.PhotosController = PhotosController = __decorate([
    (0, common_1.Controller)('photos'),
    __metadata("design:paramtypes", [photos_service_1.PhotosService,
        photo_upload_1.PhotoUploadService])
], PhotosController);
