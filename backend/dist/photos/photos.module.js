"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotosModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const photos_controller_1 = require("./photos.controller");
const photos_service_1 = require("./photos.service");
const Photo_1 = require("../models/Photo");
const Tag_1 = require("../models/Tag");
const Person_1 = require("../models/Person");
const Location_1 = require("../models/Location");
const photo_upload_1 = require("../services/photo-upload");
let PhotosModule = class PhotosModule {
};
exports.PhotosModule = PhotosModule;
exports.PhotosModule = PhotosModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'Photo', schema: Photo_1.PhotoSchema },
                { name: 'Tag', schema: Tag_1.TagSchema },
                { name: 'Person', schema: Person_1.PersonSchema },
                { name: 'Location', schema: Location_1.LocationSchema },
            ]),
        ],
        controllers: [photos_controller_1.PhotosController],
        providers: [photos_service_1.PhotosService, photo_upload_1.PhotoUploadService],
        exports: [photos_service_1.PhotosService],
    })
], PhotosModule);
