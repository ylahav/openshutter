'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
import { useSession } from 'next-auth/react'
import { canCreateAlbums, canEditAlbum, canDeleteAlbum } from '@/lib/access-control'
import { TemplateAlbum } from '@/types'
import AlbumTree from '@/components/AlbumTree'

export default function OwnerAlbumsPage() {
  const { t } = useI18n()
  const { isRTL, currentLanguage } = useLanguage()
  const { data: session } = useSession()
  const [albums, setAlbums] = useState<TemplateAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userRole = (session?.user as any)?.role
  const isAdmin = userRole === 'admin'
  const isOwner = userRole === 'owner'

  useEffect(() => {
    fetchAlbums()
  }, [])

  const fetchAlbums = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/albums?mine=true')
      if (!response.ok) {
        throw new Error('Failed to fetch albums')
      }
      const data = await response.json()
      setAlbums(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm(t('owner.confirmDeleteAlbum'))) {
      return
    }

    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete album')
      }

      // Remove album from local state
      setAlbums(albums.filter(album => album._id !== albumId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete album')
    }
  }

  const getArrowPath = () => isRTL ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loading.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchAlbums}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('owner.tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isAdmin ? t('admin.albumsManagement') : t('owner.myAlbums')}
            </h1>
            <p className="text-gray-600 mt-2">
              {isAdmin ? t('admin.createEditAlbums') : t('owner.createEditMyAlbums')}
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={isAdmin ? "/admin" : "/owner"}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('admin.backToAdmin')}
            </Link>
            {canCreateAlbums(session?.user as any) && (
              <Link
                href="/albums/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('admin.createNewAlbum')}
              </Link>
            )}
          </div>
        </div>

        {/* Albums Grid */}
        {albums.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('admin.noAlbums')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('admin.getStartedCreateAlbum')}
            </p>
            {canCreateAlbums(session?.user as any) && (
              <Link
                href="/albums/new"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('admin.createAlbum')}
              </Link>
            )}
          </div>
        ) : (
          <AlbumTree
            albums={albums.map(a => ({
              _id: a._id,
              name: MultiLangUtils.getTextValue(a.name, currentLanguage),
              alias: a.alias,
              parentAlbumId: (a as any).parentAlbumId ?? null,
              level: a.level,
              order: a.order,
              childAlbumCount: a.childAlbumCount,
            }))}
            onReorder={async (updates) => {
              await fetch('/api/admin/albums/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
              })
              // Optionally refresh list
              await fetchAlbums()
            }}
            onOpen={(node) => { window.location.href = `/owner/albums/${node._id}` }}
          />
        )}
      </div>
    </div>
  )
}
