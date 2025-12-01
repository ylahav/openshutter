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
exports.TemplateOverridesService = void 0;
class TemplateOverridesService {
    /**
     * Merge template configuration with site config overrides
     */
    static mergeTemplateWithOverrides(baseTemplate, siteConfig) {
        var _a;
        const overrides = siteConfig.template;
        if (!overrides) {
            return Object.assign(Object.assign({}, baseTemplate), { _hasOverrides: false });
        }
        const merged = Object.assign(Object.assign({}, baseTemplate), { _hasOverrides: true });
        // Merge custom colors
        if (overrides.customColors) {
            merged.colors = Object.assign(Object.assign({}, baseTemplate.colors), overrides.customColors);
        }
        // Merge custom fonts
        if (overrides.customFonts) {
            merged.fonts = Object.assign(Object.assign({}, baseTemplate.fonts), overrides.customFonts);
        }
        // Merge custom layout
        if (overrides.customLayout) {
            merged.layout = Object.assign(Object.assign({}, baseTemplate.layout), overrides.customLayout);
        }
        // Merge component visibility overrides
        if (overrides.componentVisibility) {
            merged.visibility = Object.assign(Object.assign({}, baseTemplate.visibility), overrides.componentVisibility);
        }
        // Merge header component configuration overrides
        if (overrides.headerConfig) {
            merged.componentsConfig = Object.assign(Object.assign({}, baseTemplate.componentsConfig), { header: Object.assign(Object.assign({}, (_a = baseTemplate.componentsConfig) === null || _a === void 0 ? void 0 : _a.header), overrides.headerConfig) });
        }
        return merged;
    }
    /**
     * Get template configuration with overrides applied
     */
    static getTemplateWithOverrides(templateName, siteConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Load base template configuration
                const response = yield fetch('/api/admin/templates', { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error('Failed to fetch templates');
                }
                const result = yield response.json();
                if (!(result === null || result === void 0 ? void 0 : result.success) || !Array.isArray(result.data)) {
                    throw new Error('Invalid templates response');
                }
                const baseTemplate = result.data.find((t) => (t === null || t === void 0 ? void 0 : t.templateName) === templateName);
                if (!baseTemplate) {
                    throw new Error(`Template '${templateName}' not found`);
                }
                // Apply overrides from site config
                return this.mergeTemplateWithOverrides(baseTemplate, siteConfig);
            }
            catch (error) {
                console.error('Error loading template with overrides:', error);
                return null;
            }
        });
    }
    /**
     * Update site config with template overrides
     */
    static updateSiteConfigOverrides(siteConfig, templateName, overrides) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return Object.assign(Object.assign({}, siteConfig), { template: Object.assign(Object.assign({}, siteConfig.template), { activeTemplate: templateName, customColors: overrides.customColors ? Object.assign(Object.assign({}, (_a = siteConfig.template) === null || _a === void 0 ? void 0 : _a.customColors), overrides.customColors) : (_b = siteConfig.template) === null || _b === void 0 ? void 0 : _b.customColors, customFonts: overrides.customFonts ? Object.assign(Object.assign({}, (_c = siteConfig.template) === null || _c === void 0 ? void 0 : _c.customFonts), overrides.customFonts) : (_d = siteConfig.template) === null || _d === void 0 ? void 0 : _d.customFonts, customLayout: overrides.customLayout ? Object.assign(Object.assign({}, (_e = siteConfig.template) === null || _e === void 0 ? void 0 : _e.customLayout), overrides.customLayout) : (_f = siteConfig.template) === null || _f === void 0 ? void 0 : _f.customLayout, componentVisibility: overrides.componentVisibility ? Object.assign(Object.assign({}, (_g = siteConfig.template) === null || _g === void 0 ? void 0 : _g.componentVisibility), overrides.componentVisibility) : (_h = siteConfig.template) === null || _h === void 0 ? void 0 : _h.componentVisibility, headerConfig: overrides.headerConfig ? Object.assign(Object.assign({}, (_j = siteConfig.template) === null || _j === void 0 ? void 0 : _j.headerConfig), overrides.headerConfig) : (_k = siteConfig.template) === null || _k === void 0 ? void 0 : _k.headerConfig }) });
    }
    /**
     * Reset template overrides to base template
     */
    static resetTemplateOverrides(siteConfig) {
        var _a;
        return Object.assign(Object.assign({}, siteConfig), { template: {
                activeTemplate: ((_a = siteConfig.template) === null || _a === void 0 ? void 0 : _a.activeTemplate) || 'default',
                customColors: undefined,
                customFonts: undefined,
                customLayout: undefined,
                componentVisibility: undefined,
                headerConfig: undefined
            } });
    }
    /**
     * Check if template has any overrides
     */
    static hasOverrides(siteConfig) {
        const template = siteConfig.template;
        if (!template)
            return false;
        return !!(template.customColors ||
            template.customFonts ||
            template.customLayout ||
            template.componentVisibility ||
            template.headerConfig);
    }
    /**
     * Get only the override values (non-null/undefined)
     */
    static getActiveOverrides(siteConfig) {
        const template = siteConfig.template;
        if (!template)
            return {};
        const overrides = {};
        if (template.customColors) {
            overrides.customColors = template.customColors;
        }
        if (template.customFonts) {
            overrides.customFonts = template.customFonts;
        }
        if (template.customLayout) {
            overrides.customLayout = template.customLayout;
        }
        if (template.componentVisibility) {
            overrides.componentVisibility = template.componentVisibility;
        }
        if (template.headerConfig) {
            overrides.headerConfig = template.headerConfig;
        }
        return overrides;
    }
}
exports.TemplateOverridesService = TemplateOverridesService;
