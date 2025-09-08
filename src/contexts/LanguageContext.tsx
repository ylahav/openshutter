'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { LanguageCode, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/types/multi-lang'
import { useSiteConfig } from '@/hooks/useSiteConfig'

interface LanguageContextType {
  currentLanguage: LanguageCode
  setCurrentLanguage: (language: LanguageCode) => void
  isRTL: boolean
  getTextDirection: () => 'ltr' | 'rtl'
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
  defaultLanguage?: LanguageCode
}

export function LanguageProvider({ 
  children, 
  defaultLanguage = DEFAULT_LANGUAGE 
}: LanguageProviderProps) {
  const { config } = useSiteConfig()
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(defaultLanguage)

  // Get current language configuration
  const currentLangConfig = SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage)
  const isRTL = currentLangConfig?.isRTL || false

  // Get text direction for current language
  const getTextDirection = (): 'ltr' | 'rtl' => {
    return isRTL ? 'rtl' : 'ltr'
  }

  // Update document direction when language changes
  useEffect(() => {
    const direction = getTextDirection()
    document.documentElement.dir = direction
    document.documentElement.lang = currentLanguage
    
    // Add RTL-specific CSS class
    if (isRTL) {
      document.documentElement.classList.add('rtl')
    } else {
      document.documentElement.classList.remove('rtl')
    }
  }, [currentLanguage, isRTL])

  // Load language preference from localStorage and handle single language configuration
  useEffect(() => {
    const activeLanguages = config?.languages?.activeLanguages || [DEFAULT_LANGUAGE]
    
    // If only one language is configured, use it automatically
    if (activeLanguages.length === 1) {
      setCurrentLanguage(activeLanguages[0])
      localStorage.setItem('openshutter-language', activeLanguages[0])
      return
    }
    
    // If multiple languages are configured, check localStorage
    const savedLanguage = localStorage.getItem('openshutter-language')
    if (savedLanguage && activeLanguages.includes(savedLanguage)) {
      setCurrentLanguage(savedLanguage)
    } else if (config?.languages?.defaultLanguage && activeLanguages.includes(config.languages.defaultLanguage)) {
      // Use the configured default language if available
      setCurrentLanguage(config.languages.defaultLanguage)
      localStorage.setItem('openshutter-language', config.languages.defaultLanguage)
    }
  }, [config])

  // Save language preference to localStorage
  const handleLanguageChange = (language: LanguageCode) => {
    setCurrentLanguage(language)
    localStorage.setItem('openshutter-language', language)
  }

  const value: LanguageContextType = {
    currentLanguage,
    setCurrentLanguage: handleLanguageChange,
    isRTL,
    getTextDirection
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

// Hook to use language context
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Hook to get text direction
export function useTextDirection() {
  const { getTextDirection } = useLanguage()
  return getTextDirection()
}

// Hook to check if current language is RTL
export function useIsRTL() {
  const { isRTL } = useLanguage()
  return isRTL
}
