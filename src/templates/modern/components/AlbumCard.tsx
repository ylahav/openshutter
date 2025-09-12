'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import { useAlbumCoverImage } from '@/hooks/useAlbumCoverImage'
import { TemplateAlbum } from '@/types/ui'

interface AlbumCardProps {
  album: TemplateAlbum
  className?: string
}

export default function AlbumCard({ album, className = '' }: AlbumCardProps) {
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()

  const albumName = MultiLangUtils.getTextValue(album.name as any, currentLanguage)
  const albumDescription = MultiLangUtils.getHTMLValue((album.description as any) || '', currentLanguage)
  const { url: coverImageUrl, loading: coverImageLoading } = useAlbumCoverImage(album._id)

  return (
    <Link href={`/albums/${album.alias}`} className={`group block ${className}`}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 h-80 flex flex-col">
        {/* Image container with modern overlay */}
        <div className="relative h-48 overflow-hidden flex-shrink-0">
          {!coverImageLoading && coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={albumName}
              fill
              className={`transition-transform duration-700 ${
                coverImageUrl.includes('/logos/') 
                  ? 'object-contain bg-white/20 p-6' 
                  : 'object-cover group-hover:scale-110'
              }`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              {coverImageLoading ? (
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs text-gray-500">Loading...</p>
                </div>
              ) : (
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-xs text-gray-500">No image</p>
                </div>
              )}
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          

          {/* Photo count badge */}
          <div className="absolute bottom-4 left-4">
            {typeof album.photoCount === 'number' && album.photoCount > 0 && (
              <div className="px-3 py-1 bg-black/50 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                📸 {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
              </div>
            )}
          </div>

          {/* Hover overlay with action buttons */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
              <div className="px-6 py-3 bg-white/20 backdrop-blur-xl border border-white/30 text-white font-semibold rounded-full hover:bg-white/30 transition-colors duration-300">
                View Album →
              </div>
            </div>
          </div>
        </div>

        {/* Content section */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Album title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300 line-clamp-2">
            {albumName}
          </h3>

          {/* Album description */}
          {albumDescription && (
            <div 
              className="text-gray-600 text-sm mb-4 line-clamp-2 group-hover:text-gray-700 transition-colors duration-300 flex-1"
              dangerouslySetInnerHTML={{ __html: albumDescription }}
            />
          )}

          {/* Album metadata */}
          <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
            <div className="flex items-center space-x-4">
              {/* Sub-albums count */}
              {((album as any).childAlbumCount ?? 0) > 0 && (
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                  </svg>
                  <span>{(album as any).childAlbumCount} child albums</span>
                </div>
              )}
            </div>

            {/* Creation date */}
            {album.createdAt && (
              <div className="text-xs text-gray-400">
                {new Date(album.createdAt as any).toLocaleDateString(currentLanguage === 'he' ? 'he-IL' : 'en-US', {
                  year: 'numeric',
                  month: 'short'
                })}
              </div>
            )}
          </div>

          {/* Progress bar for photo loading effect */}
          <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-1000 ease-out"></div>
          </div>
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 -top-1 -left-1 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
      </div>
    </Link>
  )
}
