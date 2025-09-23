'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { TemplatePhoto } from '@/types'
import styles from '../styles.module.scss'

interface PhotoCardProps {
  photo: TemplatePhoto
  className?: string
  onClick?: (photo: TemplatePhoto) => void
  showDetails?: boolean
}

export default function PhotoCard({ 
  photo, 
  className = '', 
  onClick,
  showDetails = true 
}: PhotoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const { currentLanguage } = useLanguage()

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(true)
  }

  const handleClick = () => {
    if (onClick) {
      onClick(photo)
    }
  }

  return (
    <div 
      className={`group relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {/* Image Container */}
      <div className="relative aspect-w-16 aspect-h-9 bg-gray-200 overflow-hidden">
        {/* Loading State */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Image */}
        <Image
          src={photo.storage.thumbnailPath || photo.storage.url || '/placeholder.jpg'}
          alt={MultiLangUtils.getTextValue(photo.title, currentLanguage)}
          width={400}
          height={192}
          className={`w-full h-48 object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading="lazy"
        />

        {/* Fallback Image */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {photo.isGalleryLeading && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Gallery Hero
            </span>
          )}
          {photo.isLeading && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Leading
            </span>
          )}
          {photo.isPublished ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Published
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Draft
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button className="p-2 bg-white bg-opacity-90 rounded-full shadow-md hover:bg-opacity-100 transition-all duration-200">
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {showDetails && (
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
            {MultiLangUtils.getTextValue(photo.title, currentLanguage)}
          </h3>
          
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>{photo.dimensions.width} × {photo.dimensions.height}</span>
            <span>{Math.round(photo.size / 1024)} KB</span>
          </div>

          {/* EXIF Date */}
          {photo.exif?.dateTimeOriginal && (
            <div className="text-sm text-gray-500 mb-2">
              📅 {new Date(photo.exif.dateTimeOriginal).toLocaleDateString()}
            </div>
          )}

          {/* Tags */}
          {photo.tags && photo.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {photo.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
              {photo.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  +{photo.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Album Info */}
          {photo.albumName && (
            <div className="text-sm text-gray-500">
              Album: {photo.albumName}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
