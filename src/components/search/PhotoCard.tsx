'use client'

import { useState } from 'react'
import Link from 'next/link'
// Using regular img tag for API-served images instead of Next.js Image
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Photo } from '@/types'
import { Calendar, Image as ImageIcon, Tag, Eye } from '@/lib/icons'
import { format } from 'date-fns'

interface PhotoCardProps {
  photo: Photo
  viewMode: 'grid' | 'list'
}

export function PhotoCard({ photo, viewMode }: PhotoCardProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const [imageError, setImageError] = useState(false)
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4">
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
              {!imageError && (photo.storage?.thumbnailPath || photo.storage?.url) ? (
                <img
                  src={photo.storage?.thumbnailPath || photo.storage?.url || ''}
                  alt={(typeof photo.title === 'string' ? photo.title : MultiLangUtils.getTextValue(photo.title as any, currentLanguage)) || photo.filename}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {(typeof photo.title === 'string' ? photo.title : MultiLangUtils.getTextValue(photo.title as any, currentLanguage)) || photo.filename}
                </h4>
                <p className="text-sm text-gray-600 truncate">
                  {photo.originalFilename}
                </p>
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(photo.uploadedAt), 'MMM dd, yyyy')}
                  </span>
                  <span>{formatFileSize(photo.size)}</span>
                  <span>{photo.dimensions.width} × {photo.dimensions.height}</span>
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-4">
                <Link
                  href={`/photos/${photo._id}`}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {t('search.view', 'View')}
                </Link>
              </div>
            </div>
            
            {/* Tags */}
            {photo.tags && photo.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {photo.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {photo.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{photo.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="aspect-square bg-gray-200 relative overflow-hidden">
        {!imageError && (photo.storage?.thumbnailPath || photo.storage?.url) ? (
          <img
            src={photo.storage?.thumbnailPath || photo.storage?.url || ''}
            alt={(typeof photo.title === 'string' ? photo.title : MultiLangUtils.getTextValue(photo.title as any, currentLanguage)) || photo.filename}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          <Link
            href={`/photos/${photo._id}`}
            className="opacity-0 hover:opacity-100 transition-opacity duration-200 inline-flex items-center px-3 py-1 bg-white rounded-md text-sm font-medium text-gray-700"
          >
            <Eye className="h-4 w-4 mr-1" />
            {t('search.view', 'View')}
          </Link>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
          {(typeof photo.title === 'string' ? photo.title : MultiLangUtils.getTextValue(photo.title as any, currentLanguage)) || photo.filename}
        </h4>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {format(new Date(photo.uploadedAt), 'MMM dd')}
          </span>
          <span>{formatFileSize(photo.size)}</span>
        </div>
        
        {/* Tags */}
        {photo.tags && photo.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {photo.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </span>
            ))}
            {photo.tags.length > 2 && (
              <span className="text-xs text-gray-500">
                +{photo.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
