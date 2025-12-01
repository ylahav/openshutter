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
exports.templateService = exports.TemplateService = void 0;
const template_overrides_1 = require("./template-overrides");
class TemplateService {
    constructor() {
        this.templateCache = new Map();
        this.activeTemplate = null;
        this.pageLoaders = null;
    }
    static getInstance() {
        if (!TemplateService.instance) {
            TemplateService.instance = new TemplateService();
        }
        return TemplateService.instance;
    }
    getAvailableTemplates() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch('/api/admin/templates', { cache: 'no-store' });
                if (response.ok) {
                    const result = yield response.json();
                    if ((result === null || result === void 0 ? void 0 : result.success) && Array.isArray(result.data)) {
                        return result.data;
                    }
                }
            }
            catch (error) {
                console.error('Error loading templates:', error);
            }
            return [];
        });
    }
    loadTemplate(templateName) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check cache first
            if (this.templateCache.has(templateName)) {
                return this.templateCache.get(templateName);
            }
            try {
                // Fallback to static config map
                const template = yield this.getTemplateConfig(templateName);
                if (template) {
                    this.templateCache.set(templateName, template);
                    return template;
                }
            }
            catch (error) {
                console.error(`Error loading template ${templateName}:`, error);
            }
            return null;
        });
    }
    // Note: Reading template config files from the filesystem is disabled in client builds
    getActiveTemplate() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log('getActiveTemplate', this.activeTemplate);
            if (this.activeTemplate) {
                return this.activeTemplate;
            }
            try {
                // Use public API instead of admin API
                const response = yield fetch('/api/site-config');
                if (response.ok) {
                    const result = yield response.json();
                    console.log('getActiveTemplate result', result);
                    if (result.success) {
                        const templateName = ((_a = result.data.template) === null || _a === void 0 ? void 0 : _a.activeTemplate) || 'default';
                        const template = yield this.loadTemplate(templateName);
                        if (template) {
                            this.activeTemplate = template;
                            return template;
                        }
                    }
                }
            }
            catch (error) {
                console.error('Error loading active template:', error);
            }
            // Fallback to default template
            return yield this.loadTemplate('default');
        });
    }
    setActiveTemplate(templateName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const template = yield this.loadTemplate(templateName);
                if (!template) {
                    return false;
                }
                // This method is now handled by the API route directly
                // The API route will update the site config
                this.activeTemplate = template;
                this.templateCache.clear(); // Clear cache to force reload
                return true;
            }
            catch (error) {
                console.error('Error setting active template:', error);
                return false;
            }
        });
    }
    getTemplateComponent(templateName, componentName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const template = yield this.loadTemplate(templateName);
                if (!template) {
                    return null;
                }
                const componentPath = template.components[componentName];
                if (componentPath) {
                    try {
                        // Dynamic import needs to be handled differently in backend or these are frontend templates
                        // For now, we'll comment this out as templates are likely frontend-only
                        // const component = await import(`@/templates/${templateName}/${componentPath}`)
                        const component = null;
                        return component.default || component;
                    }
                    catch (e) {
                        // Fall through to default template
                    }
                }
                // Fallback to default component if not defined or import failed
                const defaultTemplate = yield this.getTemplateConfig('default');
                const defaultPath = defaultTemplate === null || defaultTemplate === void 0 ? void 0 : defaultTemplate.components[componentName];
                if (defaultPath) {
                    // const fallback = await import(`@/templates/default/${defaultPath}`)
                    const fallback = null;
                    return fallback.default || fallback;
                }
                return null;
            }
            catch (error) {
                console.error(`Error loading template component ${componentName}:`, error);
                return null;
            }
        });
    }
    buildPageLoaders() {
        // Auto-discover all template page modules using webpack context (lazy mode for code-splitting)
        // Pattern matches: src/templates/<template>/pages/<Page>.tsx|ts
        // Note: path here is relative to this file after compilation
        //       '../templates' resolves to 'src/templates'
        // @ts-ignore - webpack specific API
        const ctx = require.context('../templates', true, /\/pages\/[^/]+\.(tsx|ts)$/i);
        const loaders = {};
        ctx.keys().forEach((key) => {
            // Key example: './modern/pages/Login.tsx'
            const match = key.match(/^\.\/([^/]+)\/pages\/([^/.]+)\.(tsx|ts)$/i);
            if (!match)
                return;
            const [, tName, pName] = match;
            const templateKey = tName.toLowerCase();
            const pageKey = pName.toLowerCase();
            if (!loaders[templateKey])
                loaders[templateKey] = {};
            loaders[templateKey][pageKey] = () => ctx(key);
        });
        return loaders;
    }
    getTemplatePage(templateName, pageName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`getTemplatePage: Loading ${pageName} for template ${templateName}`);
                if (!this.pageLoaders) {
                    this.pageLoaders = this.buildPageLoaders();
                }
                const tplKey = (templateName || 'default').toLowerCase();
                const pageKey = (pageName || '').toLowerCase();
                const byTemplate = this.pageLoaders[tplKey] || this.pageLoaders['default'] || {};
                const loader = byTemplate[pageKey];
                if (loader) {
                    const mod = yield loader();
                    return mod.default || mod;
                }
                // Fallback to default template
                const fallbackByDefault = this.pageLoaders['default'] || {};
                const fallbackLoader = fallbackByDefault[pageKey];
                if (fallbackLoader) {
                    const mod = yield fallbackLoader();
                    return mod.default || mod;
                }
                console.error(`getTemplatePage: No page loader found for ${pageName}`);
                return null;
            }
            catch (error) {
                console.error(`Error loading template page ${pageName}:`, error);
                return null;
            }
        });
    }
    getTemplateConfig(templateName) {
        return __awaiter(this, void 0, void 0, function* () {
            // For public pages, use static template configurations to avoid admin API calls
            // This prevents multiple admin API calls on the homepage
            // Static template configurations for public use (no admin API calls)
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
            // Return the requested template or default
            return staticTemplates[templateName] || staticTemplates['default'];
        });
    }
    /**
     * Get template configuration with site config overrides applied
     */
    getTemplateWithOverrides(templateName, siteConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            return template_overrides_1.TemplateOverridesService.getTemplateWithOverrides(templateName, siteConfig);
        });
    }
    /**
     * Get active template with overrides applied
     */
    getActiveTemplateWithOverrides(siteConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const activeTemplateName = ((_a = siteConfig.template) === null || _a === void 0 ? void 0 : _a.activeTemplate) || 'default';
            return this.getTemplateWithOverrides(activeTemplateName, siteConfig);
        });
    }
    /**
     * Update site config with template overrides
     */
    updateSiteConfigOverrides(siteConfig, templateName, overrides) {
        return template_overrides_1.TemplateOverridesService.updateSiteConfigOverrides(siteConfig, templateName, overrides);
    }
    /**
     * Reset template overrides
     */
    resetTemplateOverrides(siteConfig) {
        return template_overrides_1.TemplateOverridesService.resetTemplateOverrides(siteConfig);
    }
    /**
     * Check if template has overrides
     */
    hasTemplateOverrides(siteConfig) {
        return template_overrides_1.TemplateOverridesService.hasOverrides(siteConfig);
    }
    /**
     * Get active overrides
     */
    getActiveOverrides(siteConfig) {
        return template_overrides_1.TemplateOverridesService.getActiveOverrides(siteConfig);
    }
}
exports.TemplateService = TemplateService;
exports.templateService = TemplateService.getInstance();
