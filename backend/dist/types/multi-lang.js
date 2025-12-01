"use strict";
/**
 * Multi-language field types for OpenShutter
 * Supports both text and HTML content in multiple languages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LANGUAGE = exports.MultiLangUtils = exports.SUPPORTED_LANGUAGES = void 0;
// Default supported languages
exports.SUPPORTED_LANGUAGES = [
    {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        isRTL: false,
        flag: '🇺🇸'
    },
    {
        code: 'he',
        name: 'Hebrew',
        nativeName: 'עברית',
        isRTL: true,
        flag: '🇮🇱'
    },
    {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        isRTL: true,
        flag: '🇸🇦'
    },
    {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        isRTL: false,
        flag: '🇪🇸'
    },
    {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        isRTL: false,
        flag: '🇫🇷'
    },
    {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        isRTL: false,
        flag: '🇩🇪'
    }
];
// Helper functions for multi-language fields
exports.MultiLangUtils = {
    // Get value for a specific language, fallback to first available
    getValue: (field, languageCode) => {
        if (!field)
            return '';
        // Ensure field is an object
        if (typeof field !== 'object') {
            return '';
        }
        // Try to get value for requested language
        if (field[languageCode]) {
            const value = field[languageCode];
            return typeof value === 'string' ? value : '';
        }
        // Fallback to first available language
        const firstLanguage = Object.keys(field)[0];
        if (firstLanguage) {
            const value = field[firstLanguage];
            return typeof value === 'string' ? value : '';
        }
        return '';
    },
    // Get text value from either a plain string or multi-lang object
    getTextValue: (fieldOrString, languageCode) => {
        if (!fieldOrString)
            return '';
        if (typeof fieldOrString === 'string')
            return fieldOrString;
        return exports.MultiLangUtils.getValue(fieldOrString, languageCode);
    },
    // Get HTML value from either a plain string or multi-lang object
    // If input is a plain string, wrap it in a paragraph for consistent markup
    getHTMLValue: (fieldOrString, languageCode) => {
        if (!fieldOrString)
            return '';
        if (typeof fieldOrString === 'string') {
            return `<p>${fieldOrString}</p>`;
        }
        return exports.MultiLangUtils.getValue(fieldOrString, languageCode);
    },
    // Set value for a specific language
    setValue: (field, languageCode, value) => {
        // Filter out non-language keys (like numeric indices) and only keep valid language codes
        const validLanguages = exports.SUPPORTED_LANGUAGES.map(lang => lang.code);
        const filteredField = Object.keys(field || {}).reduce((acc, key) => {
            if (validLanguages.includes(key)) {
                acc[key] = field[key];
            }
            return acc;
        }, {});
        return Object.assign(Object.assign({}, filteredField), { [languageCode]: value });
    },
    // Check if field has content for a language
    hasContent: (field, languageCode) => {
        return !!(field && field[languageCode] && field[languageCode].trim());
    },
    // Get all languages that have content
    getLanguagesWithContent: (field) => {
        if (!field)
            return [];
        const validLanguages = exports.SUPPORTED_LANGUAGES.map(lang => lang.code);
        return Object.keys(field).filter(lang => validLanguages.includes(lang) && field[lang] && field[lang].trim());
    },
    // Create empty multi-language field
    createEmpty: () => ({}),
    // Create multi-language field with default language
    createWithDefault: (defaultLanguage, defaultValue) => ({
        [defaultLanguage]: defaultValue
    }),
    // Clean field by removing invalid keys
    clean: (field) => {
        if (!field)
            return {};
        const validLanguages = exports.SUPPORTED_LANGUAGES.map(lang => lang.code);
        return Object.keys(field).reduce((acc, key) => {
            if (validLanguages.includes(key)) {
                acc[key] = field[key];
            }
            return acc;
        }, {});
    }
};
// Default language for the application
exports.DEFAULT_LANGUAGE = 'en';
