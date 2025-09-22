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
        <section className={styles.section}>
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
          <section className={styles.section}>
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
                  <div key={p._id} className={`${styles.card}`}>
                    <div className="overflow-hidden">
                      <Image
                        src={p.storage?.thumbnailPath || p.url || '/placeholder.jpg'}
                        alt={p.alt ? MultiLangUtils.getTextValue(p.alt, currentLanguage) : `Photo ${i + 1}`}
                        width={400}
                        height={300}
                        className={styles.cardImage}
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {photos.length === 0 && subAlbums.length === 0 && (
          <section className={styles.section}>
            <div className="max-w-6xl mx-auto text-center">
              <div className={styles.textSecondary}>This album is empty.</div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
