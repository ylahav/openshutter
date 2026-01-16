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
                // Force cache refresh to ensure we have the latest data
                // This is especially important after saves
                const configs = yield config_1.storageConfigService.getAllConfigs();
                // Initialize defaults if no configs exist
                if (!configs || configs.length === 0) {
                    yield config_1.storageConfigService.initializeDefaultConfigs();
                    return yield config_1.storageConfigService.getAllConfigs();
                }
                // Ensure all configs have the proper structure and remove any duplicate top-level fields
                const normalizedConfigs = configs.map(config => {
                    // Create a clean config object with only the fields we want
                    // Remove isEnabled from config object if it exists (it should only be at root level)
                    const rawConfigObj = config.config || {};
                    const { isEnabled: _ } = rawConfigObj, cleanConfigObj = __rest(rawConfigObj, ["isEnabled"]);
                    const cleanConfig = {
                        providerId: config.providerId,
                        name: config.name,
                        isEnabled: config.isEnabled !== undefined ? config.isEnabled : false,
                        config: cleanConfigObj, // Config object without isEnabled
                        createdAt: config.createdAt,
                        updatedAt: config.updatedAt
                    };
                    // Log if we detect duplicate fields (for debugging)
                    const duplicateFields = ['clientId', 'clientSecret', 'refreshToken', 'folderId',
                        'accessKeyId', 'secretAccessKey', 'bucketName', 'region', 'endpoint',
                        'applicationKeyId', 'applicationKey', 'basePath', 'maxFileSize']
                        .filter(field => config[field] !== undefined && config[field] !== '');
                    if (duplicateFields.length > 0) {
                        console.warn(`[getAllConfigs] Found duplicate top-level fields in ${config.providerId}:`, duplicateFields);
                    }
                    // Log if isEnabled was found in config object (shouldn't be there)
                    if (rawConfigObj.isEnabled !== undefined) {
                        console.warn(`[getAllConfigs] Found isEnabled in config object for ${config.providerId}, removing it (should only be at root level)`);
                    }
                    return cleanConfig;
                });
                console.log('[getAllConfigs] Returning configs:', JSON.stringify(normalizedConfigs.map(c => {
                    var _a, _b, _c;
                    return ({
                        providerId: c.providerId,
                        isEnabled: c.isEnabled,
                        hasConfig: !!c.config,
                        configKeys: c.config ? Object.keys(c.config) : [],
                        sampleConfigValue: c.providerId === 'google-drive' ? {
                            clientId: ((_a = c.config) === null || _a === void 0 ? void 0 : _a.clientId) ? `${c.config.clientId.substring(0, 20)}...` : 'missing',
                            hasRefreshToken: !!((_b = c.config) === null || _b === void 0 ? void 0 : _b.refreshToken),
                            hasFolderId: !!((_c = c.config) === null || _c === void 0 ? void 0 : _c.folderId)
                        } : undefined
                    });
                }), null, 2));
                return normalizedConfigs;
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
                // Exclude isEnabled from config object (it's at top level, not in config)
                const { isEnabled: _ } = updates, configUpdates = __rest(updates, ["isEnabled"]);
                // Clean configUpdates to remove any undefined or null values (but keep empty strings for now)
                const cleanedConfigUpdates = {};
                Object.keys(configUpdates).forEach(key => {
                    if (configUpdates[key] !== undefined && configUpdates[key] !== null) {
                        cleanedConfigUpdates[key] = configUpdates[key];
                    }
                });
                // Build clean config object - explicitly remove isEnabled if it exists in existing config
                const existingConfigObj = existingConfig.config || {};
                const { isEnabled: __ } = existingConfigObj, cleanExistingConfig = __rest(existingConfigObj, ["isEnabled"]);
                structuredUpdates.config = Object.assign(Object.assign({}, cleanExistingConfig), cleanedConfigUpdates);
                // Ensure isEnabled is NOT in the config object (it should only be at root level)
                if (structuredUpdates.config.isEnabled !== undefined) {
                    delete structuredUpdates.config.isEnabled;
                }
                // Update the configuration
                // Note: updateConfig will use $set which should only update specified fields
                // But we need to ensure we don't accidentally set empty top-level fields
                yield config_1.storageConfigService.updateConfig(providerId, structuredUpdates);
                // Force cache refresh to ensure we return the latest data
                // The updateConfig already invalidates cache, but we need to ensure it's refreshed
                const updatedConfig = yield config_1.storageConfigService.getConfig(providerId);
                console.log(`[updateConfig] Updated config for ${providerId}:`, {
                    providerId: updatedConfig.providerId,
                    isEnabled: updatedConfig.isEnabled,
                    hasConfig: !!updatedConfig.config,
                    configKeys: updatedConfig.config ? Object.keys(updatedConfig.config) : []
                });
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
            var _a, _b;
            try {
                const config = yield config_1.storageConfigService.getConfig(providerId);
                if (!config.isEnabled) {
                    return {
                        success: false,
                        error: 'Storage provider is not enabled',
                        details: {
                            providerId,
                            isEnabled: config.isEnabled
                        }
                    };
                }
                const storageManager = manager_1.StorageManager.getInstance();
                const provider = yield storageManager.getProvider(providerId);
                // Use validateConnection for testing (more reliable than listFolders)
                try {
                    const isValid = yield provider.validateConnection();
                    if (isValid) {
                        return {
                            success: true,
                            message: 'Connection test successful',
                        };
                    }
                    else {
                        return {
                            success: false,
                            error: 'Connection validation returned false',
                            details: {
                                providerId,
                                message: 'The storage provider validation failed without throwing an error'
                            },
                            suggestions: [
                                'Check that all configuration fields are correct',
                                'Verify that the credentials have the necessary permissions',
                                'Ensure the bucket/service is accessible'
                            ]
                        };
                    }
                }
                catch (error) {
                    // Build detailed error information
                    let errorMessage = 'Unknown error occurred';
                    let errorCode;
                    let errorDetails = {};
                    let suggestions = [];
                    // Check if it's a StorageConnectionError (from Wasabi, AWS S3, Backblaze, etc.)
                    if ((error === null || error === void 0 ? void 0 : error.name) === 'StorageConnectionError' || error instanceof Error && error.constructor.name === 'StorageConnectionError') {
                        errorMessage = error.message;
                        if (error.details) {
                            errorDetails = Object.assign(Object.assign({}, errorDetails), error.details);
                            // Extract suggestions from details if available
                            if (error.details.suggestions && Array.isArray(error.details.suggestions)) {
                                suggestions.push(...error.details.suggestions);
                            }
                        }
                        if (error.code) {
                            errorCode = error.code.toString();
                            errorDetails.code = error.code;
                        }
                    }
                    else if (error instanceof Error) {
                        errorMessage = error.message;
                        errorDetails.message = error.message;
                        if (error.stack) {
                            errorDetails.stack = error.stack;
                        }
                    }
                    // Extract error code and details if available
                    if ((error === null || error === void 0 ? void 0 : error.code) && !errorCode) {
                        errorCode = error.code.toString();
                        errorDetails.code = error.code;
                    }
                    // Extract nested details
                    if ((error === null || error === void 0 ? void 0 : error.details) && !errorDetails.suggestions) {
                        errorDetails = Object.assign(Object.assign({}, errorDetails), error.details);
                    }
                    // Extract Google API specific errors
                    if ((_a = error === null || error === void 0 ? void 0 : error.details) === null || _a === void 0 ? void 0 : _a.googleApiError) {
                        const apiError = error.details.googleApiError;
                        errorCode = apiError.code || errorCode;
                        errorMessage = apiError.message || errorMessage;
                        errorDetails.googleApiError = apiError;
                        // Add suggestions based on error code
                        if (apiError.code === 401 || apiError.status === 401) {
                            suggestions.push('The access token may have expired. Try re-authorizing the application.');
                            suggestions.push('Check that the Client ID and Client Secret are correct.');
                        }
                        else if (apiError.code === 403 || apiError.status === 403) {
                            suggestions.push('The application may not have the required permissions.');
                            suggestions.push('Verify that the OAuth scopes include the necessary Drive permissions.');
                        }
                    }
                    // Extract S3-compatible provider errors (Wasabi, AWS S3, Backblaze)
                    // Suggestions are already extracted above if it's a StorageConnectionError
                    // Add suggestions for authentication errors
                    if (((_b = error === null || error === void 0 ? void 0 : error.details) === null || _b === void 0 ? void 0 : _b.authError) || errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('token')) {
                        suggestions.push('Re-authorize the application by generating a new refresh token.');
                        suggestions.push('Verify that all authentication credentials are correct.');
                    }
                    // Build the response
                    const response = {
                        success: false,
                        error: `Connection test failed: ${errorMessage}`,
                        details: errorDetails
                    };
                    if (errorCode) {
                        response.errorCode = errorCode;
                    }
                    if (suggestions.length > 0) {
                        response.suggestions = suggestions;
                    }
                    return response;
                }
            }
            catch (error) {
                // Build detailed error information for outer catch
                let errorMessage = 'Unknown error occurred';
                let errorDetails = {};
                if (error instanceof Error) {
                    errorMessage = error.message;
                    errorDetails.message = error.message;
                    if (error.stack) {
                        errorDetails.stack = error.stack;
                    }
                }
                if (error === null || error === void 0 ? void 0 : error.code) {
                    errorDetails.code = error.code;
                }
                return {
                    success: false,
                    error: `Failed to test connection: ${errorMessage}`,
                    details: errorDetails
                };
            }
        });
    }
    /**
     * Initialize default storage configurations
     * Path: POST /api/admin/storage/initialize
     *
     * This will:
     * - Create default configs if they don't exist
     * - Clean up existing configs (remove isEnabled from config objects, remove duplicate top-level fields)
     */
    initializeDefaults() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.storageConfigService.initializeDefaultConfigs();
                const configs = yield config_1.storageConfigService.getAllConfigs();
                return {
                    success: true,
                    message: 'Default storage configurations initialized and cleaned up',
                    configs,
                };
            }
            catch (error) {
                throw new common_1.BadRequestException(`Failed to initialize storage configurations: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Clean up existing storage configurations
     * Path: POST /api/admin/storage/cleanup
     *
     * This will:
     * - Remove isEnabled from config objects (it should only be at root level)
     * - Remove duplicate top-level fields (clientId, clientSecret, etc.)
     *
     * Useful for fixing data structure issues in existing deployments.
     */
    cleanupConfigs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield config_1.storageConfigService.cleanupExistingConfigs();
                const configs = yield config_1.storageConfigService.getAllConfigs();
                return {
                    success: true,
                    message: 'Storage configurations cleaned up successfully',
                    configs,
                };
            }
            catch (error) {
                throw new common_1.BadRequestException(`Failed to cleanup storage configurations: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
__decorate([
    (0, common_1.Post)('cleanup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StorageAdminController.prototype, "cleanupConfigs", null);
exports.StorageAdminController = StorageAdminController = __decorate([
    (0, common_1.Controller)('admin/storage'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], StorageAdminController);
