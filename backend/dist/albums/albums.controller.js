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
exports.AlbumsController = void 0;
const common_1 = require("@nestjs/common");
const albums_service_1 = require("./albums.service");
let AlbumsController = class AlbumsController {
    constructor(albumsService) {
        this.albumsService = albumsService;
    }
    findAll(parentId, level) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.albumsService.findAll(parentId, level);
        });
    }
    findByAlias(alias) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.albumsService.findByAlias(alias);
        });
    }
    findPhotos(id, page, limit) {
        return __awaiter(this, void 0, void 0, function* () {
            const pageNum = page ? parseInt(page, 10) || 1 : 1;
            const limitNum = limit ? parseInt(limit, 10) || 50 : 50;
            return this.albumsService.findPhotosByAlbumId(id, pageNum, limitNum);
        });
    }
    findOne(idOrAlias) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.albumsService.findOneByIdOrAlias(idOrAlias);
        });
    }
};
exports.AlbumsController = AlbumsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('parentId')),
    __param(1, (0, common_1.Query)('level')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AlbumsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('by-alias/:alias'),
    __param(0, (0, common_1.Param)('alias')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AlbumsController.prototype, "findByAlias", null);
__decorate([
    (0, common_1.Get)(':id/photos'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AlbumsController.prototype, "findPhotos", null);
__decorate([
    (0, common_1.Get)(':idOrAlias'),
    __param(0, (0, common_1.Param)('idOrAlias')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AlbumsController.prototype, "findOne", null);
exports.AlbumsController = AlbumsController = __decorate([
    (0, common_1.Controller)('albums'),
    __metadata("design:paramtypes", [albums_service_1.AlbumsService])
], AlbumsController);
