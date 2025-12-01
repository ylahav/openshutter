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
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateConfigService = exports.TemplateConfigService = void 0;
// Static template configurations (moved from template.ts)
const staticTemplates = {
    'default': {
        templateName: 'default',
        displayName: 'Default',
        description: 'Clean and minimal template',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/default/thumbnail.jpg',
        category: 'minimal',
        features: { responsive: true, darkMode: false, animations: true, seoOptimized: true },
        colors: { primary: '#3B82F6', secondary: '#1F2937', accent: '#F59E0B', background: '#FFFFFF', text: '#1F2937', muted: '#6B7280' },
        fonts: { heading: 'Inter', body: 'Inter' },
        layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
        components: {
            hero: 'components/Hero.tsx',
            albumCard: 'components/AlbumCard.tsx',
            photoCard: 'components/PhotoCard.tsx',
            albumList: 'components/AlbumList.tsx',
            gallery: 'components/Gallery.tsx',
            navigation: 'components/Navigation.tsx',
            footer: 'components/Footer.tsx',
        },
        visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
        pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
    },
    'modern': {
        templateName: 'modern',
        displayName: 'Modern',
        description: 'Contemporary and sleek design',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/modern/thumbnail.jpg',
        category: 'modern',
        features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
        colors: { primary: '#3b82f6', secondary: '#6b7280', accent: '#10b981', background: '#ffffff', text: '#111827', muted: '#6b7280' },
        fonts: { heading: 'Inter', body: 'Inter' },
        layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
        components: {
            hero: 'components/Hero.tsx',
            albumCard: 'components/AlbumCard.tsx',
            photoCard: 'components/PhotoCard.tsx',
            albumList: 'components/AlbumList.tsx',
            gallery: 'components/Gallery.tsx',
            navigation: 'components/Navigation.tsx',
            footer: 'components/Footer.tsx',
        },
        visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
        pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
    },
    'fancy': {
        templateName: 'fancy',
        displayName: 'Fancy',
        description: 'Elegant and sophisticated design',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/fancy/thumbnail.jpg',
        category: 'elegant',
        features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
        colors: { primary: '#8b5cf6', secondary: '#a78bfa', accent: '#f59e0b', background: '#ffffff', text: '#1f2937', muted: '#6b7280' },
        fonts: { heading: 'Playfair Display', body: 'Inter' },
        layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
        components: {
            hero: 'components/Hero.tsx',
            albumCard: 'components/AlbumCard.tsx',
            photoCard: 'components/PhotoCard.tsx',
            albumList: 'components/AlbumList.tsx',
            gallery: 'components/Gallery.tsx',
            navigation: 'components/Navigation.tsx',
            footer: 'components/Footer.tsx',
        },
        visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
        pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
    },
    'minimal': {
        templateName: 'minimal',
        displayName: 'Minimal',
        description: 'Ultra-minimal and clean design',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/minimal/thumbnail.jpg',
        category: 'minimal',
        features: { responsive: true, darkMode: false, animations: false, seoOptimized: true },
        colors: { primary: '#000000', secondary: '#6b7280', accent: '#000000', background: '#ffffff', text: '#000000', muted: '#6b7280' },
        fonts: { heading: 'Inter', body: 'Inter' },
        layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1rem' },
        components: {
            hero: 'components/Hero.tsx',
            albumCard: 'components/AlbumCard.tsx',
            photoCard: 'components/PhotoCard.tsx',
            albumList: 'components/AlbumList.tsx',
            gallery: 'components/Gallery.tsx',
            navigation: 'components/Navigation.tsx',
            footer: 'components/Footer.tsx',
        },
        visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
        pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
    }
};
class TemplateConfigService {
    static getInstance() {
        if (!TemplateConfigService.instance) {
            TemplateConfigService.instance = new TemplateConfigService();
        }
        return TemplateConfigService.instance;
    }
    getTemplateConfig(templateName) {
        return staticTemplates[templateName] || staticTemplates['default'] || null;
    }
    /**
     * Get the effective component visibility settings for the current template
     * This merges template defaults with site-specific overrides
     */
    getComponentVisibility(siteConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
            const activeTemplate = ((_a = siteConfig.template) === null || _a === void 0 ? void 0 : _a.activeTemplate) || 'default';
            const templateConfig = this.getTemplateConfig(activeTemplate);
            if (!templateConfig) {
                // Fallback to default settings
                return {
                    hero: true,
                    languageSelector: true,
                    authButtons: true,
                    footerMenu: true,
                    statistics: true,
                    promotion: true
                };
            }
            // Start with template defaults
            const visibility = {
                hero: (_c = (_b = templateConfig.visibility) === null || _b === void 0 ? void 0 : _b.hero) !== null && _c !== void 0 ? _c : true,
                languageSelector: (_e = (_d = templateConfig.visibility) === null || _d === void 0 ? void 0 : _d.languageSelector) !== null && _e !== void 0 ? _e : true,
                authButtons: (_g = (_f = templateConfig.visibility) === null || _f === void 0 ? void 0 : _f.authButtons) !== null && _g !== void 0 ? _g : true,
                footerMenu: (_j = (_h = templateConfig.visibility) === null || _h === void 0 ? void 0 : _h.footerMenu) !== null && _j !== void 0 ? _j : true,
                statistics: (_l = (_k = templateConfig.visibility) === null || _k === void 0 ? void 0 : _k.statistics) !== null && _l !== void 0 ? _l : true,
                promotion: (_o = (_m = templateConfig.visibility) === null || _m === void 0 ? void 0 : _m.promotion) !== null && _o !== void 0 ? _o : true
            };
            // Apply site-specific overrides if they exist
            if ((_p = siteConfig.template) === null || _p === void 0 ? void 0 : _p.componentVisibility) {
                const overrides = siteConfig.template.componentVisibility;
                if (overrides.hero !== undefined) {
                    visibility.hero = overrides.hero;
                }
                if (overrides.languageSelector !== undefined) {
                    visibility.languageSelector = overrides.languageSelector;
                }
                if (overrides.authButtons !== undefined) {
                    visibility.authButtons = overrides.authButtons;
                }
                if (overrides.footerMenu !== undefined) {
                    visibility.footerMenu = overrides.footerMenu;
                }
                if (overrides.statistics !== undefined) {
                    visibility.statistics = overrides.statistics;
                }
                if (overrides.promotion !== undefined) {
                    visibility.promotion = overrides.promotion;
                }
            }
            return visibility;
        });
    }
    /**
     * Update component visibility settings in site config
     */
    updateComponentVisibility(siteConfig, visibility) {
        return __awaiter(this, void 0, void 0, function* () {
            const updatedConfig = Object.assign({}, siteConfig);
            if (!updatedConfig.template) {
                updatedConfig.template = {
                    activeTemplate: 'default'
                };
            }
            if (!updatedConfig.template.componentVisibility) {
                updatedConfig.template.componentVisibility = {};
            }
            // Update only the provided visibility settings
            if (visibility.hero !== undefined) {
                updatedConfig.template.componentVisibility.hero = visibility.hero;
            }
            if (visibility.languageSelector !== undefined) {
                updatedConfig.template.componentVisibility.languageSelector = visibility.languageSelector;
            }
            if (visibility.authButtons !== undefined) {
                updatedConfig.template.componentVisibility.authButtons = visibility.authButtons;
            }
            if (visibility.footerMenu !== undefined) {
                updatedConfig.template.componentVisibility.footerMenu = visibility.footerMenu;
            }
            if (visibility.statistics !== undefined) {
                updatedConfig.template.componentVisibility.statistics = visibility.statistics;
            }
            if (visibility.promotion !== undefined) {
                updatedConfig.template.componentVisibility.promotion = visibility.promotion;
            }
            return updatedConfig;
        });
    }
    /**
     * Reset component visibility to template defaults
     */
    resetToTemplateDefaults(siteConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
            const activeTemplate = ((_a = siteConfig.template) === null || _a === void 0 ? void 0 : _a.activeTemplate) || 'default';
            const templateConfig = this.getTemplateConfig(activeTemplate);
            if (!templateConfig) {
                return siteConfig;
            }
            const updatedConfig = Object.assign({}, siteConfig);
            if (!updatedConfig.template) {
                updatedConfig.template = {
                    activeTemplate: 'default'
                };
            }
            // Reset to template defaults
            updatedConfig.template.componentVisibility = {
                hero: (_c = (_b = templateConfig.visibility) === null || _b === void 0 ? void 0 : _b.hero) !== null && _c !== void 0 ? _c : true,
                languageSelector: (_e = (_d = templateConfig.visibility) === null || _d === void 0 ? void 0 : _d.languageSelector) !== null && _e !== void 0 ? _e : true,
                authButtons: (_g = (_f = templateConfig.visibility) === null || _f === void 0 ? void 0 : _f.authButtons) !== null && _g !== void 0 ? _g : true,
                footerMenu: (_j = (_h = templateConfig.visibility) === null || _h === void 0 ? void 0 : _h.footerMenu) !== null && _j !== void 0 ? _j : true,
                statistics: (_l = (_k = templateConfig.visibility) === null || _k === void 0 ? void 0 : _k.statistics) !== null && _l !== void 0 ? _l : true,
                promotion: (_o = (_m = templateConfig.visibility) === null || _m === void 0 ? void 0 : _m.promotion) !== null && _o !== void 0 ? _o : true
            };
            return updatedConfig;
        });
    }
    /**
     * Get available component visibility options for a template
     */
    getAvailableComponents(templateName) {
        return __awaiter(this, void 0, void 0, function* () {
            const templateConfig = this.getTemplateConfig(templateName);
            if (!templateConfig) {
                return ['hero', 'languageSelector', 'authButtons', 'footerMenu', 'statistics', 'promotion'];
            }
            // Return all available components
            return ['hero', 'languageSelector', 'authButtons', 'footerMenu', 'statistics', 'promotion'];
        });
    }
}
exports.TemplateConfigService = TemplateConfigService;
exports.templateConfigService = TemplateConfigService.getInstance();
