'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import ConfirmDialog from '@/components/ConfirmDialog'
import AlbumDetailView from '@/components/AlbumDetailView'
import { TemplateAlbum, TemplatePhoto } from '@/types'

export default function AdminAlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { currentLanguage } = useLanguage()
  const resolvedParams = use(params)
  const router = useRouter()
  const [album, setAlbum] = useState<TemplateAlbum | null>(null)
  const [photos, setPhotos] = useState<TemplatePhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/albums/${resolvedParams.id}?t=${Date.now()}`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to fetch album')
        }
        
        const album = await response.json()
        setAlbum(album)
      } catch (error) {
        console.error('Failed to fetch album:', error)
        setError('Failed to fetch album')
      } finally {
        setLoading(false)
      }
    }

    const fetchPhotos = async () => {
      try {
        const response = await fetch(`/api/admin/albums/${resolvedParams.id}/photos?t=${Date.now()}`, { cache: 'no-store' })
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setPhotos(result.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch photos:', error)
      }
    }

    fetchAlbum()
    fetchPhotos()
  }, [resolvedParams.id])


  const handleDeleteAlbum = async () => {
    try {
      const response = await fetch(`/api/albums/${resolvedParams.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/admin/albums')
      } else {
        setError('Failed to delete album')
      }
    } catch (error) {
      console.error('Failed to delete album:', error)
      setError('Failed to delete album')
    }
  }

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading album...</p>
            </div>
          </div>
        </div>
      </AdminGuard>
    )
  }

  if (error || !album) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
              <p className="text-gray-600 mb-4">{error || 'Album not found'}</p>
              <Link href="/admin/albums" className="btn-primary">
                Back to Albums
              </Link>
            </div>
          </div>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <AlbumDetailView album={album} photos={photos} role="admin" albumId={resolvedParams.id} />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAlbum}
        title="Delete Album"
        message={`Are you sure you want to delete "${MultiLangUtils.getTextValue(album.name as any, currentLanguage)}"? This action cannot be undone and will also delete all photos in this album.`}
        confirmText="Delete Album"
        variant="danger"
      />
    </AdminGuard>
  )
}
