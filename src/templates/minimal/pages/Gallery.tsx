'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { useI18n } from '@/hooks/useI18n'
import { useMultipleAlbumCoverImages } from '@/hooks/useAlbumCoverImage'

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
              <div className="minimal-gallery-grid">
                {albums.map((album) => (
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
                    </div>
                    <div className="mt-2">
                      <h3 className="text-base font-semibold text-foreground">{getText(album.name) || 'Untitled Album'}</h3>
                      <p className="text-sm text-muted-foreground">{album.photoCount || 0} photos</p>
                    </div>
                  </Link>
                ))}
              </div>
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
