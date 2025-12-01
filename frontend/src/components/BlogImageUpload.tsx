'use client'

import { useState, useRef } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils, MultiLangText } from '@/types/multi-lang'

interface BlogImageUploadProps {
  value?: {
    url: string
    alt: MultiLangText
    storageProvider: string
    storagePath: string
  }
  onChange: (value: {
    url: string
    alt: MultiLangText
    storageProvider: string
    storagePath: string
  } | undefined) => void
  storageProvider?: string
  className?: string
}

export default function BlogImageUpload({ 
  value, 
  onChange, 
  storageProvider = 'local',
  className = '' 
}: BlogImageUploadProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('owner.invalidImageType'))
      return
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setError(t('owner.imageTooLarge'))
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('storageProvider', storageProvider)
      formData.append('alt', value?.alt ? MultiLangUtils.getTextValue(value.alt, currentLanguage) || '' : '')

      const response = await fetch('/api/owner/blog/upload-image', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      if (data.success) {
        onChange({
          url: data.data.url,
          alt: value?.alt || { [currentLanguage]: data.data.alt },
          storageProvider: data.data.storageProvider,
          storagePath: data.data.storagePath
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    onChange(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAltChange = (alt: string) => {
    if (value) {
      onChange({
        ...value,
        alt: MultiLangUtils.setValue(value.alt, currentLanguage, alt)
      })
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Image Display */}
      {value?.url && (
        <div className="space-y-3">
          <div className="relative">
            <img
              src={value.url}
              alt={MultiLangUtils.getTextValue(value.alt, currentLanguage)}
              className="w-full h-48 object-cover rounded-lg border border-gray-300"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Alt Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('owner.imageAltText')}
            </label>
            <input
              type="text"
              value={MultiLangUtils.getTextValue(value.alt, currentLanguage)}
              onChange={(e) => handleAltChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('owner.enterImageAltText')}
            />
          </div>
        </div>
      )}

      {/* Upload Button */}
      {!value?.url && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('owner.uploading')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('owner.uploadImage')}
              </>
            )}
          </button>
          
          <p className="mt-2 text-sm text-gray-500">
            {t('owner.imageUploadHelp')}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
