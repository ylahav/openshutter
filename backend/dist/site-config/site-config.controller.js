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
exports.SiteConfigController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const site_config_1 = require("../services/site-config");
const manager_1 = require("../services/storage/manager");
const uuid_1 = require("uuid");
let SiteConfigController = class SiteConfigController {
    /**
     * Public endpoint to get the current site configuration.
     *
     * Path: GET /api/site-config
     */
    getConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield site_config_1.siteConfigService.getConfig();
            // Return the same shape the frontend expects (direct config object)
            return {
                title: config.title,
                description: config.description,
                logo: config.logo,
                favicon: config.favicon,
                languages: config.languages,
                theme: config.theme,
                seo: config.seo,
                contact: config.contact,
                homePage: config.homePage,
                features: config.features,
                template: config.template,
            };
        });
    }
    /**
     * Admin endpoint to get site configuration.
     *
     * Path: GET /api/admin/site-config
     */
    getAdminConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield site_config_1.siteConfigService.getConfig();
            return {
                title: config.title,
                description: config.description,
                logo: config.logo,
                favicon: config.favicon,
                languages: config.languages,
                theme: config.theme,
                seo: config.seo,
                contact: config.contact,
                homePage: config.homePage,
                features: config.features,
                template: config.template,
            };
        });
    }
    /**
     * Admin endpoint to update site configuration.
     *
     * Path: PUT /api/admin/site-config
     */
    updateConfig(updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield site_config_1.siteConfigService.updateConfig(updates);
            return {
                title: config.title,
                description: config.description,
                logo: config.logo,
                favicon: config.favicon,
                languages: config.languages,
                theme: config.theme,
                seo: config.seo,
                contact: config.contact,
                homePage: config.homePage,
                features: config.features,
                template: config.template,
            };
        });
    }
    /**
     * Admin endpoint to upload assets (logo, favicon, etc.).
     *
     * Path: POST /api/admin/site-config/upload-asset
     */
    uploadAsset(file) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!file) {
                throw new common_1.BadRequestException('No file provided');
            }
            // Validate file type (images only)
            const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
            if (!allowedMimeTypes.includes(file.mimetype)) {
                throw new common_1.BadRequestException(`File type ${file.mimetype} is not allowed. Allowed types: images only`);
            }
            try {
                // Generate unique filename
                const fileExtension = file.originalname.split('.').pop() || 'png';
                const filename = `asset-${(0, uuid_1.v4)()}.${fileExtension}`;
                // Upload file using storage manager
                const storageManager = manager_1.StorageManager.getInstance();
                const defaultProvider = (process.env.STORAGE_PROVIDER || 'local');
                const filePath = `site-assets/${filename}`;
                const uploadResult = yield storageManager.uploadBuffer(file.buffer, filePath, defaultProvider, file.mimetype);
                // Return the URL
                return {
                    url: `/api/storage/serve/${uploadResult.provider}/${encodeURIComponent(uploadResult.path)}`,
                    path: uploadResult.path,
                    filename: filename
                };
            }
            catch (error) {
                console.error('Asset upload failed:', error);
                throw new common_1.BadRequestException(`Failed to upload asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Admin endpoint to get available languages.
     *
     * Path: GET /api/admin/languages
     */
    getAvailableLanguages() {
        return __awaiter(this, void 0, void 0, function* () {
            // Return supported languages with metadata
            return [
                { code: 'en', name: 'English', flag: '🇺🇸' },
                { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
                { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
                { code: 'es', name: 'Spanish', flag: '🇪🇸' },
                { code: 'fr', name: 'French', flag: '🇫🇷' },
                { code: 'de', name: 'German', flag: '🇩🇪' },
                { code: 'it', name: 'Italian', flag: '🇮🇹' },
                { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
                { code: 'ru', name: 'Russian', flag: '🇷🇺' },
                { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
                { code: 'ko', name: 'Korean', flag: '🇰🇷' },
                { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
                { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
                { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
                { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
                { code: 'da', name: 'Danish', flag: '🇩🇰' },
                { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
                { code: 'pl', name: 'Polish', flag: '🇵🇱' },
                { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
                { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
            ];
        });
    }
};
exports.SiteConfigController = SiteConfigController;
__decorate([
    (0, common_1.Get)('site-config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SiteConfigController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Get)('admin/site-config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SiteConfigController.prototype, "getAdminConfig", null);
__decorate([
    (0, common_1.Put)('admin/site-config'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SiteConfigController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Post)('admin/site-config/upload-asset'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB limit for assets
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SiteConfigController.prototype, "uploadAsset", null);
__decorate([
    (0, common_1.Get)('admin/languages'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SiteConfigController.prototype, "getAvailableLanguages", null);
exports.SiteConfigController = SiteConfigController = __decorate([
    (0, common_1.Controller)()
], SiteConfigController);
