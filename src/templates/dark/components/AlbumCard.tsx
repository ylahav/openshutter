'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import { useAlbumCoverImage } from '@/hooks/useAlbumCoverImage'
import { Album } from '@/types'
import { TemplateAlbum } from '@/types/ui'

interface AlbumCardProps {
  album: Album | TemplateAlbum
  className?: string
}

export default function AlbumCard({ album, className = '' }: AlbumCardProps) {
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()

  const albumName = MultiLangUtils.getTextValue((album as any).name, currentLanguage)
  const albumDescription = (album as any).description ? MultiLangUtils.getHTMLValue((album as any).description, currentLanguage) : ''
  const { url: coverImageUrl, loading: coverImageLoading } = useAlbumCoverImage(((album as any)._id) || '')

  return (
    <Link href={`/albums/${album.alias}`} className={`group block ${className}`}>
      <div className="bg-gray-800 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 rounded-lg overflow-hidden transform hover:scale-105 h-85 flex flex-col">
        {/* Image container with dark overlay */}
        <div className="relative h-48 overflow-hidden bg-gray-900 flex-shrink-0">
          {!coverImageLoading && coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={albumName}
              fill
              className={`transition-all duration-500 ${
                coverImageUrl.includes('/logos/') 
                  ? 'object-contain bg-gray-800 p-6' 
                  : 'object-cover group-hover:scale-110 group-hover:brightness-110'
              }`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              {coverImageLoading ? (
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs text-gray-400">Loading...</p>
                </div>
              ) : (
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-xs text-gray-500">No image</p>
                </div>
              )}
            </div>
          )}
          
          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Featured badge with dark theme */}
          {(album as any).isFeatured && (
            <div className="absolute top-4 right-4">
              <div className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold rounded-full shadow-lg">
                ⭐ Featured
              </div>
            </div>
          )}

          {/* Photo count with dark styling - only show if > 0 */}
          {(((album as any).photoCount || 0) > 0) && (
            <div className="absolute bottom-4 left-4">
              <div className="px-3 py-1 bg-black/70 backdrop-blur-sm text-white text-sm font-medium rounded-lg border border-white/20">
                📸 {(album as any).photoCount} {((album as any).photoCount === 1) ? 'photo' : 'photos'}
              </div>
            </div>
          )}

          {/* Hover overlay with action */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <p className="text-sm font-medium">View Album</p>
            </div>
          </div>
        </div>

        {/* Content section with dark theme */}
        <div className="p-6 bg-gray-800 flex-1 flex flex-col">
          {/* Album title with gradient text */}
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors duration-300">
            {albumName}
          </h3>

          {/* Album description */}
          {albumDescription && (
            <div 
              className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: albumDescription }}
            />
          )}

          {/* Album metadata with dark styling */}
          <div className="flex items-center justify-between text-sm mt-auto">
            <div className="flex items-center space-x-4 text-gray-500">
              {/* Album info */}
            </div>

            {/* Creation date with dark styling */}
            { (album as any).createdAt && (
              <span className="text-gray-500 text-xs">
                {new Date(((album as any).createdAt) as any).toLocaleDateString(currentLanguage === 'he' ? 'he-IL' : 'en-US', {
                  year: 'numeric',
                  month: 'short'
                })}
              </span>
            )}
          </div>

          {/* Progress bar for photo count (visual element) - only show if > 0 */}
          {(((album as any).photoCount || 0) > 0) && (
            <div className="mt-4">
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((((album as any).photoCount || 0) / 50) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
