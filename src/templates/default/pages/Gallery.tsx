'use client'

import { useState, useEffect } from 'react'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import Header from '../components/Header'
import Footer from '../components/Footer'
import AlbumCard from '../components/AlbumCard'

import { TemplateAlbum } from '@/types/ui'

interface Album extends TemplateAlbum {
  order: number
}

export default function GalleryPage() {
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRootAlbums = async () => {
      try {
        setLoading(true)
        // Fetch only root albums (no parent)
        const response = await fetch('/api/albums?parentId=root')
        
        if (!response.ok) {
          throw new Error('Failed to fetch albums')
        }
        
        const result = await response.json()
        if (result.success) {
          const albums = result.data
          
          // API already handles access control, so we can use all returned albums
          const sortedAlbums = albums.sort((a: Album, b: Album) => a.order - b.order)
          setAlbums(sortedAlbums)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Main Content */}
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('albums')}
            </h1>
            <p className="text-lg text-gray-600">
              {t('browsePhotoCollections')}
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{t('loadingAlbums')}</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('errorLoadingAlbums')}</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : albums.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">{t('noAlbumsYet')}</h3>
              <p className="mt-1 text-gray-600">
                {t('noPublicAlbumsAvailable')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {albums.map((album) => (
                <AlbumCard
                  key={album._id}
                  album={{
                    _id: album._id,
                    name: album.name,
                    alias: album.alias,
                    description: album.description,
                    photoCount: album.photoCount,
                    coverImage: undefined, // TODO: Fetch cover image from coverPhotoId
                    isPublic: album.isPublic,
                    isFeatured: album.isFeatured,
                    createdAt: album.createdAt
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
