'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import ConfirmDialog from '@/components/ConfirmDialog'

interface Photo {
  _id: string
  title: string | { en: string }
  filename: string
  storage: {
    url: string
    thumbnailPath: string
    path: string
    provider: string
  }
  metadata?: {
    width: number
    height: number
    size: number
    mimeType: string
  }
  dimensions?: {
    width: number
    height: number
  }
  size?: number
  mimeType?: string
  isLeading: boolean
  isPublished: boolean
  isGalleryLeading?: boolean
  createdAt: string
  exif?: {
    dateTimeOriginal?: string
    make?: string
    model?: string
    exposureTime?: string
    fNumber?: string
    iso?: number
    focalLength?: string
    flash?: string
    whiteBalance?: string
    meteringMode?: string
    exposureProgram?: string
    exposureMode?: string
    sceneCaptureType?: string
    colorSpace?: string
    lensModel?: string
    lensInfo?: string
    serialNumber?: string
    software?: string
    xResolution?: number
    yResolution?: number
    resolutionUnit?: string
    subsecTimeOriginal?: string
    subsecTimeDigitized?: string
  }
}

interface Album {
  _id: string
  name: string
  alias: string
  description: string
  coverImage?: string
  isPublic: boolean
  isFeatured: boolean
  photoCount: number
  createdAt: string
  updatedAt: string
}

export default function AdminAlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { currentLanguage } = useLanguage()
  const resolvedParams = use(params)
  const router = useRouter()
  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null)

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/albums/${resolvedParams.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch album')
        }
        
        const result = await response.json()
        if (result.success) {
          setAlbum(result.data)
        } else {
          setError(result.error || 'Failed to fetch album')
        }
      } catch (error) {
        console.error('Failed to fetch album:', error)
        setError('Failed to fetch album')
      } finally {
        setLoading(false)
      }
    }

    const fetchPhotos = async () => {
      try {
        // Use admin endpoint and include photos from child albums
        const response = await fetch(`/api/admin/albums/${resolvedParams.id}/photos`)
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            const albumPhotos = Array.isArray(result.data?.albumPhotos) ? result.data.albumPhotos : []
            const childAlbumPhotos = Array.isArray(result.data?.childAlbumPhotos) ? result.data.childAlbumPhotos : []
            setPhotos([...albumPhotos, ...childAlbumPhotos])
          }
        } else {
          console.error('Failed to fetch photos: HTTP', response.status)
        }
      } catch (error) {
        console.error('Failed to fetch photos:', error)
      }
    }

    fetchAlbum()
    fetchPhotos()
  }, [resolvedParams.id])

  const handleDeletePhoto = async (photoId: string) => {
    try {
      setDeletingPhoto(photoId)
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPhotos(photos.filter(photo => photo._id !== photoId))
        if (album) {
          setAlbum({ ...album, photoCount: album.photoCount - 1 })
        }
      } else {
        setError('Failed to delete photo')
      }
    } catch (error) {
      console.error('Failed to delete photo:', error)
      setError('Failed to delete photo')
    } finally {
      setDeletingPhoto(null)
      setShowDeleteDialog(false)
    }
  }

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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{MultiLangUtils.getTextValue(album.name as any, currentLanguage)}</h1>
              {album.description && (
                <div
                  className="mt-2 text-gray-600 prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: MultiLangUtils.getHTMLValue(album.description as any, currentLanguage) }}
                />
              )}
            </div>
            <div className="flex space-x-3">
              <Link href="/admin/albums" className="btn-secondary">
                Back to Albums
              </Link>
              <Link href={`/admin/albums/${resolvedParams.id}/edit`} className="btn-primary">
                Edit Album
              </Link>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="btn-danger"
              >
                Delete Album
              </button>
            </div>
          </div>

          {/* Album Info */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Album Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Alias:</span> {album.alias}</p>
                  <p><span className="font-medium">Photos:</span> {album.photoCount}</p>
                  <p><span className="font-medium">Created:</span> {new Date(album.createdAt).toLocaleDateString()}</p>
                  <p><span className="font-medium">Updated:</span> {new Date(album.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
                <div className="space-y-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    album.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {album.isPublic ? 'Public' : 'Private'}
                  </span>
                  {album.isFeatured && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Featured
                    </span>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Actions</h3>
                <div className="space-y-2">
                  <Link href={`/albums/${album.alias}`} className="btn-secondary w-full text-center">
                    View Public Page
                  </Link>
                                     <Link href={`/admin/photos/upload?albumId=${resolvedParams.id}`} className="btn-primary w-full text-center">
                     Upload Photos
                   </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Photos Grid */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Photos ({photos.length})</h2>
              <Link href={`/admin/photos/upload?albumId=${resolvedParams.id}`} className="btn-primary">
                Upload Photos
              </Link>
            </div>

            {photos.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No photos</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by uploading some photos to this album.</p>
                <div className="mt-6">
                  <Link href={`/admin/photos/upload?albumId=${resolvedParams.id}`} className="btn-primary">
                    Upload Photos
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {photos.map((photo) => (
                  <div key={photo._id} className="relative group">
                    <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={photo.storage.thumbnailPath || photo.storage.url}
                        alt={typeof photo.title === 'string' ? photo.title : photo.title.en}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const fallback = e.currentTarget.nextElementSibling
                          if (fallback) {
                            fallback.classList.remove('hidden')
                            fallback.classList.add('flex')
                          }
                        }}
                      />
                      <div className="absolute inset-0 items-center justify-center bg-gray-100 hidden">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Photo Info */}
                    <div className="mt-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {typeof photo.title === 'string' ? photo.title : photo.title.en}
                      </h3>
                      {(photo.metadata || photo.dimensions) && (
                        <p className="text-xs text-gray-500">
                          {(photo.metadata?.width || photo.dimensions?.width) || 0} × {(photo.metadata?.height || photo.dimensions?.height) || 0}
                        </p>
                      )}
                      {/* EXIF Date */}
                      {photo.exif?.dateTimeOriginal && (
                        <p className="text-xs text-gray-400 mt-1">
                          📅 {new Date(photo.exif.dateTimeOriginal).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex space-x-1">
                        <Link
                          href={`/admin/photos/${photo._id}/edit`}
                          className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Edit photo"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDeletePhoto(photo._id)}
                          className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                          title="Delete photo"
                          disabled={deletingPhoto === photo._id}
                        >
                          {deletingPhoto === photo._id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="absolute top-2 left-2">
                      <div className="flex space-x-1">
                        {photo.isGalleryLeading && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            Gallery Hero
                          </span>
                        )}
                        {photo.isLeading && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Leading
                          </span>
                        )}
                        {photo.isPublished ? (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Draft
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
