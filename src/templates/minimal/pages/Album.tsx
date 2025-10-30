'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAlbumData } from '@/hooks/useAlbumData'
import Header from '../components/Header'
import Footer from '../components/Footer'
import PhotoLightbox from '@/components/PhotoLightbox'

export default function AlbumPage() {
  const params = useParams()
  const alias = params?.alias as string
  const { currentLanguage } = useLanguage()
  const { album, photos, subAlbums, loading, error, subAlbumCoverPhotos } = useAlbumData(alias)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading album...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !album) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Error</h1>
            <p className="text-muted-foreground mb-4">{error || 'Album not found'}</p>
            <Link href="/albums" className="text-primary hover:underline">
              Back to Albums
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Album Header */}
        <div className="mb-8">
          <Link href="/albums" className="text-muted-foreground hover:text-foreground mb-4 inline-block">
            ← Back to Albums
          </Link>
          <h1 className="text-3xl font-bold mb-4">
            {MultiLangUtils.getTextValue(album.name, currentLanguage)}
          </h1>
          {album.description && (
            <div 
              className="text-muted-foreground prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: MultiLangUtils.getHTMLValue(album.description, currentLanguage)
              }}
            />
          )}
        </div>

        {/* Sub-albums */}
        {subAlbums.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Sub Albums</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subAlbums.map((subAlbum) => (
                <Link key={subAlbum._id} href={`/albums/${subAlbum.alias}`}>
                  <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    {subAlbum.coverPhotoId && subAlbumCoverPhotos[subAlbum._id] ? (
                      <Image
                        src={subAlbumCoverPhotos[subAlbum._id].storage?.thumbnailPath || subAlbumCoverPhotos[subAlbum._id].url || '/placeholder.jpg'}
                        alt={MultiLangUtils.getTextValue(subAlbum.name, currentLanguage)}
                        width={400}
                        height={300}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-muted flex items-center justify-center">
                        <div className="text-4xl">📁</div>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold mb-2">
                        {MultiLangUtils.getTextValue(subAlbum.name, currentLanguage)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {subAlbum.photoCount || 0} photos
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Photos Grid */}
        {photos.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Photos</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo, i) => (
                <div
                  key={photo._id}
                  className="cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                >
                  <div className="aspect-square relative">
                    <Image
                      src={photo.storage?.thumbnailPath || photo.url || '/placeholder.jpg'}
                      alt={typeof photo.title === 'string' ? photo.title : MultiLangUtils.getTextValue(photo.title as any, currentLanguage) || `Photo ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                  {(photo.title || photo.description) && (
                    <div className="p-3">
                      {photo.title && (
                        <h3 className="text-sm font-medium truncate">
                          {typeof photo.title === 'string' ? photo.title : MultiLangUtils.getTextValue(photo.title as any, currentLanguage)}
                        </h3>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {photos.length === 0 && subAlbums.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">This album is empty.</p>
          </div>
        )}
      </main>

      <Footer />

      {/* Photo Lightbox */}
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
            lensModel: (p as any).exif.lensModel,
            lensInfo: (p as any).exif.lensInfo,
            software: (p as any).exif.software,
            copyright: (p as any).exif.copyright,
            gps: (p as any).exif.gps ? {
              latitude: (p as any).exif.gps.latitude,
              longitude: (p as any).exif.gps.longitude,
              altitude: (p as any).exif.gps.altitude,
            } : undefined,
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
