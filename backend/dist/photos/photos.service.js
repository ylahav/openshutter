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
exports.PhotosService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let PhotosService = class PhotosService {
    constructor(photoModel) {
        this.photoModel = photoModel;
    }
    /**
     * Get gallery-leading photos for hero/landing pages.
     * Returns photos with isGalleryLeading + isPublished sorted by uploadedAt desc.
     */
    findGalleryLeading() {
        return __awaiter(this, arguments, void 0, function* (limit = 5) {
            const photos = yield this.photoModel
                .find({
                isGalleryLeading: true,
                isPublished: true,
            })
                .sort({ uploadedAt: -1 })
                .limit(limit)
                .exec();
            return photos;
        });
    }
    findAll() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 20) {
            const skip = (page - 1) * limit;
            const photos = yield this.photoModel
                .find({ isPublished: true })
                .sort({ uploadedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('albumId', 'name alias')
                .populate('uploadedBy', 'name')
                .exec();
            const total = yield this.photoModel.countDocuments({ isPublished: true });
            return {
                photos,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        });
    }
    findOne(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const photo = yield this.photoModel
                .findById(id)
                .populate('albumId')
                .populate('tags')
                .populate('people')
                .populate('location')
                .populate('uploadedBy', 'name username')
                .exec();
            if (!photo) {
                throw new common_1.NotFoundException('Photo not found');
            }
            return photo;
        });
    }
};
exports.PhotosService = PhotosService;
exports.PhotosService = PhotosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Photo')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], PhotosService);
