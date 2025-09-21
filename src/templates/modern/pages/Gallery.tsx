'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import Header from '../components/Header'
import Footer from '../components/Footer'
import styles from '../styles.module.scss'

interface Album {
  _id: string
  name: any // MultiLangText or string
  alias: string
  description: any // MultiLangHTML or string
  photoCount: number
  childAlbumCount?: number
  coverPhotoId?: string
  isPublic: boolean
  isFeatured: boolean
  createdAt: string
  level: number
  order: number
}

interface Photo {
  _id: string
  url?: string
  storage?: {
    url: string
    thumbnailPath: string
    path: string
    provider: string
  }
  alt?: string
}

export default function GalleryPage() {
  const { config, loading: configLoading } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coverPhotos, setCoverPhotos] = useState<Record<string, Photo>>({})

  // Function to fetch cover photo for an album
  const fetchCoverPhoto = async (albumId: string, coverPhotoId: string) => {
    try {
      const response = await fetch(`/api/photos/${coverPhotoId}`)
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
        // Fetch only root albums (no parent) - API handles access control
        const response = await fetch('/api/albums?parentId=root')
        
        if (!response.ok) {
          throw new Error('Failed to fetch albums')
        }
        
        const result = await response.json()
        if (result.success) {
          const albums = result.data
          
          // Debug: Log album data to see what we're getting
          console.log('Albums data:', albums)
          
          // API already handles access control, so we can use all returned albums
          const sortedAlbums = albums.sort((a: Album, b: Album) => a.order - b.order)
          setAlbums(sortedAlbums)
          
          // Fetch cover photos for albums that have them
          sortedAlbums.forEach((album: Album) => {
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

  // Show loading state while config or albums are loading
  if (configLoading || loading) {
    return (
      <div className={`min-h-screen ${styles.theme}`}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`w-16 h-16 ${styles.loading} rounded-full mx-auto mb-4`}></div>
            <div className={styles.textSecondary}>Loading gallery...</div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${styles.theme}`}>
      <Header />
      
      <main className="flex-1">

        {/* Error State */}
        {error && (
          <section className={styles.section}>
            <div className="max-w-6xl mx-auto text-center">
              <div className={`${styles.textSecondary} mb-4`}>
                {error}
              </div>
            </div>
          </section>
        )}

        {/* Gallery Grid */}
        <section className={styles.gallery}>
          <div className={styles.galleryGrid}>
            {albums.length > 0 ? (
              albums.map((album, i) => (
                <Link key={album._id} href={`/albums/${album.alias}`}>
                  <div className={`${styles.card} ${styles.animateScaleIn} h-full flex flex-col`} style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="overflow-hidden flex-shrink-0">
                      {album.coverPhotoId && coverPhotos[album._id] ? (
                        <img
                          src={coverPhotos[album._id].storage?.thumbnailPath || coverPhotos[album._id].url}
                          alt={MultiLangUtils.getTextValue(album.name, currentLanguage)}
                          className={styles.cardImage}
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            e.currentTarget.style.display = 'none'
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                            if (nextElement) {
                              nextElement.style.display = 'flex'
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className={`${styles.cardImage} ${styles.bgSecondary} flex items-center justify-center`}
                        style={{ display: (album.coverPhotoId && coverPhotos[album._id]) ? 'none' : 'flex' }}
                      >
                        <div className="text-4xl text-gray-400">📷</div>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className={`${styles.heading3} mb-2`}>
                        {MultiLangUtils.getTextValue(album.name, currentLanguage)}
                      </h3>
                      <div className={`${styles.textSecondary} text-sm mb-2`}>
                        {album.photoCount > 0 && (
                          <span>{album.photoCount} photos</span>
                        )}
                        {album.photoCount > 0 && album.childAlbumCount && album.childAlbumCount > 0 && (
                          <span> • </span>
                        )}
                        {album.childAlbumCount && album.childAlbumCount > 0 && (
                          <span>{album.childAlbumCount} sub-albums</span>
                        )}
                        {album.photoCount === 0 && (!album.childAlbumCount || album.childAlbumCount === 0) && (
                          <span>Empty album</span>
                        )}
                      </div>
                      {album.description && (
                        <div 
                          className={`${styles.textSecondary} text-sm flex-grow`}
                          dangerouslySetInnerHTML={{
                            __html: MultiLangUtils.getHTMLValue(album.description, currentLanguage)
                          }}
                        />
                      )}
                    </div>
                  </div>
                </Link>
              ))
            ) : !loading && !error && (
              <div className="col-span-full text-center py-12">
                <div className={`${styles.textSecondary} mb-4`}>
                  No albums found. Create your first album to get started!
                </div>
                <Link href="/albums/new" className={styles.button}>
                  Create New Album
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Call to Action - Commented out */}
        {/* <section className={`${styles.section} ${styles.bgSecondary}`}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className={`${styles.sectionTitle} ${styles.animateFadeInUp}`}>
              Ready to Create Your Own Gallery?
            </h2>
            <p className={`${styles.sectionContent} ${styles.animateFadeIn}`} style={{ animationDelay: '0.2s' }}>
              Join thousands of photographers who trust OpenShutter to showcase their work
            </p>
            <div className={styles.animateFadeIn} style={{ animationDelay: '0.4s' }}>
              <Link href="/albums/new" className={styles.button}>
                Create New Album
              </Link>
            </div>
          </div>
        </section> */}
      </main>
      
      <Footer />
    </div>
  )
}
