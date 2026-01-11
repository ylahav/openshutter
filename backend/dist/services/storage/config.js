"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageConfigService = exports.StorageConfigService = void 0;
const db_1 = require("../../config/db");
const mongoose_1 = __importDefault(require("mongoose"));
const types_1 = require("./types");
class StorageConfigService {
    constructor() {
        this.configCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.lastCacheUpdate = 0;
    }
    static getInstance() {
        if (!StorageConfigService.instance) {
            StorageConfigService.instance = new StorageConfigService();
        }
        return StorageConfigService.instance;
    }
    /**
     * Get all storage configurations
     */
    getAllConfigs() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshCacheIfNeeded();
            return Array.from(this.configCache.values());
        });
    }
    /**
     * Get configuration for a specific provider
     */
    getConfig(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshCacheIfNeeded();
            const config = this.configCache.get(providerId);
            if (!config) {
                throw new types_1.StorageConfigError(`Configuration not found for provider: ${providerId}`, providerId);
            }
            return config;
        });
    }
    /**
     * Get active storage providers
     */
    getActiveProviders() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshCacheIfNeeded();
            return Array.from(this.configCache.values())
                .filter(config => config.isEnabled)
                .map(config => config.providerId);
        });
    }
    /**
     * Check if a provider is enabled
     */
    isProviderEnabled(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const config = yield this.getConfig(providerId);
                return config.isEnabled;
            }
            catch (error) {
                return false;
            }
        });
    }
    /**
     * Update storage configuration
     */
    updateConfig(providerId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, db_1.connectDB)();
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            const collection = db.collection('storage_configs');
            const updateData = Object.assign(Object.assign({}, updates), { updatedAt: new Date() });
            // Ensure providerId is set
            if (!updateData.providerId) {
                updateData.providerId = providerId;
            }
            // Set createdAt if this is a new document
            const existing = yield collection.findOne({ providerId });
            if (!existing && !updateData.createdAt) {
                updateData.createdAt = new Date();
            }
            console.log(`[StorageConfigService] Updating config for ${providerId}:`, JSON.stringify(updateData, null, 2));
            // Use upsert to create if it doesn't exist
            const result = yield collection.updateOne({ providerId }, { $set: updateData }, { upsert: true });
            console.log(`[StorageConfigService] Update result for ${providerId}:`, {
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount,
                upsertedCount: result.upsertedCount
            });
            // Invalidate cache
            this.invalidateCache();
        });
    }
    /**
     * Create or update multiple configurations
     */
    upsertConfigs(configs) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, db_1.connectDB)();
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            const collection = db.collection('storage_configs');
            const operations = configs.map(config => ({
                updateOne: {
                    filter: { providerId: config.providerId },
                    update: {
                        $set: Object.assign(Object.assign({}, config), { updatedAt: new Date() })
                    },
                    upsert: true
                }
            }));
            yield collection.bulkWrite(operations);
            // Invalidate cache
            this.invalidateCache();
        });
    }
    /**
     * Initialize default configurations if they don't exist
     */
    initializeDefaultConfigs() {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, db_1.connectDB)();
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            const collection = db.collection('storage_configs');
            const defaultConfigs = [
                {
                    providerId: 'google-drive',
                    name: 'Google Drive',
                    isEnabled: false,
                    config: {
                        clientId: '',
                        clientSecret: '',
                        refreshToken: '',
                        folderId: '',
                        isEnabled: false
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    providerId: 'aws-s3',
                    name: 'Amazon S3',
                    isEnabled: false,
                    config: {
                        accessKeyId: '',
                        secretAccessKey: '',
                        region: 'us-east-1',
                        bucketName: '',
                        isEnabled: false
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    providerId: 'backblaze',
                    name: 'Backblaze B2',
                    isEnabled: false,
                    config: {
                        applicationKeyId: '',
                        applicationKey: '',
                        bucketName: '',
                        region: 'us-west-2',
                        endpoint: '',
                        isEnabled: false
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    providerId: 'wasabi',
                    name: 'Wasabi',
                    isEnabled: false,
                    config: {
                        accessKeyId: '',
                        secretAccessKey: '',
                        bucketName: '',
                        region: 'us-east-1',
                        endpoint: '',
                        isEnabled: false
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    providerId: 'local',
                    name: 'Local Storage',
                    isEnabled: false,
                    config: {
                        basePath: process.env.LOCAL_STORAGE_PATH || '/app/public/albums',
                        maxFileSize: '100MB',
                        isEnabled: false
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];
            // Check which configs already exist
            const existingConfigs = yield collection.find({}).toArray();
            const existingProviderIds = existingConfigs.map(config => config.providerId);
            const configsToInsert = defaultConfigs.filter(config => !existingProviderIds.includes(config.providerId));
            if (configsToInsert.length > 0) {
                yield collection.insertMany(configsToInsert);
                this.invalidateCache();
            }
        });
    }
    /**
     * Validate configuration for a provider
     */
    validateConfig(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const config = yield this.getConfig(providerId);
                const errors = [];
                if (!config.isEnabled) {
                    errors.push('Provider is not enabled');
                }
                // Provider-specific validation
                switch (providerId) {
                    case 'google-drive':
                        if (!config.config.clientId)
                            errors.push('Client ID is required');
                        if (!config.config.clientSecret)
                            errors.push('Client Secret is required');
                        if (!config.config.refreshToken)
                            errors.push('Refresh Token is required');
                        break;
                    case 'aws-s3':
                        if (!config.config.accessKeyId)
                            errors.push('Access Key ID is required');
                        if (!config.config.secretAccessKey)
                            errors.push('Secret Access Key is required');
                        if (!config.config.bucketName)
                            errors.push('Bucket Name is required');
                        break;
                    case 'local':
                        if (!config.config.basePath)
                            errors.push('Base Path is required');
                        break;
                }
                return {
                    isValid: errors.length === 0,
                    errors
                };
            }
            catch (error) {
                return {
                    isValid: false,
                    errors: ['Configuration not found']
                };
            }
        });
    }
    /**
     * Refresh cache if needed
     */
    refreshCacheIfNeeded() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            if (now - this.lastCacheUpdate > this.cacheExpiry) {
                yield this.refreshCache();
            }
        });
    }
    /**
     * Refresh configuration cache
     */
    refreshCache() {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, db_1.connectDB)();
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            const collection = db.collection('storage_configs');
            const configs = yield collection.find({}).toArray();
            this.configCache.clear();
            configs.forEach(config => {
                this.configCache.set(config.providerId, config);
            });
            this.lastCacheUpdate = Date.now();
        });
    }
    /**
     * Invalidate cache
     */
    invalidateCache() {
        this.configCache.clear();
        this.lastCacheUpdate = 0;
    }
}
exports.StorageConfigService = StorageConfigService;
// Export singleton instance
exports.storageConfigService = StorageConfigService.getInstance();
