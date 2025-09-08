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
      className={`group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-1 cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {/* Image container */}
      <div className="relative aspect-square overflow-hidden">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent transform -skew-x-12 animate-shimmer"></div>
          </div>
        )}

        {/* Error state */}
        {imageError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className={`object-cover transition-all duration-700 group-hover:scale-110 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        {/* Leading photo badge */}
        {photo.isLeading && (
          <div className="absolute top-3 left-3">
            <div className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
              ⭐ Leading
            </div>
          </div>
        )}

        {/* Gallery leading badge */}
        {photo.isGalleryLeading && (
          <div className="absolute top-3 right-3">
            <div className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
              🎨 Gallery
            </div>
          </div>
        )}

        {/* Hover overlay with action buttons */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 flex space-x-3">
            <button className="p-3 bg-white/20 backdrop-blur-xl border border-white/30 text-white rounded-full hover:bg-white/30 transition-colors duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button className="p-3 bg-white/20 backdrop-blur-xl border border-white/30 text-white rounded-full hover:bg-white/30 transition-colors duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button className="p-3 bg-white/20 backdrop-blur-xl border border-white/30 text-white rounded-full hover:bg-white/30 transition-colors duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 -top-1 -left-1 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
      </div>

      {/* Content section */}
      {showDetails && (
        <div className="p-4">
          {/* Photo title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors duration-300 line-clamp-1">
            {photoTitle}
          </h3>

          {/* Photo description */}
          {photoDescription && (
            <div 
              className="text-gray-600 text-sm mb-3 line-clamp-2 group-hover:text-gray-700 transition-colors duration-300"
              dangerouslySetInnerHTML={{ __html: photoDescription }}
            />
          )}

          {/* Photo metadata */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-3">
              {/* Dimensions */}
              {photo.dimensions && (
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span>{photo.dimensions.width}×{photo.dimensions.height}</span>
                </div>
              )}

              {/* Tags */}
              {photo.tags && photo.tags.length > 0 && (
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>{photo.tags.length} tags</span>
                </div>
              )}
            </div>

            {/* Upload date */}
            <div className="text-xs text-gray-400">
              {new Date(photo.uploadedAt).toLocaleDateString(currentLanguage === 'he' ? 'he-IL' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
