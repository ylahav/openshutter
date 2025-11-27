'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import { TemplateAlbum, TemplatePhoto } from '@/types'
import Header from '../components/Header'
import Footer from '../components/Footer'
import AlbumBreadcrumbs from '@/components/AlbumBreadcrumbs'
import PhotoLightbox from '@/components/PhotoLightbox'
import styles from '../styles.module.scss'

export default function AlbumPage() {
  const params = useParams()
  const alias = params?.alias as string
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()

  const [album, setAlbum] = useState<TemplateAlbum | null>(null)
  const [photos, setPhotos] = useState<TemplatePhoto[]>([])
  const [subAlbums, setSubAlbums] = useState<TemplateAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    const fetchAlbumData = async () => {
      if (!alias) return
      try {
        setLoading(true)

        const albumRes = await fetch(`/api/albums/by-alias/${alias}`)
        if (!albumRes.ok) throw new Error('Album not found')
        const albumJson = await albumRes.json()
        if (!albumJson.success) throw new Error(albumJson.error || 'Failed to fetch album')
        const a: TemplateAlbum = albumJson.data
        setAlbum(a)

        const photosRes = await fetch(`/api/albums/${a._id}/photos`)
        if (photosRes.ok) {
          const photosJson = await photosRes.json()
          if (photosJson.success) setPhotos(photosJson.data)
        }

        const subAlbumsRes = await fetch(`/api/albums?parentId=${a._id}`)
        if (subAlbumsRes.ok) {
          const subAlbumsJson = await subAlbumsRes.json()
          if (subAlbumsJson.success) setSubAlbums(subAlbumsJson.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch album')
      } finally {
        setLoading(false)
      }
    }

    fetchAlbumData()
  }, [alias])

  if (loading) {
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

  if (error || !album) {
    return (
      <div className={`min-h-screen ${styles.theme}`}>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`${styles.textSecondary} mb-4`}>{error || 'Album not found'}</div>
            <Link href="/albums" className={styles.button}>Back to Albums</Link>
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
            <AlbumBreadcrumbs album={album} role="public" />
          </div>
        )}
        
        <section className="py-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className={styles.sectionTitle}>
              {MultiLangUtils.getTextValue(album.name, currentLanguage)}
            </h1>
            {album.description && (
              <div
                className={styles.sectionContent}
                dangerouslySetInnerHTML={{
                  __html: MultiLangUtils.getHTMLValue(album.description, currentLanguage)
                }}
              />
            )}
          </div>
        </section>

        {subAlbums.length > 0 && (
          <section className="py-6">
            <div className="max-w-6xl mx-auto">
              <h2 className={styles.heading2}>Sub Albums</h2>
              <div className={styles.galleryGrid}>
                {subAlbums.map((sa) => (
                  <Link key={sa._id} href={`/albums/${sa.alias}`}>
                    <div className={`${styles.card} h-full`}> 
                      <div className="overflow-hidden">
                        <div className={`${styles.cardImage} ${styles.bgSecondary} flex items-center justify-center`}>
                          <div className="text-4xl text-gray-400">📁</div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className={styles.heading3}>
                          {MultiLangUtils.getTextValue(sa.name, currentLanguage)}
                        </h3>
                        <div className={styles.textSecondary}>
                          {sa.photoCount} photos
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {photos.length > 0 && (
          <section className={styles.gallery}>
            <div className="max-w-6xl mx-auto">
              <div className={styles.galleryGrid}>
                {photos.map((p, i) => (
                  <div 
                    key={p._id} 
                    className={`${styles.card} cursor-pointer`}
                    onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                  >
                    <div className="overflow-hidden">
                      <Image
                        src={p.storage?.thumbnailPath || p.url || '/placeholder.jpg'}
                        alt={p.alt ? MultiLangUtils.getTextValue(p.alt, currentLanguage) : `Photo ${i + 1}`}
                        width={400}
                        height={400}
                        className={styles.cardImage}
                        loading="lazy"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                        {typeof p.title === 'string' ? p.title : MultiLangUtils.getTextValue(p.title, currentLanguage) || `Photo ${i + 1}`}
                      </h3>
                      {p.description && (
                        <p className="text-xs text-gray-600 mt-1 mb-2 line-clamp-2">
                          {typeof p.description === 'string' ? p.description : MultiLangUtils.getTextValue(p.description, currentLanguage)}
                        </p>
                      )}
                      
                      {/* Tags, People, Location */}
                      {(p.tags?.length > 0 || p.people?.length > 0 || p.location) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {/* Tags */}
                          {p.tags && Array.isArray(p.tags) && p.tags.length > 0 && (
                            <>
                              {p.tags.slice(0, 2).map((tag: any, tagIdx: number) => (
                                <span key={tagIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                  {typeof tag === 'string' ? tag : tag.name || tag}
                                </span>
                              ))}
                              {p.tags.length > 2 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                  +{p.tags.length - 2}
                                </span>
                              )}
                            </>
                          )}
                          
                          {/* People */}
                          {p.people && Array.isArray(p.people) && p.people.length > 0 && (
                            <>
                              {p.people.slice(0, 2).map((person: any, personIdx: number) => {
                                const personName = typeof person === 'string' ? person : (person.name || person.fullName || person.firstName || person)
                                return (
                                  <span key={personIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                                    👤 {personName}
                                  </span>
                                )
                              })}
                              {p.people.length > 2 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                  +{p.people.length - 2}
                                </span>
                              )}
                            </>
                          )}
                          
                          {/* Location */}
                          {p.location && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800">
                              📍 {typeof p.location === 'string' ? p.location : p.location.name || ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {photos.length === 0 && subAlbums.length === 0 && (
          <section className="py-6">
            <div className="max-w-6xl mx-auto text-center">
              <div className={styles.textSecondary}>This album is empty.</div>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* PhotoLightbox */}
      <PhotoLightbox
        photos={photos.map(p => ({
          _id: p._id,
          url: p.storage?.url || p.url || '/placeholder.jpg',
          thumbnailUrl: p.storage?.thumbnailPath,
          title: typeof p.title === 'string' ? p.title : (p.title as any)?.en,
          takenAt: (p as any).exif?.dateTimeOriginal,
          exif: (p as any).exif ? {
            // Basic Camera Information
            make: (p as any).exif.make,
            model: (p as any).exif.model,
            serialNumber: (p as any).exif.serialNumber,
            
            // Date and Time
            dateTime: (p as any).exif.dateTime,
            dateTimeOriginal: (p as any).exif.dateTimeOriginal,
            dateTimeDigitized: (p as any).exif.dateTimeDigitized,
            offsetTime: (p as any).exif.offsetTime,
            offsetTimeOriginal: (p as any).exif.offsetTimeOriginal,
            offsetTimeDigitized: (p as any).exif.offsetTimeDigitized,
            
            // Camera Settings
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
            
            // Image Quality
            whiteBalance: (p as any).exif.whiteBalance,
            meteringMode: (p as any).exif.meteringMode,
            flash: (p as any).exif.flash,
            colorSpace: (p as any).exif.colorSpace,
            customRendered: (p as any).exif.customRendered,
            sceneCaptureType: (p as any).exif.sceneCaptureType,
            
            // Resolution
            xResolution: (p as any).exif.xResolution,
            yResolution: (p as any).exif.yResolution,
            resolutionUnit: (p as any).exif.resolutionUnit,
            focalPlaneXResolution: (p as any).exif.focalPlaneXResolution,
            focalPlaneYResolution: (p as any).exif.focalPlaneYResolution,
            focalPlaneResolutionUnit: (p as any).exif.focalPlaneResolutionUnit,
            
            // Lens Information
            lensInfo: (p as any).exif.lensInfo,
            lensModel: (p as any).exif.lensModel,
            lensSerialNumber: (p as any).exif.lensSerialNumber,
            
            // Software and Processing
            software: (p as any).exif.software,
            copyright: (p as any).exif.copyright,
            exifVersion: (p as any).exif.exifVersion,
            
            // GPS Information
            gps: (p as any).exif.gps ? {
              latitude: (p as any).exif.gps.latitude,
              longitude: (p as any).exif.gps.longitude,
              altitude: (p as any).exif.gps.altitude,
            } : undefined,
            
            // Additional Technical Data
            recommendedExposureIndex: (p as any).exif.recommendedExposureIndex,
            subsecTimeOriginal: (p as any).exif.subsecTimeOriginal,
            subsecTimeDigitized: (p as any).exif.subsecTimeDigitized,
            
            // Legacy fields for backward compatibility
            gpsLatitude: (p as any).exif.gpsLatitude,
            gpsLongitude: (p as any).exif.gpsLongitude,
          } : undefined,
          metadata: (p as any).metadata ? {
            width: (p as any).metadata.width,
            height: (p as any).metadata.height,
            fileSize: (p as any).metadata.fileSize,
            format: (p as any).metadata.format,
          } : undefined,
        }))}
        startIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        autoPlay={false}
        intervalMs={4000}
      />
    </div>
  )
}
