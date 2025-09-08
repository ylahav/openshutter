'use client'

import { useState, useEffect } from 'react'
import { MultiLangText, SUPPORTED_LANGUAGES, MultiLangUtils, LanguageCode } from '@/types/multi-lang'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'

interface MultiLangInputProps {
  value: MultiLangText
  onChange: (value: MultiLangText) => void
  placeholder?: string
  className?: string
  required?: boolean
  maxLength?: number
  showLanguageTabs?: boolean
  defaultLanguage?: LanguageCode
}

export function MultiLangInput({
  value,
  onChange,
  placeholder = 'Enter text...',
  className = '',
  required = false,
  maxLength,
  showLanguageTabs = true,
  defaultLanguage = 'en'
}: MultiLangInputProps) {
  const { config } = useSiteConfig()
  const { isRTL } = useLanguage()
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>(defaultLanguage)
  const [inputValue, setInputValue] = useState('')

  // Get active languages from site config, fallback to all supported languages
  const activeLanguages = config?.languages?.activeLanguages || ['en']
  const availableLanguages = SUPPORTED_LANGUAGES.filter(lang => 
    activeLanguages.includes(lang.code)
  )

  // Update input value when active language changes
  useEffect(() => {
    setInputValue(MultiLangUtils.getValue(value, activeLanguage))
  }, [activeLanguage, value])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Update the multi-language field
    const updatedField = MultiLangUtils.setValue(value, activeLanguage, newValue)
    onChange(updatedField)
  }

  // Handle language tab click
  const handleLanguageClick = (languageCode: LanguageCode) => {
    // Save current input value before switching
    if (inputValue.trim()) {
      const updatedField = MultiLangUtils.setValue(value, activeLanguage, inputValue)
      onChange(updatedField)
    }
    
    setActiveLanguage(languageCode)
  }

  // Get current language config
  const currentLangConfig = availableLanguages.find(lang => lang.code === activeLanguage)

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Language Tabs */}
      {showLanguageTabs && (
        <div className={`flex flex-wrap border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {availableLanguages.map((language) => {
            const hasContent = MultiLangUtils.hasContent(value, language.code)
            const isActive = language.code === activeLanguage
            
            return (
              <button
                key={language.code}
                type="button"
                onClick={() => handleLanguageClick(language.code)}
                className={`
                  flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors
                  ${isActive 
                    ? 'border-blue-500 text-blue-600 bg-blue-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                  ${hasContent ? 'font-semibold' : 'font-normal'}
                  ${isRTL ? 'flex-row-reverse' : ''}
                `}
              >
                <span className="text-lg">{language.flag}</span>
                <span className="hidden sm:inline">{language.nativeName}</span>
                {hasContent && (
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          className={`
            w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${currentLangConfig?.isRTL ? 'text-right' : 'text-left'}
            ${className}
          `}
          dir={currentLangConfig?.isRTL ? 'rtl' : 'ltr'}
        />
        
        {/* Language Indicator */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <span className="text-xs text-gray-400 bg-white px-1">
            {currentLangConfig?.code.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Character Count */}
      {maxLength && (
        <div className="text-xs text-gray-500 text-right">
          {inputValue.length} / {maxLength}
        </div>
      )}

      {/* Content Summary */}
      <div className="text-xs text-gray-500">
        Content available in: {MultiLangUtils.getLanguagesWithContent(value).map(lang => {
          const langConfig = availableLanguages.find(l => l.code === lang)
          return langConfig ? `${langConfig.flag} ${langConfig.nativeName}` : lang
        }).join(', ') || 'No languages'}
      </div>
    </div>
  )
}

export default MultiLangInput
