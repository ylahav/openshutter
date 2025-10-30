'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import { TemplateAlbum, TemplatePhoto } from '@/types'
import Header from '../components/Header'
import Footer from '../components/Footer'
import styles from '../styles.module.scss'

export default function GalleryPage() {
  const { config, loading: configLoading } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const [albums, setAlbums] = useState<TemplateAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coverPhotos, setCoverPhotos] = useState<Record<string, TemplatePhoto>>({})

  // Function to fetch cover photo for an album
  const fetchCoverPhoto = async (albumId: string, coverPhotoId: string) => {
    try {
      const response = await fetch(`/api/photos/${coverPhotoId}?t=${Date.now()}`, { cache: 'no-store' })
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setCoverPhotos(prev => ({
            ...prev,
            [albumId]: result.data
          }))
        }
      }
    } catch (error) {
      console.error(`Failed to fetch cover photo for album ${albumId}:`, error)
    }
  }

  useEffect(() => {
    const fetchRootAlbums = async () => {
      try {
        setLoading(true)
        setError(null)
        // Fetch only root albums (no parent) - API handles access control
        const response = await fetch('/api/albums?parentId=root&t=' + Date.now(), { cache: 'no-store' })
        
        if (!response.ok) {
          throw new Error('Failed to fetch albums')
        }
        
        const result = await response.json()
        if (result.success) {
          const albums = result.data
          
          // Sort albums by order
          const sortedAlbums = albums.sort((a: TemplateAlbum, b: TemplateAlbum) => (a.order || 0) - (b.order || 0))
          setAlbums(sortedAlbums)
          
          // Fetch cover photos for albums that have them
          sortedAlbums.forEach((album: TemplateAlbum) => {
            if (album.coverPhotoId) {
              fetchCoverPhoto(album._id, album.coverPhotoId)
            }
          })
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

  // Show loading state
  if (configLoading || loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading gallery...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="pt-28 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-12 text-center">
            <h1 className="text-5xl font-bold mb-4 text-foreground">Portfolio</h1>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mb-2"></div>
            <p className="text-muted-foreground text-lg">Explore our photo collections</p>
          </div>

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="text-primary hover:underline"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Albums Grid */}
          {!error && albums.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {albums.map((album, index) => (
                <Link key={album._id} href={`/albums/${album.alias}`}>
                  <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer">
                    {/* Cover Image */}
                    {album.coverPhotoId && coverPhotos[album._id] ? (
                      <div className="aspect-[4/3] relative overflow-hidden">
                        <Image
                          src={coverPhotos[album._id].storage?.thumbnailPath || coverPhotos[album._id].storage?.url || coverPhotos[album._id].url || '/placeholder.jpg'}
                          alt={MultiLangUtils.getTextValue(album.name, currentLanguage)}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <div className="text-5xl">📷</div>
                      </div>
                    )}
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    
                    {/* Album Info */}
                    <div className="p-4 bg-background/95 backdrop-blur-sm">
                      <h3 className="font-bold text-lg mb-1 line-clamp-1">
                        {MultiLangUtils.getTextValue(album.name, currentLanguage)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {album.photoCount || 0} photos
                        {album.childAlbumCount && album.childAlbumCount > 0 && (
                          <span> • {album.childAlbumCount} sub-albums</span>
                        )}
                      </p>
                      {album.description && (
                        <div 
                          className="text-xs text-muted-foreground mt-2 line-clamp-2"
                          dangerouslySetInnerHTML={{
                            __html: MultiLangUtils.getHTMLValue(album.description, currentLanguage)
                          }}
                        />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!error && !loading && albums.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📷</div>
              <h3 className="text-xl font-semibold mb-2">No albums yet</h3>
              <p className="text-muted-foreground">
                Albums will appear here once they are created.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
