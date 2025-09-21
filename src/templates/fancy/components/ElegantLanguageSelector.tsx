'use client'

import { useState } from 'react'
import { SUPPORTED_LANGUAGES, LanguageCode } from '@/types/multi-lang'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { useLanguage } from '@/contexts/LanguageContext'

interface ElegantLanguageSelectorProps {
  className?: string
}

export function ElegantLanguageSelector({ className = '' }: ElegantLanguageSelectorProps) {
  const { config } = useSiteConfig()
  const { currentLanguage, setCurrentLanguage } = useLanguage()
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
    setCurrentLanguage(languageCode)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Current Language Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="elegant-language-button"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'transparent',
          border: '2px solid var(--elegant-gold)',
          borderRadius: '25px',
          color: 'var(--elegant-gold)',
          fontWeight: '500',
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--elegant-gold)'
          e.currentTarget.style.color = 'var(--elegant-white)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--elegant-gold)'
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span style={{ fontSize: '1.2rem' }}>{currentLangConfig?.flag}</span>
        
        <span style={{ 
          fontWeight: '500',
          color: 'inherit'
        }}>
          {currentLanguage === 'he' ? currentLangConfig?.name : currentLangConfig?.nativeName}
        </span>
        
        <svg
          style={{
            width: '16px',
            height: '16px',
            transition: 'transform 0.3s ease',
            transform: isOpen ? 'rotate(180deg)' : 'none'
          }}
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
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10
            }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div 
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '0.5rem',
              width: '200px',
              background: 'var(--elegant-white)',
              border: '1px solid var(--elegant-gold)',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              zIndex: 20,
              overflow: 'hidden'
            }}
          >
            <ul style={{ margin: 0, padding: '0.5rem 0', listStyle: 'none' }}>
              {availableLanguages.map((lang) => (
                <li key={lang.code}>
                  <button
                    type="button"
                    onClick={() => handleLanguageSelect(lang.code)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      background: 'transparent',
                      border: 'none',
                      color: lang.code === currentLanguage ? 'var(--elegant-gold)' : 'var(--elegant-charcoal)',
                      fontWeight: lang.code === currentLanguage ? '600' : '400',
                      fontSize: '0.9rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--elegant-gold-light)'
                      e.currentTarget.style.color = 'var(--elegant-charcoal)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = lang.code === currentLanguage ? 'var(--elegant-gold)' : 'var(--elegant-charcoal)'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
                    <span>
                      {currentLanguage === 'he' ? lang.name : lang.nativeName}
                    </span>
                    {lang.code === currentLanguage && (
                      <span style={{ 
                        marginLeft: 'auto',
                        color: 'var(--elegant-gold)',
                        fontWeight: 'bold'
                      }}>
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

