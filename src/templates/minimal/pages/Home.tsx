'use client'

import { useState, useEffect } from 'react'
import Header from '../components/Header'
import Hero from '../components/Hero'
import AlbumList from '../components/AlbumList'
import Footer from '../components/Footer'
import { useI18n } from '@/hooks/useI18n'
import { useTemplateConfig } from '@/hooks/useTemplateConfig'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'

interface Album {
  _id: string
  name: string
  alias: string
  description: string
  photoCount: number
  childAlbumCount?: number
  coverImage?: string
  isPublic: boolean
  isFeatured: boolean
  createdAt: string
}

export default function HomePage() {
  const { t } = useI18n()
  const { isComponentVisible } = useTemplateConfig()
  const { currentLanguage } = useLanguage()
  const [rootAlbums, setRootAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRootAlbums = async () => {
      try {
        setLoading(true)
        // Fetch only root albums (no parent)
        const response = await fetch('/api/albums?parentId=root&isPublic=true')
        
        if (!response.ok) {
          throw new Error('Failed to fetch albums')
        }
        
        const result = await response.json()
        if (result.success) {
          const albums = result.data
          
          // Filter to only public albums
          const publicAlbums = albums.filter((album: Album) => album.isPublic)
          setRootAlbums(publicAlbums)
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      {isComponentVisible('hero') && <Hero />}
      
      {/* Albums Section */}
      {rootAlbums.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-4">
                {t('albums.galleryTitle')}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {t('albums.gallerySubtitle')}
              </p>
            </div>

            {/* Featured albums grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-16">
              {rootAlbums.slice(0, 8).map((album) => (
                <div key={album._id} className="group">
                  <div className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
                    {/* Image container */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      <img
                        src={album.coverImage || '/api/placeholder/400/300'}
                        alt={MultiLangUtils.getTextValue(album.name, currentLanguage)}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      
                      {/* Featured badge */}
                      {album.isFeatured && (
                        <div className="absolute top-4 right-4">
                          <div className="px-2 py-1 bg-black text-white text-xs font-medium">
                            Featured
                          </div>
                        </div>
                      )}

                      {/* Photo count */}
                      <div className="absolute bottom-4 left-4">
                        <div className="px-2 py-1 bg-white/90 text-gray-900 text-sm font-medium">
                          {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
                        </div>
                      </div>
                    </div>

                    {/* Content section */}
                    <div className="p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-2 group-hover:text-gray-700 transition-colors duration-300">
                        {MultiLangUtils.getTextValue(album.name, currentLanguage)}
                      </h3>
                      {album.description && (
                        <div 
                          className="text-gray-600 text-sm mb-4 line-clamp-2"
                          dangerouslySetInnerHTML={{ 
                            __html: MultiLangUtils.getHTMLValue(album.description, currentLanguage) 
                          }}
                        />
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          {typeof album.childAlbumCount === 'number' && album.childAlbumCount > 0 && (
                            <span>
                              {album.childAlbumCount} sub-albums
                            </span>
                          )}
                        </div>
                        <span className="text-xs">
                          {new Date(album.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* View all albums button */}
            {rootAlbums.length > 8 && (
              <div className="text-center">
                <a
                  href="/albums"
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-300"
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

      {/* Stats Section */}
      <section className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-light text-gray-900 mb-2">
                {rootAlbums.length}
              </div>
              <div className="text-gray-600">
                Albums Created
              </div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-light text-gray-900 mb-2">
                {rootAlbums.reduce((total, album) => total + album.photoCount, 0)}
              </div>
              <div className="text-gray-600">
                Photos Shared
              </div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-light text-gray-900 mb-2">
                24/7
              </div>
              <div className="text-gray-600">
                Always Available
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-6">
            Ready to Share Your Story?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Create clean galleries, organize your memories, and share them with the world.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/albums"
              className="px-6 py-3 bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors duration-300"
            >
              Explore Gallery
            </a>
            <a
              href="/login"
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-300"
            >
              Get Started
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      {isComponentVisible('footerMenu') && <Footer />}
    </div>
  )
}
