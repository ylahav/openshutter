'use client'

import { useState, useEffect, useCallback } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import Header from '@/templates/default/components/Header'
import Footer from '@/templates/default/components/Footer'
import MultiLangInput from '@/components/MultiLangInput'
import MultiLangHTMLEditor from '@/components/MultiLangHTMLEditor'
import PhotoMetadataEditor from '@/components/PhotoMetadataEditor'
import { MultiLangText, MultiLangHTML, MultiLangUtils } from '@/types/multi-lang'

interface Photo {
  _id: string
  title: string | { en: string }
  description: string | { en: string }
  filename: string
  originalFilename: string
  mimeType: string
  size: number
  dimensions?: {
    width: number
    height: number
  }
  storage: {
    url: string
    thumbnailPath: string
    path: string
    provider: string
  }
  albumId?: string
  tags: string[]
  people: string[]
  location?: {
    name: string
    coordinates?: {
      latitude: number
      longitude: number
    }
    address?: string
  }
  isLeading: boolean
  isPublished: boolean
  isGalleryLeading?: boolean
  createdAt: string
  updatedAt: string
}

export default function EditPhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: {} as MultiLangText,
    description: {} as MultiLangHTML,
    tags: [] as string[],
    people: [] as string[],
    location: undefined as {
      name: string
      coordinates?: {
        latitude: number
        longitude: number
      }
      address?: string
    } | undefined,
    isPublished: false,
    isLeading: false,
    isGalleryLeading: false
  })

  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/photos/${resolvedParams.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch photo')
        }
        
        const result = await response.json()
        if (result.success) {
          const photoData = result.data
          setPhoto(photoData)
          
          // Initialize form data
          setFormData({
            title: (typeof photoData.title === 'string' ? { en: photoData.title } : (photoData.title || {})) as MultiLangText,
            description: (typeof photoData.description === 'string' ? { en: photoData.description } : (photoData.description || {})) as MultiLangHTML,
            tags: photoData.tags || [],
            people: photoData.people || [],
            location: photoData.location,
            isPublished: photoData.isPublished,
            isLeading: photoData.isLeading,
            isGalleryLeading: photoData.isGalleryLeading || false
          })
        } else {
          setError(result.error || 'Failed to fetch photo')
        }
      } catch (error) {
        console.error('Failed to fetch photo:', error)
        setError('Failed to fetch photo')
      } finally {
        setLoading(false)
      }
    }

    fetchPhoto()
  }, [resolvedParams.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/photos/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: MultiLangUtils.clean(formData.title),
          description: MultiLangUtils.clean(formData.description),
          tags: formData.tags,
          people: formData.people,
          location: formData.location,
          isPublished: formData.isPublished,
          isLeading: formData.isLeading,
          isGalleryLeading: formData.isGalleryLeading
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Redirect back to the album page
          router.push(`/admin/albums/${photo?.albumId || ''}`)
        } else {
          setError(result.error || 'Failed to update photo')
        }
      } else {
        setError('Failed to update photo')
      }
    } catch (error) {
      console.error('Failed to update photo:', error)
      setError('Failed to update photo')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  // Memoized metadata handlers to prevent child effect loops
  const handleTagsChange = useCallback((tags: string[]) => {
    setFormData(prev => ({ ...prev, tags }))
  }, [])

  const handlePeopleChange = useCallback((people: string[]) => {
    setFormData(prev => ({ ...prev, people }))
  }, [])

  const handleLocationChange = useCallback((location?: {
    name: string
    coordinates?: { latitude: number; longitude: number }
    address?: string
  }) => {
    setFormData(prev => ({ ...prev, location }))
  }, [])

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading photo...</p>
            </div>
          </div>
          <Footer />
        </div>
      </AdminGuard>
    )
  }

  if (error || !photo) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
              <p className="text-gray-600 mb-4">{error || 'Photo not found'}</p>
              <Link href="/admin/albums" className="btn-primary">
                Back to Albums
              </Link>
            </div>
          </div>
          <Footer />
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Photo</h1>
              <p className="mt-2 text-gray-600">
                {typeof photo.title === 'string' ? photo.title : photo.title.en}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back()
                  } else {
                    router.push(photo?.albumId ? `/admin/albums/${String(photo.albumId)}` : '/admin/albums')
                  }
                }}
                className="btn-secondary"
              >
                Back to Album
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Photo Preview */}
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    <img
                      src={photo.storage.thumbnailPath || photo.storage.url}
                      alt={typeof photo.title === 'string' ? photo.title : photo.title.en}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          File Name
                        </label>
                        <p className="text-sm text-gray-600">{photo.originalFilename}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          File Size
                        </label>
                        <p className="text-sm text-gray-600">{(photo.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dimensions
                        </label>
                        <p className="text-sm text-gray-600">
                          {photo.dimensions?.width || 0} × {photo.dimensions?.height || 0}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <p className="text-sm text-gray-600">{photo.mimeType}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <MultiLangInput
                    value={formData.title}
                    onChange={(value) => setFormData(prev => ({ ...prev, title: value as MultiLangText }))}
                    placeholder="Enter photo title..."
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <MultiLangHTMLEditor
                    value={formData.description}
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value as MultiLangHTML }))}
                    placeholder="Enter photo description..."
                    height={240}
                  />
                </div>

                {/* Metadata */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photo Metadata
                  </label>
                  <PhotoMetadataEditor
                    tags={formData.tags}
                    people={formData.people}
                    location={formData.location}
                    onTagsChange={handleTagsChange}
                    onPeopleChange={handlePeopleChange}
                    onLocationChange={handleLocationChange}
                  />
                </div>

                {/* Status Toggles */}
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPublished"
                      name="isPublished"
                      checked={formData.isPublished}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-700">
                      Published (visible to public)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isLeading"
                      name="isLeading"
                      checked={formData.isLeading}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isLeading" className="ml-2 block text-sm text-gray-700">
                      Leading Photo (album cover)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isGalleryLeading"
                      name="isGalleryLeading"
                      checked={formData.isGalleryLeading}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isGalleryLeading" className="ml-2 block text-sm text-gray-700">
                      Gallery Leading Photo (hero showcase)
                    </label>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.history.length > 1) {
                        router.back()
                      } else {
                        router.push(photo?.albumId ? `/admin/albums/${String(photo.albumId)}` : '/admin/albums')
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </AdminGuard>
  )
}
