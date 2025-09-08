'use client'

import { useState, useEffect } from 'react'
import { MultiLangHTML } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import TiptapHTMLEditor from './TiptapHTMLEditor'

interface MultiLangHTMLEditorProps {
  value: MultiLangHTML
  onChange: (value: MultiLangHTML) => void
  placeholder?: string
  height?: number
  showLanguageTabs?: boolean
  defaultLanguage?: string
  className?: string
}

export default function MultiLangHTMLEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  height = 200,
  showLanguageTabs = true,
  defaultLanguage = 'en',
  className = ''
}: MultiLangHTMLEditorProps) {
  const { currentLanguage, isRTL: globalIsRTL } = useLanguage()
  const [activeLanguage, setActiveLanguage] = useState(defaultLanguage)
  const [editorValue, setEditorValue] = useState('')

  // Get available languages - for now using default, can be enhanced later
  const availableLanguages = ['en', 'he']
  
  // Determine if current language is RTL
  const isRTL = activeLanguage === 'he' || activeLanguage === 'ar' || activeLanguage === 'fa'

  // Update editor value when active language changes
  useEffect(() => {
    const currentValue = value[activeLanguage] || ''
    setEditorValue(currentValue)
  }, [activeLanguage, value])

  // Handle editor content changes
  const handleEditorChange = (newValue: string) => {
    setEditorValue(newValue)
    
    // Update the multi-language object
    const updatedValue = {
      ...value,
      [activeLanguage]: newValue
    }
    onChange(updatedValue)
  }

  // Handle language tab changes
  const handleLanguageChange = (language: string) => {
    // Save current content before switching
    const updatedValue = {
      ...value,
      [activeLanguage]: editorValue
    }
    onChange(updatedValue)
    
    // Switch to new language
    setActiveLanguage(language)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Language Tabs */}
      {showLanguageTabs && availableLanguages.length > 1 && (
        <div className={`flex border-b border-gray-200 ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-1'}`}>
          {availableLanguages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguageChange(lang)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeLanguage === lang
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {lang === 'en' ? 'English' : 
               lang === 'he' ? 'עברית' : 
               lang === 'ar' ? 'العربية' : 
               lang === 'fa' ? 'فارسی' : 
               lang.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Editor */}
      <TiptapHTMLEditor
        value={editorValue}
        onChange={handleEditorChange}
        placeholder={placeholder}
        height={height}
        isRTL={isRTL}
        className="w-full"
      />

      {/* Language Indicator */}
      {showLanguageTabs && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Editing in: {activeLanguage === 'en' ? 'English' : 
                        activeLanguage === 'he' ? 'עברית' : 
                        activeLanguage === 'ar' ? 'العربية' : 
                        activeLanguage === 'fa' ? 'فارسی' : 
                        activeLanguage.toUpperCase()}
          </span>
          <span className={`px-2 py-1 rounded text-xs ${
            isRTL ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {isRTL ? 'RTL' : 'LTR'}
          </span>
        </div>
      )}
    </div>
  )
}
