'use client'

import { useState } from 'react'
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/types/multi-lang'
import { useSiteConfig } from '@/hooks/useSiteConfig'

interface LanguageSelectorProps {
  currentLanguage: LanguageCode
  onLanguageChange: (language: LanguageCode) => void
  className?: string
  showFlags?: boolean
  showNativeNames?: boolean
  compact?: boolean
}

export function LanguageSelector({
  currentLanguage,
  onLanguageChange,
  className = '',
  showFlags = true,
  showNativeNames = true,
  compact = false
}: LanguageSelectorProps) {
  const { config } = useSiteConfig()
  const [isOpen, setIsOpen] = useState(false)

  // Get active languages from site config, fallback to all supported languages
  const activeLanguages = config?.languages?.activeLanguages || ['en']
  const availableLanguages = SUPPORTED_LANGUAGES.filter(lang => 
    activeLanguages.includes(lang.code)
  )

  // Find current language config, with fallback to all supported languages if not found in available
  let currentLangConfig = availableLanguages.find(lang => lang.code === currentLanguage)
  if (!currentLangConfig) {
    // Fallback to all supported languages if current language is not in active languages
    currentLangConfig = SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage)
  }

  const handleLanguageSelect = (languageCode: LanguageCode) => {
    onLanguageChange(languageCode)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Current Language Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm
          bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors text-gray-900
          ${compact ? 'text-sm' : 'text-base'}
        `}
        style={{ color: '#111827' }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {showFlags && (
          <span className="text-lg">{currentLangConfig?.flag}</span>
        )}
        
        <span className="font-medium text-gray-900">
          {currentLanguage === 'he' ? currentLangConfig?.name : (showNativeNames ? currentLangConfig?.nativeName : currentLangConfig?.name)}
        </span>
        
        {currentLangConfig?.isRTL && currentLanguage !== 'he' && (
          <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">RTL</span>
        )}
        
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Language Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
            <ul className="py-1">
              {availableLanguages.map((language) => {
                const isSelected = language.code === currentLanguage
                const isRTL = language.isRTL
                
                return (
                  <li key={language.code}>
                    <button
                      type="button"
                      onClick={() => handleLanguageSelect(language.code)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50
                        transition-colors
                        ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
                        ${compact ? 'text-sm' : 'text-base'}
                      `}
                      style={{ color: isSelected ? '#1d4ed8' : '#111827' }}
                    >
                      {showFlags && (
                        <span className="text-lg">{language.flag}</span>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate" style={{ color: isSelected ? '#1d4ed8' : '#111827' }}>
                            {currentLanguage === 'he' ? language.name : (showNativeNames ? language.nativeName : language.name)}
                          </span>
                          
                          {isRTL && currentLanguage !== 'he' && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded ml-2">
                              RTL
                            </span>
                          )}
                        </div>
                        
                        {showNativeNames && language.nativeName !== language.name && currentLanguage !== 'he' && (
                          <div className="text-xs text-gray-500 truncate">
                            {language.name}
                          </div>
                        )}
                        {currentLanguage === 'he' && language.nativeName !== language.name && (
                          <div className="text-xs text-gray-500 truncate">
                            {language.nativeName}
                          </div>
                        )}
                      </div>
                      
                      {isSelected && (
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

export default LanguageSelector
