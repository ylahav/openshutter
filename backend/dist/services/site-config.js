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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.siteConfigService = exports.SiteConfigService = void 0;
const db_1 = require("../config/db");
const multi_lang_1 = require("../types/multi-lang");
const mongoose_1 = __importDefault(require("mongoose"));
class SiteConfigService {
    constructor() {
        this.configCache = null;
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.lastCacheUpdate = 0;
    }
    static getInstance() {
        if (!SiteConfigService.instance) {
            SiteConfigService.instance = new SiteConfigService();
        }
        return SiteConfigService.instance;
    }
    /**
     * Get site configuration
     */
    getConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                yield this.refreshCacheIfNeeded();
            }
            catch (error) {
                // If MongoDB access fails (e.g., authentication error), use default config
                console.warn('Failed to refresh site config cache, using defaults:', error instanceof Error ? error.message : 'Unknown error');
                this.configCache = null;
            }
            if (!this.configCache) {
                // Return default config if none exists or if cache refresh failed
                return this.getDefaultConfig();
            }
            // Merge with default config to ensure all fields exist
            const defaultConfig = this.getDefaultConfig();
            return Object.assign(Object.assign(Object.assign({}, defaultConfig), this.configCache), { 
                // Ensure languages field exists
                languages: this.configCache.languages || defaultConfig.languages, 
                // Handle backward compatibility for title and description
                title: this.configCache.title || defaultConfig.title, description: this.configCache.description || defaultConfig.description, 
                // Ensure contact.socialMedia object is properly structured
                contact: Object.assign(Object.assign(Object.assign({}, defaultConfig.contact), this.configCache.contact), { socialMedia: Object.assign(Object.assign({}, defaultConfig.contact.socialMedia), (((_a = this.configCache.contact) === null || _a === void 0 ? void 0 : _a.socialMedia) || {})) }) });
        });
    }
    /**
     * Update site configuration
     */
    updateConfig(updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, db_1.connectDB)();
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            const collection = db.collection('site_config');
            const updateData = Object.assign(Object.assign({}, updates), { updatedAt: new Date() });
            yield collection.updateOne({}, // Update the first (and only) config document
            { $set: updateData }, { upsert: true });
            // Invalidate cache
            this.invalidateCache();
            // Return updated config
            return yield this.getConfig();
        });
    }
    /**
     * Migrate existing string-based title/description to multi-language format
     */
    migrateToMultiLang(config) {
        var _a, _b;
        // Convert string title to multi-language format
        if (typeof config.title === 'string') {
            config.title = { en: config.title };
        }
        else if (config.title && typeof config.title === 'object') {
            // Clean existing multi-language title
            config.title = multi_lang_1.MultiLangUtils.clean(config.title);
        }
        // Convert string description to multi-language format
        if (typeof config.description === 'string') {
            config.description = { en: config.description };
        }
        else if (config.description && typeof config.description === 'object') {
            // Clean existing multi-language description
            config.description = multi_lang_1.MultiLangUtils.clean(config.description);
        }
        // Convert string metaTitle to multi-language format
        if (config.seo && typeof config.seo.metaTitle === 'string') {
            config.seo.metaTitle = { en: config.seo.metaTitle };
        }
        else if (((_a = config.seo) === null || _a === void 0 ? void 0 : _a.metaTitle) && typeof config.seo.metaTitle === 'object') {
            config.seo.metaTitle = multi_lang_1.MultiLangUtils.clean(config.seo.metaTitle);
        }
        // Convert string metaDescription to multi-language format
        if (config.seo && typeof config.seo.metaDescription === 'string') {
            config.seo.metaDescription = { en: config.seo.metaDescription };
        }
        else if (((_b = config.seo) === null || _b === void 0 ? void 0 : _b.metaDescription) && typeof config.seo.metaDescription === 'object') {
            config.seo.metaDescription = multi_lang_1.MultiLangUtils.clean(config.seo.metaDescription);
        }
        return config;
    }
    /**
     * Initialize default configuration
     */
    initializeDefaultConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, db_1.connectDB)();
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            const collection = db.collection('site_config');
            // Check if config already exists
            const existingConfig = yield collection.findOne({});
            if (existingConfig) {
                // Migrate to multi-language format if needed
                const migratedConfig = this.migrateToMultiLang(existingConfig);
                return migratedConfig;
            }
            // Create default config
            const defaultConfig = this.getDefaultConfig();
            const { _id } = defaultConfig, configWithoutId = __rest(defaultConfig, ["_id"]);
            const result = yield collection.insertOne(configWithoutId);
            return Object.assign(Object.assign({}, defaultConfig), { _id: result.insertedId.toString() });
        });
    }
    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            title: { en: 'OpenShutter Gallery' },
            description: { en: 'A beautiful photo gallery showcasing amazing moments' },
            logo: '',
            favicon: '',
            languages: {
                activeLanguages: ['en', 'he'],
                defaultLanguage: 'en'
            },
            theme: {
                primaryColor: '#0ea5e9',
                secondaryColor: '#64748b',
                backgroundColor: '#ffffff',
                textColor: '#1e293b'
            },
            seo: {
                metaTitle: { en: 'OpenShutter Gallery - Beautiful Photo Gallery' },
                metaDescription: { en: 'Discover amazing photos in our beautiful gallery' },
                metaKeywords: ['gallery', 'photos', 'photography', 'images', 'art']
            },
            contact: {
                email: '',
                phone: '',
                address: { en: '' },
                socialMedia: {
                    facebook: '',
                    instagram: '',
                    twitter: '',
                    linkedin: ''
                }
            },
            homePage: {
                services: [],
                contactTitle: { en: 'Get In Touch' }
            },
            features: {
                enableComments: true,
                enableSharing: true,
                enableDownload: false,
                enableWatermark: false,
                maxUploadSize: '10MB'
            },
            template: {
                activeTemplate: 'modern'
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
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
            var _a;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db) {
                    console.warn('Database connection not established, skipping cache refresh');
                    this.configCache = null;
                    this.lastCacheUpdate = Date.now();
                    return;
                }
                const collection = db.collection('site_config');
                const config = yield collection.findOne({});
                if (config) {
                    // Migrate to multi-language format if needed
                    const migratedConfig = this.migrateToMultiLang(config);
                    // Merge with default config to ensure all fields exist
                    const defaultConfig = this.getDefaultConfig();
                    this.configCache = Object.assign(Object.assign(Object.assign({}, defaultConfig), migratedConfig), { 
                        // Ensure languages field exists
                        languages: migratedConfig.languages || defaultConfig.languages, 
                        // Handle backward compatibility for title and description
                        title: migratedConfig.title || defaultConfig.title, description: migratedConfig.description || defaultConfig.description, 
                        // Ensure contact.socialMedia object is properly structured
                        contact: Object.assign(Object.assign(Object.assign({}, defaultConfig.contact), migratedConfig.contact), { socialMedia: Object.assign(Object.assign({}, defaultConfig.contact.socialMedia), (((_a = migratedConfig.contact) === null || _a === void 0 ? void 0 : _a.socialMedia) || {})) }) });
                }
                else {
                    this.configCache = null;
                }
                this.lastCacheUpdate = Date.now();
            }
            catch (error) {
                // If MongoDB access fails (e.g., authentication error), clear cache and use defaults
                console.warn('Failed to refresh site config cache:', error instanceof Error ? error.message : 'Unknown error');
                this.configCache = null;
                this.lastCacheUpdate = Date.now();
                // Don't throw - allow getConfig() to return default config
            }
        });
    }
    /**
     * Invalidate cache
     */
    invalidateCache() {
        this.configCache = null;
        this.lastCacheUpdate = 0;
    }
}
exports.SiteConfigService = SiteConfigService;
// Export singleton instance
exports.siteConfigService = SiteConfigService.getInstance();
