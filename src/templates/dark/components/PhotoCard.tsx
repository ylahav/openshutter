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
      <div className="bg-gray-800 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 rounded-lg overflow-hidden transform hover:scale-105">
        {/* Image container with dark theme */}
        <div className="relative aspect-square overflow-hidden bg-gray-900">
          {/* Loading state with dark theme */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-800 animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800"></div>
            </div>
          )}

          {/* Error state with dark theme */}
          {imageError ? (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Image unavailable</p>
              </div>
            </div>
          ) : (
            <Image
              src={photo.storage.url}
              alt={photoTitle}
              fill
              className={`object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110 ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          )}

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          {/* Leading photo badge with dark theme */}
          {photo.isLeading && (
            <div className="absolute top-3 left-3">
              <div className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold rounded-full shadow-lg">
                ⭐ Leading
              </div>
            </div>
          )}

          {/* Gallery leading badge with dark theme */}
          {photo.isGalleryLeading && (
            <div className="absolute top-3 right-3">
              <div className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full shadow-lg">
                🖼️ Gallery
              </div>
            </div>
          )}

          {/* Hover overlay with action buttons */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="flex space-x-3">
              <button className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors duration-300">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors duration-300">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors duration-300">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content section with dark theme */}
        {showDetails && (
          <div className="p-4 bg-gray-800">
            {/* Photo title with gradient text */}
            <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors duration-300 line-clamp-1">
              {photoTitle}
            </h3>

            {/* Photo description */}
            {photoDescription && (
              <div 
                className="text-gray-400 text-xs mb-3 line-clamp-2 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: photoDescription }}
              />
            )}

            {/* Photo metadata with dark styling */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3 text-gray-500">
                {/* Dimensions */}
                {photo.dimensions && (
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    {photo.dimensions.width}×{photo.dimensions.height}
                  </span>
                )}

                {/* Tags */}
                {photo.tags && photo.tags.length > 0 && (
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {photo.tags.length} tags
                  </span>
                )}
              </div>

              {/* Upload date with dark styling */}
              <span className="text-gray-500">
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
