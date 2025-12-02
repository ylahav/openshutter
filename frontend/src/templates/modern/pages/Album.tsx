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
import AlbumBreadcrumbs from '@/components/AlbumBreadcrumbs'
import styles from '../styles.module.scss'
import PhotoLightbox from '@/components/PhotoLightbox'

export default function AlbumPage() {
  const params = useParams()
  const alias = params?.alias as string
  const { config, loading: configLoading } = useSiteConfig()
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [album, setAlbum] = useState<TemplateAlbum | null>(null)
  const [photos, setPhotos] = useState<TemplatePhoto[]>([])
  const [subAlbums, setSubAlbums] = useState<TemplateAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subAlbumCoverPhotos, setSubAlbumCoverPhotos] = useState<Record<string, TemplatePhoto>>({})
  const [pagination, setPagination] = useState<{ page: number; limit: number; total: number; pages: number } | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  // Function to load more photos
  const loadMorePhotos = async () => {
    if (!album || !pagination || loadingMore) return
    
    const albumId = String(album._id)
    const nextPage = pagination.page + 1
    
    if (nextPage > pagination.pages) return // No more pages
    
    try {
      setLoadingMore(true)
      const photosResponse = await fetch(`/api/albums/${albumId}/photos?page=${nextPage}&limit=50&t=${Date.now()}`, { cache: 'no-store' })
      if (photosResponse.ok) {
        const photosResult = await photosResponse.json()
        const newPhotos = photosResult.photos || []
        setPhotos(prev => [...prev, ...newPhotos])
        if (photosResult.pagination) {
          setPagination(photosResult.pagination)
        }
      }
    } catch (error) {
      console.error('Failed to load more photos:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Function to fetch cover photo for a sub-album
  const fetchSubAlbumCoverPhoto = async (albumId: string, coverPhotoId: string) => {
    try {
      const response = await fetch(`/api/photos/${coverPhotoId}?t=${Date.now()}`, { cache: 'no-store' })
      if (response.ok) {
        const photo = await response.json()
        setSubAlbumCoverPhotos(prev => ({
          ...prev,
          [albumId]: photo
        }))
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
        const albumResponse = await fetch(`/api/albums/by-alias/${alias}?t=${Date.now()}`, { cache: 'no-store' })
        if (!albumResponse.ok) {
          throw new Error('Album not found')
        }
        
        const album = await albumResponse.json()
        setAlbum(album)
        
        // Convert album._id to string (handles both string and ObjectId)
        const albumId = String(album._id || '')
        
        // Fetch photos for this album (first page)
        const photosResponse = await fetch(`/api/albums/${albumId}/photos?page=1&limit=50&t=${Date.now()}`, { cache: 'no-store' })
        if (photosResponse.ok) {
          const photosResult = await photosResponse.json()
          // Backend returns { photos: [...], pagination: {...} }
          const photosData = photosResult.photos || []
          setPhotos(Array.isArray(photosData) ? photosData : [])
          if (photosResult.pagination) {
            setPagination(photosResult.pagination)
          }
        }
        
        // Fetch sub-albums
        console.log('Fetching sub-albums for album:', { alias, albumId, album })
        const subAlbumsResponse = await fetch(`/api/albums?parentId=${albumId}&t=${Date.now()}`, { cache: 'no-store' })
        if (subAlbumsResponse.ok) {
          const subAlbums = await subAlbumsResponse.json()
          console.log('Sub-albums response:', subAlbums)
          console.log('First sub-album sample:', subAlbums[0] ? {
            _id: subAlbums[0]._id,
            alias: subAlbums[0].alias,
            name: subAlbums[0].name,
            nameType: typeof subAlbums[0].name
          } : 'No albums')
          // Backend returns array directly
          setSubAlbums(Array.isArray(subAlbums) ? subAlbums : [])
          
          // Fetch cover photos for sub-albums that have them
          subAlbums.forEach((subAlbum: TemplateAlbum) => {
            if (subAlbum.coverPhotoId) {
              fetchSubAlbumCoverPhoto(subAlbum._id, subAlbum.coverPhotoId)
            }
          })
        } else {
          console.error('Failed to fetch sub-albums:', subAlbumsResponse.status, subAlbumsResponse.statusText)
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
        {/* Breadcrumbs */}
        {album && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-1">
            <AlbumBreadcrumbs album={album} role="public" />
          </div>
        )}
        
        {/* Album Header */}
        <section className={styles.sectionTight}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-end mb-4">
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
          <section className={styles.sectionTight}>
            <div className="max-w-6xl mx-auto">
              <div className={styles.galleryGrid}>
                {subAlbums.map((subAlbum, i) => (
                  <Link key={subAlbum._id} href={`/albums/${subAlbum.alias}`}>
                    <div className={`${styles.card} ${styles.animateScaleIn} h-full flex flex-col`} style={{ animationDelay: `${i * 0.1}s` }}>
                      <div className="overflow-hidden shrink-0">
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
                      <div className="p-4 flex flex-col grow">
                        <h3 className={`${styles.heading3} mb-2`}>
                          {subAlbum.name 
                            ? (typeof subAlbum.name === 'string' 
                                ? subAlbum.name 
                                : MultiLangUtils.getTextValue(subAlbum.name, currentLanguage))
                            : subAlbum.alias || 'Untitled Album'}
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
                            className={`${styles.textSecondary} text-sm grow`}
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
          <section className={`${styles.gallery} ${styles.sectionTight}`}>
            <div className="max-w-6xl mx-auto">
              <div className={styles.galleryGrid}>
                {photos.map((photo, i) => (
                  <div 
                    key={photo._id} 
                    className={`${styles.card} ${styles.animateScaleIn} cursor-pointer`} 
                    style={{ animationDelay: `${i * 0.05}s` }}
                    onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
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
                          className={`${styles.textSecondary} text-sm mb-2`}
                          dangerouslySetInnerHTML={{
                            __html: MultiLangUtils.getHTMLValue(photo.description, currentLanguage)
                          }}
                        />
                      )}
                      
                      {/* Tags, People, Location */}
                      {(photo.tags?.length > 0 || photo.people?.length > 0 || photo.location) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {/* Tags */}
                          {photo.tags && Array.isArray(photo.tags) && photo.tags.length > 0 && (
                            <>
                              {photo.tags.slice(0, 2).map((tag: any, tagIdx: number) => {
                                const tagName = typeof tag === 'string' 
                                  ? tag 
                                  : (tag.name 
                                      ? (typeof tag.name === 'string' 
                                          ? tag.name 
                                          : MultiLangUtils.getTextValue(tag.name, currentLanguage))
                                      : 'Untagged')
                                return (
                                  <span key={tagIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                    {tagName}
                                  </span>
                                )
                              })}
                              {photo.tags.length > 2 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                  +{photo.tags.length - 2}
                                </span>
                              )}
                            </>
                          )}
                          
                          {/* People */}
                          {photo.people && Array.isArray(photo.people) && photo.people.length > 0 && (
                            <>
                              {photo.people.slice(0, 2).map((person: any, personIdx: number) => {
                                let personName: string
                                if (typeof person === 'string') {
                                  personName = person
                                } else if (person.name) {
                                  personName = typeof person.name === 'string' 
                                    ? person.name 
                                    : MultiLangUtils.getTextValue(person.name, currentLanguage)
                                } else if (person.fullName) {
                                  personName = typeof person.fullName === 'string'
                                    ? person.fullName
                                    : MultiLangUtils.getTextValue(person.fullName, currentLanguage)
                                } else if (person.firstName) {
                                  personName = typeof person.firstName === 'string'
                                    ? person.firstName
                                    : MultiLangUtils.getTextValue(person.firstName, currentLanguage)
                                } else {
                                  personName = 'Unknown'
                                }
                                return (
                                  <span key={personIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                                    👤 {personName}
                                  </span>
                                )
                              })}
                              {photo.people.length > 2 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                  +{photo.people.length - 2}
                                </span>
                              )}
                            </>
                          )}
                          
                          {/* Location */}
                          {photo.location && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800">
                              📍 {typeof photo.location === 'string' 
                                ? photo.location 
                                : (photo.location.name 
                                    ? MultiLangUtils.getTextValue(photo.location.name, currentLanguage)
                                    : 'Unknown location')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Load More Button */}
              {pagination && pagination.page < pagination.pages && (
                <div className="text-center mt-8">
                  <button
                    onClick={loadMorePhotos}
                    disabled={loadingMore}
                    className={`${styles.button} ${loadingMore ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loadingMore ? 'Loading...' : `Load More (${pagination.total - photos.length} remaining)`}
                  </button>
                </div>
              )}
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

        {/* Photo Lightbox: prev/next, EXIF toggle, autoplay support */}
        <PhotoLightbox
          photos={photos.map(p => ({
            _id: p._id,
            url: p.storage?.url || p.url || '/placeholder.jpg',
            thumbnailUrl: p.storage?.thumbnailPath,
            title: typeof p.title === 'string' ? p.title : (p.title as any)?.[currentLanguage] || (p.title as any)?.en,
            takenAt: (p as any).exif?.dateTimeOriginal,
            exif: (p as any).exif ? {
              make: (p as any).exif.make,
              model: (p as any).exif.model,
              serialNumber: (p as any).exif.serialNumber,
              dateTime: (p as any).exif.dateTime,
              dateTimeOriginal: (p as any).exif.dateTimeOriginal,
              dateTimeDigitized: (p as any).exif.dateTimeDigitized,
              offsetTime: (p as any).exif.offsetTime,
              offsetTimeOriginal: (p as any).exif.offsetTimeOriginal,
              offsetTimeDigitized: (p as any).exif.offsetTimeDigitized,
              exposureTime: (p as any).exif.exposureTime,
              fNumber: (p as any).exif.fNumber,
              iso: (p as any).exif.iso,
              focalLength: (p as any).exif.focalLength,
              exposureProgram: (p as any).exif.exposureProgram,
              exposureMode: (p as any).exif.exposureMode,
              exposureBiasValue: (p as any).exif.exposureBiasValue,
              maxApertureValue: (p as any).exif.maxApertureValue,
              shutterSpeedValue: (p as any).exif.shutterSpeedValue,
              apertureValue: (p as any).exif.apertureValue,
              whiteBalance: (p as any).exif.whiteBalance,
              meteringMode: (p as any).exif.meteringMode,
              flash: (p as any).exif.flash,
              colorSpace: (p as any).exif.colorSpace,
              customRendered: (p as any).exif.customRendered,
              sceneCaptureType: (p as any).exif.sceneCaptureType,
              xResolution: (p as any).exif.xResolution,
              yResolution: (p as any).exif.yResolution,
              resolutionUnit: (p as any).exif.resolutionUnit,
              focalPlaneXResolution: (p as any).exif.focalPlaneXResolution,
              focalPlaneYResolution: (p as any).exif.focalPlaneYResolution,
              focalPlaneResolutionUnit: (p as any).exif.focalPlaneResolutionUnit,
              lensInfo: (p as any).exif.lensInfo,
              lensModel: (p as any).exif.lensModel,
              lensSerialNumber: (p as any).exif.lensSerialNumber,
              software: (p as any).exif.software,
              copyright: (p as any).exif.copyright,
              exifVersion: (p as any).exif.exifVersion,
              gps: (p as any).exif.gps ? {
                latitude: (p as any).exif.gps.latitude,
                longitude: (p as any).exif.gps.longitude,
                altitude: (p as any).exif.gps.altitude,
              } : undefined,
              recommendedExposureIndex: (p as any).exif.recommendedExposureIndex,
              subsecTimeOriginal: (p as any).exif.subsecTimeOriginal,
              subsecTimeDigitized: (p as any).exif.subsecTimeDigitized,
              gpsLatitude: (p as any).exif.gpsLatitude,
              gpsLongitude: (p as any).exif.gpsLongitude,
            } : undefined,
            metadata: (p as any).metadata ? {
              width: (p as any).metadata.width,
              height: (p as any).metadata.height,
              fileSize: (p as any).metadata.fileSize,
              format: (p as any).metadata.format,
            } : undefined,
            faceRecognition: (p as any).faceRecognition ? {
              faces: (p as any).faceRecognition.faces?.map((face: any) => ({
                box: face.box,
                matchedPersonId: face.matchedPersonId?.toString(),
                confidence: face.confidence
              })) || []
            } : undefined,
          }))}
          startIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          autoPlay={false}
          intervalMs={4000}
        />

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
