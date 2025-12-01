'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { useMultipleAlbumCoverImages } from '@/hooks/useAlbumCoverImage'
import { TemplateAlbum } from '@/types'

export default function AlbumsSection() {
  const [albums, setAlbums] = useState<TemplateAlbum[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false) // TODO: Replace with actual auth state
  const { currentLanguage } = useLanguage()
  
  // Get cover images for all albums
  const albumIds = albums.map(album => album._id)
  const { coverImages, loading: coverImagesLoading } = useMultipleAlbumCoverImages(albumIds)

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        // Fetch only root albums (level 0)
        const response = await fetch('/api/albums?level=0')
        if (!response.ok) {
          throw new Error('Failed to fetch albums')
        }
        
        const result = await response.json()
        if (result.success) {
          // Filter to only root albums (level 0)
          const rootAlbums = result.data.filter((album: TemplateAlbum) => album.level === 0)
          setAlbums(rootAlbums)
        } else {
          console.error('API returned error:', result.error)
        }
      } catch (error) {
        console.error('Failed to fetch albums:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlbums()
  }, [isLoggedIn])

  if (isLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading albums...</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {albums.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No albums available</h3>
            <p className="mt-1 text-sm text-gray-500">
              {isLoggedIn 
                ? 'Create your first album to get started'
                : 'Check back later for new public albums'
              }
            </p>
            {isLoggedIn && (
              <div className="mt-6">
                <Link href="/albums/new" className="btn-primary">
                  Create Album
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {albums.map((album) => (
              <div key={album._id} className="card hover:shadow-xl transition-all duration-300 group">
                <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-t-lg overflow-hidden">
                  {coverImages[album._id] ? (
                    <img
                      src={coverImages[album._id]}
                      alt={MultiLangUtils.getTextValue(album.name, currentLanguage)}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : coverImagesLoading ? (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <svg className="w-16 h-16 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="card-body">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {MultiLangUtils.getTextValue(album.name, currentLanguage)}
                    </h3>
                    {album.isFeatured && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Featured
                      </span>
                    )}
                  </div>
                  
                  <div 
                    className="text-gray-600 mb-4 line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: album.description ? MultiLangUtils.getHTMLValue(album.description, currentLanguage) || 'No description available' : 'No description available'
                    }}
                  />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {album.photoCount || 0} photos
                    </span>
                    <Link 
                      href={`/albums/${album.alias}`} 
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm group-hover:underline"
                    >
                      View Album →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
