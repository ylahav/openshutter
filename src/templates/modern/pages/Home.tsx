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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      {isComponentVisible('hero') && <Hero />}
      
      {/* Featured Albums Section */}
      {rootAlbums.length > 0 && (
        <section className="py-20 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent mb-6">
                {t('albums.galleryTitle')}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                {t('albums.gallerySubtitle')}
              </p>
            </div>

            {/* Featured albums grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-16">
              {rootAlbums.slice(0, 8).map((album) => (
                <div key={album._id} className="group">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2">
                    {/* Image container */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={album.coverImage || '/api/placeholder/400/300'}
                        alt={MultiLangUtils.getTextValue(album.name, currentLanguage)}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Featured badge */}
                      {album.isFeatured && (
                        <div className="absolute top-4 right-4">
                          <div className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                            ⭐ Featured
                          </div>
                        </div>
                      )}

                      {/* Photo count badge */}
                      <div className="absolute bottom-4 left-4">
                        <div className="px-3 py-1 bg-black/50 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                          📸 {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
                        </div>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                          <div className="px-6 py-3 bg-white/20 backdrop-blur-xl border border-white/30 text-white font-semibold rounded-full hover:bg-white/30 transition-colors duration-300">
                            View Album →
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content section */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300 line-clamp-2">
                        {MultiLangUtils.getTextValue(album.name, currentLanguage)}
                      </h3>
                      {album.description && (
                        <div 
                          className="text-gray-600 text-sm mb-4 line-clamp-2 group-hover:text-gray-700 transition-colors duration-300"
                          dangerouslySetInnerHTML={{ 
                            __html: MultiLangUtils.getHTMLValue(album.description, currentLanguage) 
                          }}
                        />
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          {album.childAlbumCount && album.childAlbumCount > 0 && (
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                              </svg>
                              <span>{album.childAlbumCount} sub-albums</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(album.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short'
                          })}
                        </div>
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
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-full shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  View All Albums
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="group">
              <div className="text-4xl md:text-5xl font-bold mb-4 group-hover:scale-110 transition-transform duration-300">
                {rootAlbums.length}
              </div>
              <div className="text-xl text-purple-100">
                Albums Created
              </div>
            </div>
            <div className="group">
              <div className="text-4xl md:text-5xl font-bold mb-4 group-hover:scale-110 transition-transform duration-300">
                {rootAlbums.reduce((total, album) => total + album.photoCount, 0)}
              </div>
              <div className="text-xl text-purple-100">
                Photos Shared
              </div>
            </div>
            <div className="group">
              <div className="text-4xl md:text-5xl font-bold mb-4 group-hover:scale-110 transition-transform duration-300">
                24/7
              </div>
              <div className="text-xl text-purple-100">
                Always Available
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 bg-clip-text text-transparent mb-6">
            Ready to Share Your Story?
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Create beautiful galleries, organize your memories, and share them with the world.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/albums"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-full shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Explore Gallery
            </a>
            <a
              href="/login"
              className="px-8 py-4 border-2 border-purple-600 text-purple-600 font-semibold rounded-full hover:bg-purple-600 hover:text-white transition-all duration-300"
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
