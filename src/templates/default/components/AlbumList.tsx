'use client'

import { useState, useEffect } from 'react'
import AlbumCard from './AlbumCard'
import { useI18n } from '@/hooks/useI18n'
import { TemplateAlbum } from '@/types/ui'

interface AlbumListProps {
  albums?: TemplateAlbum[]
  loading?: boolean
  error?: string | null
  title?: string
  subtitle?: string
  showFeatured?: boolean
  className?: string
}

export default function AlbumList({
  albums: propAlbums,
  loading: propLoading,
  error: propError,
  title = "Albums",
  subtitle = "Explore our photo collections",
  showFeatured = false,
  className = ''
}: AlbumListProps) {
  const [albums, setAlbums] = useState<TemplateAlbum[]>(propAlbums || [])
  const [loading, setLoading] = useState(propLoading || false)
  const [error, setError] = useState<string | null>(propError || null)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
  const { t } = useI18n()

  useEffect(() => {
    if (propAlbums) {
      setAlbums(propAlbums)
    }
  }, [propAlbums])

  useEffect(() => {
    if (propLoading !== undefined) {
      setLoading(propLoading)
    }
  }, [propLoading])

  useEffect(() => {
    if (propError !== undefined) {
      setError(propError)
    }
  }, [propError])

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

  // Filter albums if needed
  const filteredAlbums = showFeatured 
    ? albums.filter(album => !!album.isFeatured)
    : albums

  if (loading) {
    return (
      <div className={`py-12 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('loading.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`py-12 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className={`py-12 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Albums Masonry Grid */}
        {filteredAlbums.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 [column-fill:_balance]"><div className="[&>*]:mb-6">
            {filteredAlbums.map((album, idx) => (
              <div key={album._id} className={`break-inside-avoid ${idx % 5 === 0 ? 'transform md:translate-y-2' : idx % 7 === 0 ? 'transform md:-translate-y-2' : ''}`}>
                <AlbumCard
                  album={album}
                  className="h-full shadow-sm hover:shadow-md transition-shadow duration-300"
                />
              </div>
            ))}
          </div></div>
        ) : (
          <div className="text-center py-12">
            <svg className={`mx-auto h-12 w-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {showFeatured ? t('albums.noFeaturedTitle', 'No featured albums') : t('albums.noAlbumsTitle')}
            </h3>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {showFeatured 
                ? t('albums.noFeaturedText', 'No albums have been marked as featured yet.')
                : t('albums.noAlbumsText')
              }
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
