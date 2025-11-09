'use client'

import { useState } from 'react'
// Using regular img tag for API-served images instead of Next.js Image
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Photo } from '@/types'
import { Image as ImageIcon } from '@/lib/icons'

interface PhotoCardProps {
  photo: Photo
  viewMode?: 'grid' | 'list' // Optional, defaults to grid
  onClick?: () => void
}

export function PhotoCard({ photo, viewMode, onClick }: PhotoCardProps) {
  const { currentLanguage } = useLanguage()
  const [imageError, setImageError] = useState(false)
  
  // Construct image URL from storage info
  const getImageUrl = () => {
    if (!photo.storage) return ''
    
    // If thumbnailPath exists, use it (should already be a full URL from API)
    if (photo.storage.thumbnailPath) {
      // If it's already a full URL, use it as-is
      if (photo.storage.thumbnailPath.startsWith('/api/storage/serve/') || photo.storage.thumbnailPath.startsWith('http')) {
        return photo.storage.thumbnailPath
      }
      // Otherwise construct the URL
      const provider = photo.storage.provider || 'local'
      return `/api/storage/serve/${provider}/${encodeURIComponent(photo.storage.thumbnailPath)}`
    }
    
    // Fallback to url if available
    if (photo.storage.url) {
      if (photo.storage.url.startsWith('/api/storage/serve/') || photo.storage.url.startsWith('http')) {
        return photo.storage.url
      }
      return `/api/storage/serve/${photo.storage.provider || 'local'}/${encodeURIComponent(photo.storage.url)}`
    }
    
    return ''
  }
  
  const imageUrl = getImageUrl()
  
  // Grid view only (matching album view style)
  return (
    <div 
      className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
      onClick={onClick}
    >
      {/* Image - matching album view style */}
      <div className="aspect-square bg-gray-200 relative overflow-hidden">
        {!imageError && imageUrl ? (
          <img
            src={imageUrl}
            alt={(typeof photo.title === 'string' ? photo.title : MultiLangUtils.getTextValue(photo.title as any, currentLanguage)) || photo.filename}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}
      </div>
      
      {/* Content - matching album view style */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-900 truncate">
          {(typeof photo.title === 'string' ? photo.title : MultiLangUtils.getTextValue(photo.title as any, currentLanguage)) || photo.filename}
        </h3>
      </div>
    </div>
  )
}
