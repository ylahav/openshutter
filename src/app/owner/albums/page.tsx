'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSession } from 'next-auth/react'
import { canCreateAlbums, canEditAlbum, canDeleteAlbum } from '@/lib/access-control'

interface Album {
  _id: string
  name: string
  alias: string
  description?: string
  isPublic: boolean
  isFeatured: boolean
  photoCount: number
  coverPhotoId?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export default function OwnerAlbumsPage() {
  const { t } = useI18n()
  const { isRTL } = useLanguage()
  const { data: session } = useSession()
  const [albums, setAlbums] = useState<Album[]>([])
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
      const response = await fetch('/api/albums')
      if (!response.ok) {
        throw new Error('Failed to fetch albums')
      }
      const data = await response.json()
      setAlbums(data.albums || [])
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {albums.map((album) => (
              <div key={album._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* Cover Photo */}
                <div className="aspect-w-16 aspect-h-12 bg-gray-200">
                  {album.coverPhotoId ? (
                    <img
                      src={`/api/photos/${album.coverPhotoId}/thumbnail`}
                      alt={album.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      <div className="text-gray-400 text-4xl">📷</div>
                    </div>
                  )}
                </div>

                {/* Album Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {album.name}
                    </h3>
                    <div className="flex items-center space-x-1">
                      {album.isPublic ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {t('admin.public')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {t('admin.private')}
                        </span>
                      )}
                      {album.isFeatured && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {t('admin.featured')}
                        </span>
                      )}
                    </div>
                  </div>

                  {album.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {album.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{album.photoCount} {t('admin.photos')}</span>
                    <span>{new Date(album.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link
                      href={`/albums/${album.alias}`}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {t('admin.view')}
                    </Link>

                    {canEditAlbum(album, session?.user as any) && (
                      <Link
                        href={`${isAdmin ? "/admin" : "/owner"}/albums/${album._id}/edit`}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        {t('admin.edit')}
                      </Link>
                    )}

                    {canDeleteAlbum(album, session?.user as any) && (
                      <button
                        onClick={() => handleDeleteAlbum(album._id)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {t('admin.delete')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
