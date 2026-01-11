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
exports.StorageAdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const config_1 = require("../services/storage/config");
const manager_1 = require("../services/storage/manager");
let StorageAdminController = class StorageAdminController {
    /**
     * Get all storage configurations
     * Path: GET /api/admin/storage
     */
    getAllConfigs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Initialize defaults if no configs exist
                const configs = yield config_1.storageConfigService.getAllConfigs();
                if (!configs || configs.length === 0) {
                    yield config_1.storageConfigService.initializeDefaultConfigs();
                    return yield config_1.storageConfigService.getAllConfigs();
                }
                return configs;
            }
            catch (error) {
                console.error('Error getting storage configs:', error);
                throw new common_1.BadRequestException(`Failed to get storage configurations: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Get configuration for a specific provider
     * Path: GET /api/admin/storage/:providerId
     */
    getConfig(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const config = yield config_1.storageConfigService.getConfig(providerId);
                return config;
            }
            catch (_error) {
                throw new common_1.BadRequestException(`Storage provider not found: ${providerId}`);
            }
        });
    }
    /**
     * Update storage configuration
     * Path: PUT /api/admin/storage/:providerId
     */
    updateConfig(providerId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get existing config or initialize defaults if it doesn't exist
                let existingConfig;
                try {
                    existingConfig = yield config_1.storageConfigService.getConfig(providerId);
                }
                catch (error) {
                    // Config doesn't exist, initialize defaults first
                    yield config_1.storageConfigService.initializeDefaultConfigs();
                    try {
                        existingConfig = yield config_1.storageConfigService.getConfig(providerId);
                    }
                    catch (secondError) {
                        // If config still doesn't exist after initialization, create a minimal one
                        console.warn(`Config for ${providerId} not found after initialization, creating minimal config`);
                        const providerNames = {
                            'google-drive': 'Google Drive',
                            'aws-s3': 'Amazon S3',
                            'backblaze': 'Backblaze B2',
                            'wasabi': 'Wasabi',
                            'local': 'Local Storage'
                        };
                        existingConfig = {
                            providerId: providerId,
                            name: providerNames[providerId] || providerId,
                            isEnabled: false,
                            config: {},
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                    }
                }
                // The frontend sends config fields directly (e.g., { clientId, clientSecret, isEnabled })
                // We need to structure it properly: { isEnabled, config: { clientId, clientSecret, ... } }
                const structuredUpdates = {
                    providerId: providerId,
                    name: existingConfig.name, // Preserve existing name
                };
                // Extract isEnabled if provided (can be at top level or in config)
                if (updates.isEnabled !== undefined) {
                    structuredUpdates.isEnabled = updates.isEnabled;
                }
                else if (existingConfig.isEnabled !== undefined) {
                    structuredUpdates.isEnabled = existingConfig.isEnabled;
                }
                // Build the config object - merge existing config with updates
                // Exclude isEnabled from config object (it's at top level)
                const { isEnabled: _ } = updates, configUpdates = __rest(updates, ["isEnabled"]);
                structuredUpdates.config = Object.assign(Object.assign({}, existingConfig.config), configUpdates);
                // Update the configuration
                yield config_1.storageConfigService.updateConfig(providerId, structuredUpdates);
                const updatedConfig = yield config_1.storageConfigService.getConfig(providerId);
                return updatedConfig;
            }
            catch (error) {
                console.error('Error updating storage config:', error);
                throw new common_1.BadRequestException(`Failed to update storage configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Test storage connection
     * Path: POST /api/admin/storage/:providerId/test
     */
    testConnection(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const config = yield config_1.storageConfigService.getConfig(providerId);
                if (!config.isEnabled) {
                    return {
                        success: false,
                        error: 'Storage provider is not enabled',
                    };
                }
                const storageManager = manager_1.StorageManager.getInstance();
                const provider = yield storageManager.getProvider(providerId);
                // Try to list folders or perform a simple operation
                try {
                    yield provider.listFolders('');
                    return {
                        success: true,
                        message: 'Connection test successful',
                    };
                }
                catch (error) {
                    return {
                        success: false,
                        error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    };
                }
            }
            catch (error) {
                return {
                    success: false,
                    error: `Failed to test connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
                };
            }
        });
    }
    /**
     * Initialize default storage configurations
     * Path: POST /api/admin/storage/initialize
     */
    initializeDefaults() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.storageConfigService.initializeDefaultConfigs();
                const configs = yield config_1.storageConfigService.getAllConfigs();
                return {
                    success: true,
                    message: 'Default storage configurations initialized',
                    configs,
                };
            }
            catch (error) {
                throw new common_1.BadRequestException(`Failed to initialize storage configurations: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.StorageAdminController = StorageAdminController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StorageAdminController.prototype, "getAllConfigs", null);
__decorate([
    (0, common_1.Get)(':providerId'),
    __param(0, (0, common_1.Param)('providerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorageAdminController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Put)(':providerId'),
    __param(0, (0, common_1.Param)('providerId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageAdminController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Post)(':providerId/test'),
    __param(0, (0, common_1.Param)('providerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorageAdminController.prototype, "testConnection", null);
__decorate([
    (0, common_1.Post)('initialize'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StorageAdminController.prototype, "initializeDefaults", null);
exports.StorageAdminController = StorageAdminController = __decorate([
    (0, common_1.Controller)('admin/storage'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], StorageAdminController);
