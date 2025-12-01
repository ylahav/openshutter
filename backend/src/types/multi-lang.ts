/**
 * Multi-language field types for OpenShutter
 * Supports both text and HTML content in multiple languages
 */

// Multi-language text field
export interface MultiLangText {
  [languageCode: string]: string
}

// Multi-language HTML field
export interface MultiLangHTML {
  [languageCode: string]: string
}

// Supported languages with their display names and RTL support
export interface LanguageConfig {
  code: string
  name: string
  nativeName: string
  isRTL: boolean
  flag?: string
}

// Default supported languages
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
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
]

// Helper functions for multi-language fields
export const MultiLangUtils = {
  // Get value for a specific language, fallback to first available
  getValue: (field: MultiLangText | MultiLangHTML, languageCode: string): string => {
    if (!field) return ''
    
    // Ensure field is an object
    if (typeof field !== 'object') {
      return ''
    }
    
    // Try to get value for requested language
    if (field[languageCode]) {
      const value = field[languageCode]
      return typeof value === 'string' ? value : ''
    }
    
    // Fallback to first available language
    const firstLanguage = Object.keys(field)[0]
    if (firstLanguage) {
      const value = field[firstLanguage]
      return typeof value === 'string' ? value : ''
    }
    
    return ''
  },

  // Get text value from either a plain string or multi-lang object
  getTextValue: (fieldOrString: string | MultiLangText, languageCode: string): string => {
    if (!fieldOrString) return ''
    if (typeof fieldOrString === 'string') return fieldOrString
    return MultiLangUtils.getValue(fieldOrString, languageCode)
  },

  // Get HTML value from either a plain string or multi-lang object
  // If input is a plain string, wrap it in a paragraph for consistent markup
  getHTMLValue: (fieldOrString: string | MultiLangHTML, languageCode: string): string => {
    if (!fieldOrString) return ''
    if (typeof fieldOrString === 'string') {
      return `<p>${fieldOrString}</p>`
    }
    return MultiLangUtils.getValue(fieldOrString, languageCode)
  },

  // Set value for a specific language
  setValue: (field: MultiLangText | MultiLangHTML, languageCode: string, value: string): MultiLangText | MultiLangHTML => {
    // Filter out non-language keys (like numeric indices) and only keep valid language codes
    const validLanguages = SUPPORTED_LANGUAGES.map(lang => lang.code)
    const filteredField = Object.keys(field || {}).reduce((acc, key) => {
      if (validLanguages.includes(key)) {
        acc[key] = field[key]
      }
      return acc
    }, {} as MultiLangText | MultiLangHTML)
    
    return {
      ...filteredField,
      [languageCode]: value
    }
  },

  // Check if field has content for a language
  hasContent: (field: MultiLangText | MultiLangHTML, languageCode: string): boolean => {
    return !!(field && field[languageCode] && field[languageCode].trim())
  },

  // Get all languages that have content
  getLanguagesWithContent: (field: MultiLangText | MultiLangHTML): string[] => {
    if (!field) return []
    
    const validLanguages = SUPPORTED_LANGUAGES.map(lang => lang.code)
    return Object.keys(field).filter(lang => 
      validLanguages.includes(lang) && field[lang] && field[lang].trim()
    )
  },

  // Create empty multi-language field
  createEmpty: (): MultiLangText => ({}),

  // Create multi-language field with default language
  createWithDefault: (defaultLanguage: string, defaultValue: string): MultiLangText => ({
    [defaultLanguage]: defaultValue
  }),

  // Clean field by removing invalid keys
  clean: (field: MultiLangText | MultiLangHTML): MultiLangText | MultiLangHTML => {
    if (!field) return {}
    
    const validLanguages = SUPPORTED_LANGUAGES.map(lang => lang.code)
    return Object.keys(field).reduce((acc, key) => {
      if (validLanguages.includes(key)) {
        acc[key] = field[key]
      }
      return acc
    }, {} as MultiLangText | MultiLangHTML)
  }
}

// Type for language selection
export type LanguageCode = string

// Default language for the application
export const DEFAULT_LANGUAGE: LanguageCode = 'en'
