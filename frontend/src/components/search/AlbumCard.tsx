'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { Album } from '@/types'
import { Calendar, Folder, Image as ImageIcon, Eye } from 'lucide-react'
import { format } from 'date-fns'

interface AlbumCardProps {
  album: Album
  viewMode: 'grid' | 'list'
}

export function AlbumCard({ album, viewMode }: AlbumCardProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const [imageError, setImageError] = useState(false)
  
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-4">
          {/* Cover Image */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
              {album.coverPhotoId && !imageError ? (
                <Image
                  src={`/api/storage/serve/thumbnails/${album.coverPhotoId}`}
                  alt={typeof album.name === 'string' ? album.name : MultiLangUtils.getValue(album.name as any, currentLanguage)}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Folder className="h-6 w-6" />
                </div>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {typeof album.name === 'string' ? album.name : MultiLangUtils.getValue(album.name as any, currentLanguage)}
                </h4>
                {album.description && (
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {typeof album.description === 'string' ? album.description : MultiLangUtils.getValue(album.description as any, currentLanguage)}
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(album.createdAt), 'MMM dd, yyyy')}
                  </span>
                  <span className="flex items-center">
                    <ImageIcon className="h-3 w-3 mr-1" />
                    {album.photoCount} {t('search.photos', 'photos')}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    album.isPublic 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {album.isPublic ? t('search.public', 'Public') : t('search.private', 'Private')}
                  </span>
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-4">
                <Link
                  href={`/albums/${album.alias}`}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {t('search.view', 'View')}
                </Link>
              </div>
            </div>
            
            {/* Tags */}
            {album.tags && album.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {album.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
                {album.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{album.tags.length - 3} more
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
      {/* Cover Image */}
      <div className="aspect-square bg-gray-200 relative">
        {album.coverPhotoId && !imageError ? (
          <Image
            src={`/api/storage/serve/thumbnails/${album.coverPhotoId}`}
            alt={typeof album.name === 'string' ? album.name : MultiLangUtils.getValue(album.name as any, currentLanguage)}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Folder className="h-12 w-12" />
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          <Link
            href={`/albums/${album.alias}`}
            className="opacity-0 hover:opacity-100 transition-opacity duration-200 inline-flex items-center px-3 py-1 bg-white rounded-md text-sm font-medium text-gray-700"
          >
            <Eye className="h-4 w-4 mr-1" />
            {t('search.view', 'View')}
          </Link>
        </div>
        
        {/* Photo Count Badge */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-full flex items-center">
          <ImageIcon className="h-3 w-3 mr-1" />
          {album.photoCount}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
          {typeof album.name === 'string' ? album.name : MultiLangUtils.getValue(album.name as any, currentLanguage)}
        </h4>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {format(new Date(album.createdAt), 'MMM dd')}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            album.isPublic 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {album.isPublic ? t('search.public', 'Public') : t('search.private', 'Private')}
          </span>
        </div>
        
        {/* Tags */}
        {album.tags && album.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {album.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
            {album.tags.length > 2 && (
              <span className="text-xs text-gray-500">
                +{album.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
