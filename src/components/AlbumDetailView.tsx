'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MultiLangUtils } from '@/types/multi-lang'
import { TemplateAlbum, TemplatePhoto } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

export interface AlbumDetailViewProps {
  album: TemplateAlbum
  photos: TemplatePhoto[]
  role: 'admin' | 'owner'
  albumId: string
}

export default function AlbumDetailView({ album, photos, role, albumId }: AlbumDetailViewProps) {
  const { currentLanguage } = useLanguage()
  const backHref = role === 'admin' ? '/admin/albums' : '/owner/albums'
  const editHref = role === 'admin' ? `/admin/albums/${albumId}/edit` : `/owner/albums/${albumId}/edit`
  const uploadHref = role === 'admin' ? `/admin/photos/upload?albumId=${albumId}` : `/photos/upload?albumId=${albumId}&returnTo=/owner/albums/${albumId}`
  const [localPhotos, setLocalPhotos] = useState<TemplatePhoto[]>(photos)
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null)

  const handleDeletePhoto = async (photoId: string) => {
    try {
      setDeletingPhoto(photoId)
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' })
      if (res.ok) {
        setLocalPhotos(prev => prev.filter(p => p._id !== photoId))
      }
    } finally {
      setDeletingPhoto(null)
    }
  }

  return (
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
            <Link href={backHref} className="btn-secondary">
              Back to Albums
            </Link>
            <Link href={editHref} className="btn-primary">
              Edit Album
            </Link>
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
                <Link href={uploadHref} className="btn-primary w-full text-center">
                  Upload Photos
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Photos Grid */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Photos ({localPhotos.length})</h2>
            <Link href={uploadHref} className="btn-primary">
              Upload Photos
            </Link>
          </div>
          {localPhotos.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No photos</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by uploading some photos to this album.</p>
              <div className="mt-6">
                <Link href={uploadHref} className="btn-primary">Upload Photos</Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {localPhotos.map((photo) => (
                <div key={photo._id} className="relative group">
                  <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={(photo as any).storage?.thumbnailPath || (photo as any).storage?.url}
                      alt={typeof photo.title === 'string' ? photo.title : (photo.title as any)?.en}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="mt-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {typeof photo.title === 'string' ? photo.title : (photo.title as any)?.en}
                    </h3>
                  </div>

                  {/* Status Badges */}
                  <div className="absolute top-2 left-2">
                    <div className="flex space-x-1">
                      {(photo as any).isPublished ? (
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

                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex space-x-1">
                      <Link
                        href={`/${role}/photos/${photo._id}/edit`}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
