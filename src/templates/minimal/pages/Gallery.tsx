'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { useI18n } from '@/hooks/useI18n'
import { useMultipleAlbumCoverImages } from '@/hooks/useAlbumCoverImage'
import { Button } from '@/components/ui/button'

type Album = {
  _id: string
  alias: string
  name: string | Record<string, string>
  description?: string | Record<string, string>
  photoCount?: number
}

const Gallery: React.FC = () => {
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(12)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const fetchRootAlbums = async () => {
      try {
        const res = await fetch('/api/albums?parentId=root')
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setAlbums(data.data || [])
          }
        }
      } catch {}
      finally {
        setLoading(false)
      }
    }
    fetchRootAlbums()
  }, [])

  const albumIds = useMemo(() => albums.map(a => a._id), [albums])
  const { coverImages } = useMultipleAlbumCoverImages(albumIds)

  const getText = (val?: string | Record<string,string>): string | undefined => {
    if (!val) return undefined
    if (typeof val === 'string') return val
    return MultiLangUtils.getTextValue(val, currentLanguage) || undefined
  }

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (loading) return
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const hasMore = albums.length > visibleCount
    if (!hasMore) return

    let ticking = false
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && !ticking) {
        ticking = true
        // Batch reveal in chunks
        setVisibleCount((c) => Math.min(c + 12, albums.length))
        // Small timeout to prevent rapid consecutive triggers
        setTimeout(() => { ticking = false }, 150)
      }
    }, { root: null, rootMargin: '200px 0px', threshold: 0 })

    observer.observe(sentinel)
    return () => { observer.disconnect() }
  }, [loading, albums.length, visibleCount])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="minimal-gallery">
          <div className="minimal-container">
            <h1 className="text-3xl font-bold mb-6">{t('navigation.albums') || 'Albums'}</h1>
            {loading ? (
              <div className="minimal-gallery-grid">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="minimal-gallery-item minimal-gallery-loading"></div>
                ))}
              </div>
            ) : albums.length > 0 ? (
              <>
                <div className="minimal-gallery-grid">
                  {albums.slice(0, visibleCount).map((album) => (
                    <Link key={album._id} href={`/albums/${album.alias}`}>
                      <div className="minimal-gallery-item">
                        {coverImages[album._id] ? (
                          <Image
                            src={coverImages[album._id]}
                            alt={getText(album.name) || 'Album cover'}
                            width={800}
                            height={600}
                            className="minimal-gallery-image"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            loading="lazy"
                          />
                        ) : (
                          <div style={{ aspectRatio: '4 / 3', background: 'var(--minimal-hover)' }} />
                        )}
                        <div className="minimal-gallery-overlay"></div>
                        <div className="minimal-gallery-caption">
                          <div className="minimal-gallery-caption-title">{getText(album.name) || 'Untitled Album'}</div>
                          <div className="minimal-gallery-caption-meta">{album.photoCount || 0} photos</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} style={{ height: '1px' }} />
              </>
            ) : (
              <div className="minimal-gallery-empty">
                <p>No albums yet</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Gallery
