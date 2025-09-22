'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import { TemplateAlbum, TemplatePhoto } from '@/types'
import Header from '../components/Header'
import Footer from '../components/Footer'
import styles from '../styles.module.scss'

export default function AlbumPage() {
  const params = useParams()
  const alias = params?.alias as string
  const { config, loading: configLoading } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const [album, setAlbum] = useState<TemplateAlbum | null>(null)
  const [photos, setPhotos] = useState<TemplatePhoto[]>([])
  const [subAlbums, setSubAlbums] = useState<TemplateAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subAlbumCoverPhotos, setSubAlbumCoverPhotos] = useState<Record<string, TemplatePhoto>>({})

  // Function to fetch cover photo for a sub-album
  const fetchSubAlbumCoverPhoto = async (albumId: string, coverPhotoId: string) => {
    try {
      const response = await fetch(`/api/photos/${coverPhotoId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSubAlbumCoverPhotos(prev => ({
            ...prev,
            [albumId]: result.data
          }))
        }
      }
    } catch (error) {
      console.error(`Failed to fetch cover photo for sub-album ${albumId}:`, error)
    }
  }

  useEffect(() => {
    const fetchAlbumData = async () => {
      if (!alias) return
      
      try {
        setLoading(true)
        
        // Fetch album by alias
        const albumResponse = await fetch(`/api/albums/by-alias/${alias}`)
        if (!albumResponse.ok) {
          throw new Error('Album not found')
        }
        
        const albumResult = await albumResponse.json()
        if (!albumResult.success) {
          throw new Error(albumResult.error || 'Failed to fetch album')
        }
        
        setAlbum(albumResult.data)
        
        // Fetch photos for this album
        const photosResponse = await fetch(`/api/albums/${albumResult.data._id}/photos`)
        if (photosResponse.ok) {
          const photosResult = await photosResponse.json()
          if (photosResult.success) {
            setPhotos(photosResult.data)
          }
        }
        
        // Fetch sub-albums
        const subAlbumsResponse = await fetch(`/api/albums?parentId=${albumResult.data._id}`)
        if (subAlbumsResponse.ok) {
          const subAlbumsResult = await subAlbumsResponse.json()
          if (subAlbumsResult.success) {
            setSubAlbums(subAlbumsResult.data)
            
            // Fetch cover photos for sub-albums that have them
            subAlbumsResult.data.forEach((subAlbum: TemplateAlbum) => {
              if (subAlbum.coverPhotoId) {
                fetchSubAlbumCoverPhoto(subAlbum._id, subAlbum.coverPhotoId)
              }
            })
          }
        }
        
      } catch (error) {
        console.error('Failed to fetch album data:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch album')
      } finally {
        setLoading(false)
      }
    }

    fetchAlbumData()
  }, [alias])

  // Show loading state while config or album is loading
  if (configLoading || loading) {
    return (
      <div className={`min-h-screen ${styles.theme}`}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`w-16 h-16 ${styles.loading} rounded-full mx-auto mb-4`}></div>
            <div className={styles.textSecondary}>Loading album...</div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className={`min-h-screen ${styles.theme}`}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`${styles.textSecondary} mb-4`}>
              {error}
            </div>
            <Link href="/albums" className={styles.button}>
              Back to Albums
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Show not found state
  if (!album) {
    return (
      <div className={`min-h-screen ${styles.theme}`}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`${styles.textSecondary} mb-4`}>
              Album not found
            </div>
            <Link href="/albums" className={styles.button}>
              Back to Albums
            </Link>
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
        {/* Album Header */}
        <section className={styles.section}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <Link href="/albums" className={`${styles.textSecondary} hover:${styles.text} transition-colors`}>
                ← Back to Albums
              </Link>
              <div className={`${styles.textSecondary} text-sm`}>
                {photos.length} photos
                {subAlbums.length > 0 && (
                  <span> • {subAlbums.length} sub-albums</span>
                )}
              </div>
            </div>
            
            <div className="text-center">
              <h1 className={`${styles.sectionTitle} ${styles.animateFadeInUp}`}>
                {MultiLangUtils.getTextValue(album.name, currentLanguage)}
              </h1>
              {album.description && (
                <div 
                  className={`${styles.sectionContent} ${styles.animateFadeIn}`} 
                  style={{ animationDelay: '0.2s' }}
                  dangerouslySetInnerHTML={{
                    __html: MultiLangUtils.getHTMLValue(album.description, currentLanguage)
                  }}
                />
              )}
            </div>
          </div>
        </section>

        {/* Sub-albums Section */}
        {subAlbums.length > 0 && (
          <section className={styles.section}>
            <div className="max-w-6xl mx-auto">
              <div className={styles.galleryGrid}>
                {subAlbums.map((subAlbum, i) => (
                  <Link key={subAlbum._id} href={`/albums/${subAlbum.alias}`}>
                    <div className={`${styles.card} ${styles.animateScaleIn} h-full flex flex-col`} style={{ animationDelay: `${i * 0.1}s` }}>
                      <div className="overflow-hidden flex-shrink-0">
                        {subAlbum.coverPhotoId && subAlbumCoverPhotos[subAlbum._id] ? (
                          <Image
                            src={subAlbumCoverPhotos[subAlbum._id].storage?.thumbnailPath || subAlbumCoverPhotos[subAlbum._id].url || '/placeholder.jpg'}
                            alt={MultiLangUtils.getTextValue(subAlbum.name, currentLanguage)}
                            width={400}
                            height={300}
                            className={styles.cardImage}
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            loading="lazy"
                            fetchPriority={i < 2 ? 'low' : 'auto'}
                          />
                        ) : null}
                        <div 
                          className={`${styles.cardImage} ${styles.bgSecondary} flex items-center justify-center`}
                          style={{ display: (subAlbum.coverPhotoId && subAlbumCoverPhotos[subAlbum._id]) ? 'none' : 'flex' }}
                        >
                          <div className="text-4xl text-gray-400">📁</div>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                        <h3 className={`${styles.heading3} mb-2`}>
                          {MultiLangUtils.getTextValue(subAlbum.name, currentLanguage)}
                        </h3>
                        <div className={`${styles.textSecondary} text-sm mb-2`}>
                          {subAlbum.photoCount > 0 && (
                            <span>{subAlbum.photoCount} photos</span>
                          )}
                          {subAlbum.photoCount === 0 && (
                            <span>Empty album</span>
                          )}
                        </div>
                        {subAlbum.description && (
                          <div 
                            className={`${styles.textSecondary} text-sm flex-grow`}
                            dangerouslySetInnerHTML={{
                              __html: MultiLangUtils.getHTMLValue(subAlbum.description, currentLanguage)
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Photos Section */}
        {photos.length > 0 && (
          <section className={styles.gallery}>
            <div className="max-w-6xl mx-auto">
              <div className={styles.galleryGrid}>
                {photos.map((photo, i) => (
                  <div 
                    key={photo._id} 
                    className={`${styles.card} ${styles.animateScaleIn} cursor-pointer`} 
                    style={{ animationDelay: `${i * 0.05}s` }}
                    onClick={() => setSelectedImage(i)}
                  >
                    <div className="overflow-hidden">
                      <Image
                        src={photo.storage?.thumbnailPath || photo.url || '/placeholder.jpg'}
                        alt={photo.alt ? MultiLangUtils.getTextValue(photo.alt, currentLanguage) : `Photo ${i + 1}`}
                        width={400}
                        height={300}
                        className={styles.cardImage}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        loading="lazy"
                        fetchPriority="low"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className={`${styles.heading3} mb-1`}>
                        {MultiLangUtils.getTextValue(photo.title, currentLanguage) || `Photo ${i + 1}`}
                      </h3>
                      {photo.description && (
                        <div 
                          className={`${styles.textSecondary} text-sm`}
                          dangerouslySetInnerHTML={{
                            __html: MultiLangUtils.getHTMLValue(photo.description, currentLanguage)
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Empty State */}
        {photos.length === 0 && subAlbums.length === 0 && (
          <section className={styles.section}>
            <div className="max-w-6xl mx-auto text-center">
              <div className={`${styles.textSecondary} mb-4`}>
                This album is empty.
              </div>
            </div>
          </section>
        )}

        {/* Image Modal */}
        {selectedImage !== null && photos[selectedImage] && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              <Image
                src={photos[selectedImage].storage?.url || photos[selectedImage].url || '/placeholder.jpg'}
                alt={photos[selectedImage].alt ? MultiLangUtils.getTextValue(photos[selectedImage].alt, currentLanguage) : `Photo ${selectedImage + 1}`}
                width={1200}
                height={800}
                className="max-w-full max-h-full object-contain rounded-lg"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 transition-colors"
                style={{ color: 'white' }}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Navigation - Commented out */}
        {/* <section className={`${styles.section} ${styles.bgSecondary}`}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className={`${styles.sectionTitle} ${styles.animateFadeInUp}`}>
              Explore More Albums
            </h2>
            <p className={`${styles.sectionContent} ${styles.animateFadeIn}`} style={{ animationDelay: '0.2s' }}>
              Discover more beautiful photo collections
            </p>
            <div className={styles.animateFadeIn} style={{ animationDelay: '0.4s' }}>
              <Link href="/albums" className={styles.button}>
                View All Albums
              </Link>
            </div>
          </div>
        </section> */}
      </main>
      
      <Footer />
    </div>
  )
}
