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
      <div className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg h-85 flex flex-col">
        {/* Image container */}
        <div className="relative h-48 overflow-hidden bg-gray-100 flex-shrink-0">
          {!coverImageLoading && coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={albumName}
              fill
              className={`transition-transform duration-500 ${
                coverImageUrl.includes('/logos/') 
                  ? 'object-contain bg-gray-50 p-4' 
                  : 'object-cover group-hover:scale-105'
              }`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              {coverImageLoading ? (
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
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
          

          {/* Photo count - minimal */}
          <div className="absolute bottom-4 left-4">
            {typeof album.photoCount === 'number' && album.photoCount > 0 && (
              <div className="px-2 py-1 bg-white/90 text-gray-900 text-sm font-medium">
                {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
              </div>
            )}
          </div>
        </div>

        {/* Content section */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Album title */}
          <h3 className="text-lg font-medium text-gray-900 mb-2 group-hover:text-gray-700 transition-colors duration-300">
            {albumName}
          </h3>

          {/* Album description */}
          {albumDescription && (
            <div 
              className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1"
              dangerouslySetInnerHTML={{ __html: albumDescription }}
            />
          )}

          {/* Album metadata */}
          <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
            <div className="flex items-center space-x-4">
              {/* Sub-albums count */}
              {((album as any).childAlbumCount ?? 0) > 0 && (
                <span>
                  {(album as any).childAlbumCount} child albums
                </span>
              )}
            </div>

            {/* Creation date */}
            {album.createdAt && (
              <span className="text-xs">
                {new Date(album.createdAt as any).toLocaleDateString(currentLanguage === 'he' ? 'he-IL' : 'en-US', {
                  year: 'numeric',
                  month: 'short'
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
