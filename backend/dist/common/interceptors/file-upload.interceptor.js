"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUploadInterceptor = void 0;
const common_1 = require("@nestjs/common");
let FileUploadInterceptor = class FileUploadInterceptor {
    constructor() {
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/heic',
            'image/heif',
        ];
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const file = request.file;
        if (file) {
            // Validate file size
            if (file.size > this.maxFileSize) {
                throw new common_1.BadRequestException(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
            }
            // Validate MIME type
            if (!this.allowedMimeTypes.includes(file.mimetype)) {
                throw new common_1.BadRequestException(`File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
            }
        }
        return next.handle();
    }
};
exports.FileUploadInterceptor = FileUploadInterceptor;
exports.FileUploadInterceptor = FileUploadInterceptor = __decorate([
    (0, common_1.Injectable)()
], FileUploadInterceptor);
