'use client'

import { useState, useEffect } from 'react'
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const displayName = MultiLangUtils.getTextValue(album.name as any, currentLanguage)
  const displayDesc = MultiLangUtils.getHTMLValue(album.description as any, currentLanguage)
  const { url: coverImageUrl, loading: coverImageLoading } = useAlbumCoverImage(album._id)
  const childAlbumCount = (album as any).childAlbumCount ?? 0

  // Theme detection
  useEffect(() => {
    const checkTheme = () => {
      const stored = localStorage.getItem('theme')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDarkMode(stored === 'dark' || (!stored && prefersDark))
    }

    // Listen for theme changes from header
    const handleThemeChange = (event: CustomEvent) => {
      const newTheme = event.detail.theme
      const isDark = newTheme === 'dark'
      setIsDarkMode(isDark)
    }

    checkTheme()
    window.addEventListener('storage', checkTheme)
    window.addEventListener('themeChanged', handleThemeChange as EventListener)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', checkTheme)

    return () => {
      window.removeEventListener('storage', checkTheme)
      window.removeEventListener('themeChanged', handleThemeChange as EventListener)
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', checkTheme)
    }
  }, [])

  return (
    <Link href={`/albums/${album.alias}`}>
      <div 
        className={`group relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300 rounded-xl ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700 hover:shadow-2xl' 
            : 'bg-white border border-gray-100'
        } ${className}`}
      >
      {/* Cover Image */}
      <div className={`relative h-56 overflow-hidden flex-shrink-0 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-gray-700 to-gray-800' 
          : 'bg-gradient-to-br from-gray-100 to-gray-200'
      }`}>
        {!coverImageLoading && coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={displayName}
            className={`w-full h-full transition-transform duration-700 ease-out ${
              coverImageUrl.includes('/logos/') 
                ? 'object-contain bg-gray-50 p-4' 
                : 'object-cover group-hover:scale-110'
            }`}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.classList.remove('hidden')
            }}
          />
        ) : null}
        
        {/* Loading state */}
        {coverImageLoading && (
          <div className={`absolute inset-0 flex items-center justify-center ${
            isDarkMode 
              ? 'bg-gradient-to-br from-gray-700 to-gray-800' 
              : 'bg-gradient-to-br from-gray-100 to-gray-200'
          }`}>
            <div className="text-center">
              <div className={`w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-2 ${
                isDarkMode 
                  ? 'border-gray-600 border-t-blue-400' 
                  : 'border-gray-300 border-t-blue-500'
              }`}></div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</p>
            </div>
          </div>
        )}
        
        {/* Placeholder */}
        <div className={`absolute inset-0 flex items-center justify-center ${
          isDarkMode 
            ? 'bg-gradient-to-br from-gray-700 to-gray-800' 
            : 'bg-gradient-to-br from-gray-100 to-gray-200'
        } ${(!coverImageLoading && coverImageUrl) ? 'hidden' : ''}`}>
          <div className="text-center">
            <svg className={`w-16 h-16 mx-auto mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('noCoverImage')}</p>
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
      <div className={`p-5 flex-1 flex flex-col ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <h3 className={`text-lg font-bold mb-2 transition-colors duration-200 line-clamp-1 group-hover:text-blue-600 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {displayName}
        </h3>
        
        <div 
          className={`text-sm mb-4 line-clamp-2 leading-relaxed flex-1 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}
          dangerouslySetInnerHTML={{ __html: displayDesc }}
        />
        
        <div className={`flex items-center justify-between pt-4 border-t mt-auto ${
          isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
          <div className={`flex items-center text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>

            {typeof album.photoCount === 'number' && album.photoCount > 0 && (
              <>
                <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{t('emptyAlbum')}</span>
            )}
          </div>
          
          {album.createdAt && (
            <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {new Date(album.createdAt as any).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      </div>
    </Link>
  )
}
