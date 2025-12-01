'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import styles from '../styles.module.scss'
import { useAlbumCoverImage } from '@/hooks/useAlbumCoverImage'
import { TemplateAlbum } from '@/types'

interface AlbumCardProps {
  album: TemplateAlbum
  className?: string
}

export default function AlbumCard({ album, className = '' }: AlbumCardProps) {
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const displayName = MultiLangUtils.getTextValue(album.name as any, currentLanguage)
  const displayDesc = MultiLangUtils.getHTMLValue(album.description as any, currentLanguage)
  const { url: coverImageUrl, loading: coverImageLoading } = useAlbumCoverImage(album._id)
  const childAlbumCount = (album as any).childAlbumCount ?? 0

  return (
    <Link href={`/albums/${album.alias}`}>
      <div 
        className={`group relative bg-background overflow-hidden border border-border cursor-pointer hover:shadow-lg transition-shadow duration-300 h-80 flex flex-col ${className}`}
      >
      {/* Cover Image */}
      <div className="relative h-48 bg-gradient-to-br from-muted to-muted/70 overflow-hidden flex-shrink-0">
        {!coverImageLoading && coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={displayName}
            width={400}
            height={192}
            className={`w-full h-full transition-transform duration-700 ease-out ${
              coverImageUrl.includes('/logos/') 
                ? 'object-contain bg-muted p-4' 
                : 'object-cover group-hover:scale-110'
            }`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
          />
        ) : null}
        
        {/* Loading state */}
        {coverImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/70">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          </div>
        )}
        
        {/* Placeholder */}
        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/70 ${(!coverImageLoading && coverImageUrl) ? 'hidden' : ''}`}>
          <div className="text-center">
            <svg className="w-16 h-16 text-muted-foreground mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-xs text-muted-foreground">{t('noCoverImage')}</p>
          </div>
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        

        {/* Hover overlay with action */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="transform scale-90 group-hover:scale-100 transition-transform duration-300 border border-white/30 rounded-full px-6 py-3 text-white font-semibold bg-white/30">
            {t('viewAlbum')} →
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 bg-background flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-foreground mb-3 transition-colors duration-200 line-clamp-1 group-hover:text-primary">
          {displayName}
        </h3>
        
        <div 
          className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed flex-1"
          dangerouslySetInnerHTML={{ __html: displayDesc }}
        />
        
        <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
          <div className="flex items-center text-sm text-muted-foreground">

            {typeof album.photoCount === 'number' && album.photoCount > 0 && (
              <>
                <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">{album.photoCount} {t('photos')}</span>
              </>
            )}
            {childAlbumCount > 0 && (
              <>
                {typeof album.photoCount === 'number' && album.photoCount > 0 && <span className="mx-2">•</span>}
                <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
                <span className="font-medium">{childAlbumCount} {t('albums')}</span>
              </>
            )}
            {album.photoCount === 0 && childAlbumCount === 0 && (
              <span className="text-muted-foreground text-sm">{t('emptyAlbum')}</span>
            )}
          </div>
          
          {album.createdAt && (
            <div className="text-xs text-muted-foreground">
              {new Date(album.createdAt as any).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      </div>
    </Link>
  )
}
