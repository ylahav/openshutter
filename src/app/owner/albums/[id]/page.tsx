'use client'

import { use } from 'react'
import { useEffect, useState } from 'react'
import OwnerGuard from '@/components/OwnerGuard'
import AlbumDetailView from '@/components/AlbumDetailView'
import { TemplateAlbum, TemplatePhoto } from '@/types'

export default function OwnerAlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = use(params)
  const [album, setAlbum] = useState<TemplateAlbum | null>(null)
  const [photos, setPhotos] = useState<TemplatePhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [aRes, pRes] = await Promise.all([
          fetch(`/api/albums/${resolved.id}`),
          fetch(`/api/albums/${resolved.id}/photos`),
        ])
        const aJson = await aRes.json()
        if (!aRes.ok || !aJson.success) throw new Error(aJson.error || 'Failed to load album')
        const pJson = await pRes.json().catch(() => ({ success: true, data: [] }))
        setAlbum(aJson.data)
        setPhotos(pJson.data || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [resolved.id])

  if (loading) return <OwnerGuard><div className="min-h-screen bg-gray-50 p-8">Loading…</div></OwnerGuard>
  if (error || !album) return <OwnerGuard><div className="min-h-screen bg-gray-50 p-8 text-red-600">{error || 'Album not found'}</div></OwnerGuard>

  return (
    <OwnerGuard>
      <AlbumDetailView album={album} photos={photos} role="owner" albumId={resolved.id} />
    </OwnerGuard>
  )
}
