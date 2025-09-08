'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'

interface Photo {
  _id: string
  title: Record<string, string> | string
  description?: Record<string, string> | string
  filename: string
  storage: {
    url: string
    path: string
    provider: string
  }
  dimensions?: {
    width: number
    height: number
  }
  uploadedAt: string
  tags?: string[]
  isLeading?: boolean
  isGalleryLeading?: boolean
}

interface PhotoCardProps {
  photo: Photo
  className?: string
  onClick?: (photo: Photo) => void
  showDetails?: boolean
}

export default function PhotoCard({ 
  photo, 
  className = '', 
  onClick,
  showDetails = true 
}: PhotoCardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()

  const photoTitle = MultiLangUtils.getTextValue(photo.title, currentLanguage)
  const photoDescription = photo.description ? MultiLangUtils.getHTMLValue(photo.description, currentLanguage) : ''

  const handleClick = () => {
    if (onClick) {
      onClick(photo)
    }
  }

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setIsLoading(false)
  }

  return (
    <div 
      className={`group cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-md">
        {/* Image container */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
          )}

          {/* Error state */}
          {imageError ? (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs">Image unavailable</p>
              </div>
            </div>
          ) : (
            <Image
              src={photo.storage.url}
              alt={photoTitle}
              fill
              className={`object-cover transition-all duration-500 group-hover:scale-105 ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          )}

          {/* Leading photo badge - minimal */}
          {photo.isLeading && (
            <div className="absolute top-3 left-3">
              <div className="px-2 py-1 bg-black text-white text-xs font-medium">
                Leading
              </div>
            </div>
          )}

          {/* Gallery leading badge - minimal */}
          {photo.isGalleryLeading && (
            <div className="absolute top-3 right-3">
              <div className="px-2 py-1 bg-gray-600 text-white text-xs font-medium">
                Gallery
              </div>
            </div>
          )}
        </div>

        {/* Content section */}
        {showDetails && (
          <div className="p-4">
            {/* Photo title */}
            <h3 className="text-sm font-medium text-gray-900 mb-1 group-hover:text-gray-700 transition-colors duration-300 line-clamp-1">
              {photoTitle}
            </h3>

            {/* Photo description */}
            {photoDescription && (
              <div 
                className="text-gray-600 text-xs mb-3 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: photoDescription }}
              />
            )}

            {/* Photo metadata */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-3">
                {/* Dimensions */}
                {photo.dimensions && (
                  <span>
                    {photo.dimensions.width}×{photo.dimensions.height}
                  </span>
                )}

                {/* Tags */}
                {photo.tags && photo.tags.length > 0 && (
                  <span>
                    {photo.tags.length} tags
                  </span>
                )}
              </div>

              {/* Upload date */}
              <span>
                {new Date(photo.uploadedAt).toLocaleDateString(currentLanguage === 'he' ? 'he-IL' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
