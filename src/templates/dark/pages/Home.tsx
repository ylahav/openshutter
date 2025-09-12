'use client'

import { useState, useEffect } from 'react'
import Header from '../components/Header'
import Hero from '../components/Hero'
import AlbumList from '../components/AlbumList'
import AlbumCard from '../components/AlbumCard'
import Footer from '../components/Footer'
import { useI18n } from '@/hooks/useI18n'
import { useTemplateConfig } from '@/hooks/useTemplateConfig'
import { useAlbumPhotoCounts } from '@/hooks/useAlbumPhotoCounts'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { Album } from '@/types'

export default function HomePage() {
  const { t } = useI18n()
  const { isComponentVisible } = useTemplateConfig()
  const { currentLanguage } = useLanguage()
  const [rootAlbums, setRootAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getTotalPhotosCount, loading: photoCountsLoading } = useAlbumPhotoCounts(rootAlbums)

  useEffect(() => {
    const fetchRootAlbums = async () => {
      try {
        setLoading(true)
        // Fetch only root albums (no parent) - API handles access control
        const response = await fetch('/api/albums?parentId=root')
        
        if (!response.ok) {
          throw new Error('Failed to fetch albums')
        }
        
        const result = await response.json()
        if (result.success) {
          const albums = result.data
          
          // API already handles access control, so we can use all returned albums
          setRootAlbums(albums)
        } else {
          setError(result.error || 'Failed to fetch albums')
        }
      } catch (error) {
        console.error('Failed to fetch albums:', error)
        setError('Failed to fetch albums')
      } finally {
        setLoading(false)
      }
    }

    fetchRootAlbums()
  }, [])

  // Show loading state until all data is loaded
  if (loading || photoCountsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading gallery...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-lg">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Gallery</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      {isComponentVisible('hero') && <Hero />}
      
      {/* Albums Section */}
      {rootAlbums.length > 0 && (
        <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {t('albums.galleryTitle')}
                </span>
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                {t('albums.gallerySubtitle')}
              </p>
            </div>

            {/* Featured albums grid with dark theme */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-16">
              {rootAlbums.filter(album => album._id).slice(0, 8).map((album) => (
                <AlbumCard key={album._id} album={album} />
              ))}
            </div>

            {/* View all albums button with dark theme */}
            {rootAlbums.length > 8 && (
              <div className="text-center">
                <a
                  href="/albums"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
                >
                  View All Albums
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Statistics Section with dark theme */}
      {isComponentVisible('statistics') && (
        <section className="py-20 bg-gradient-to-r from-gray-900 to-black border-t border-gray-800">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="group">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors duration-300">
                  {rootAlbums.length}
                </div>
                <div className="text-gray-400">
                  Albums Created
                </div>
              </div>
              <div className="group">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors duration-300">
                  {getTotalPhotosCount()}
                </div>
                <div className="text-gray-400">
                  Photos Shared
                </div>
              </div>
              <div className="group">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors duration-300">
                  24/7
                </div>
                <div className="text-gray-400">
                  Always Available
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Promotion Section with dark theme */}
      {isComponentVisible('promotion') && (
        <section className="py-20 bg-gradient-to-br from-black via-gray-900 to-gray-800 border-t border-gray-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Ready to Share Your Story?
              </span>
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Create stunning galleries, organize your memories, and share them with the world in style.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/albums"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
              >
                Explore Gallery
              </a>
              <a
                href="/login"
                className="px-6 py-3 border border-gray-600 text-gray-300 font-medium rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-300"
              >
                Get Started
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <Footer />
    </div>
  )
}
