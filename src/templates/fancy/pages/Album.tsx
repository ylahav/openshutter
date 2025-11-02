'use client'

import { useMemo, useState } from 'react'
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
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading album...</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !album) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Error</h1>
              <p className="text-muted-foreground mb-4">{error || 'Album not found'}</p>
              <Link href="/albums" className="text-primary hover:underline">
                Back to Albums
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Filters
  const allTags = useMemo(() => {
    const set = new Set<string>()
    photos.forEach((p: any) => {
      if (Array.isArray(p.tags)) p.tags.forEach((t: string) => set.add(t))
    })
    return Array.from(set).sort()
  }, [photos])

  const [selectedTag, setSelectedTag] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  const filteredPhotos = useMemo(() => {
    let arr = photos as any[]
    if (selectedTag) {
      arr = arr.filter(p => Array.isArray(p.tags) && p.tags.includes(selectedTag))
    }
    arr = arr.slice().sort((a, b) => {
      const da = (a as any).exif?.dateTimeOriginal || (a as any).createdAt || 0
      const db = (b as any).exif?.dateTimeOriginal || (b as any).createdAt || 0
      return sortOrder === 'newest' ? (new Date(db).getTime() - new Date(da).getTime()) : (new Date(da).getTime() - new Date(db).getTime())
    })
    return arr
  }, [photos, selectedTag, sortOrder])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs + Header */}
          <div className="mb-12">
            <nav className="text-sm text-muted-foreground mb-4 text-center">
              <Link href="/" className="hover:underline">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/albums" className="hover:underline">Albums</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">{MultiLangUtils.getTextValue(album.name, currentLanguage)}</span>
            </nav>
            <h1 className="text-4xl font-bold mb-4">
              {MultiLangUtils.getTextValue(album.name, currentLanguage)}
            </h1>
            {album.description && (
              <div 
                className="text-muted-foreground prose prose-lg max-w-3xl mx-auto text-center"
                dangerouslySetInnerHTML={{
                  __html: MultiLangUtils.getHTMLValue(album.description, currentLanguage)
                }}
              />
            )}
          </div>

          {/* Filters */}
          {(allTags.length > 0) && (
            <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Tag</label>
                <select
                  className="border rounded-md px-3 py-1.5 text-sm bg-background"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                >
                  <option value="">All</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Sort</label>
                <select
                  className="border rounded-md px-3 py-1.5 text-sm bg-background"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </div>
          )}

          {/* Sub-albums */}
          {subAlbums.length > 0 && (
            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-6">Sub Albums</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {subAlbums.map((subAlbum) => (
                  <Link key={subAlbum._id} href={`/albums/${subAlbum.alias}`}>
                    <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                      {subAlbum.coverPhotoId && subAlbumCoverPhotos[subAlbum._id] ? (
                      <div className="aspect-4/3 relative">
                          <Image
                            src={subAlbumCoverPhotos[subAlbum._id].storage?.thumbnailPath || subAlbumCoverPhotos[subAlbum._id].url || '/placeholder.jpg'}
                            alt={MultiLangUtils.getTextValue(subAlbum.name, currentLanguage)}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                      <div className="aspect-4/3 bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <div className="text-5xl">📁</div>
                        </div>
                      )}
                      <div className="p-4 bg-background/95 backdrop-blur-sm">
                        <h3 className="font-bold text-lg mb-1">
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

          {/* Photos Grid (Masonry) */}
          {filteredPhotos.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Photos</h2>
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:balance]">{/* masonry */}
                {filteredPhotos.map((photo: any, i: number) => {
                  const metaW = (photo as any).metadata?.width
                  const metaH = (photo as any).metadata?.height
                  const h = (metaW && metaH) ? Math.max(400, Math.round(800 * (metaH / metaW))) : 600
                  return (
                    <div
                      key={photo._id}
                      className="mb-4 break-inside-avoid rounded-lg overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                      onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                    >
                      <Image
                        src={photo.storage?.thumbnailPath || photo.url || '/placeholder.jpg'}
                        alt={typeof photo.title === 'string' ? photo.title : MultiLangUtils.getTextValue(photo.title as any, currentLanguage) || `Photo ${i + 1}`}
                        width={800}
                        height={h}
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="w-full h-auto object-cover group-hover:scale-[1.01] transition-transform"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredPhotos.length === 0 && subAlbums.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-xl text-muted-foreground">This album is empty.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Photo Lightbox */}
      <PhotoLightbox
        photos={filteredPhotos.map(p => ({
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
