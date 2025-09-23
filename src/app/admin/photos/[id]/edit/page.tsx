'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { use } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import Header from '@/templates/default/components/Header'
import Footer from '@/templates/default/components/Footer'
import { MultiLangText, MultiLangHTML, MultiLangUtils } from '@/types/multi-lang'
import { TemplatePhoto } from '@/types'

// Dynamic imports for heavy components
const MultiLangHTMLEditor = dynamic(() => import('@/components/MultiLangHTMLEditor'), {
  loading: () => (
    <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
      <p className="text-gray-600 text-center py-8">
        Loading editor...
      </p>
    </div>
  )
})

const PhotoMetadataEditor = dynamic(() => import('@/components/PhotoMetadataEditor'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

const PhotoPreview = dynamic(() => import('@/components/admin/PhotoEdit/PhotoPreview'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />
})

const PhotoBasicFields = dynamic(() => import('@/components/admin/PhotoEdit/PhotoBasicFields'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-16 rounded-lg" />
})

const PhotoStatusToggles = dynamic(() => import('@/components/admin/PhotoEdit/PhotoStatusToggles'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-24 rounded-lg" />
})

const PhotoActions = dynamic(() => import('@/components/admin/PhotoEdit/PhotoActions'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-16 rounded-lg" />
})

export default function EditPhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [photo, setPhoto] = useState<TemplatePhoto | null>(null)
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
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-32 rounded-lg" />}>
                  <PhotoPreview photo={photo} />
                </Suspense>

                {/* Title */}
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-16 rounded-lg" />}>
                  <PhotoBasicFields
                    title={formData.title}
                    onTitleChange={(value) => setFormData(prev => ({ ...prev, title: value as MultiLangText }))}
                  />
                </Suspense>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Suspense fallback={
                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                      <p className="text-gray-600 text-center py-8">Loading editor...</p>
                    </div>
                  }>
                    <MultiLangHTMLEditor
                      value={formData.description}
                      onChange={(value) => setFormData(prev => ({ ...prev, description: value as MultiLangHTML }))}
                      placeholder="Enter photo description..."
                      height={240}
                    />
                  </Suspense>
                </div>

                {/* Metadata */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photo Metadata
                  </label>
                  <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
                    <PhotoMetadataEditor
                      tags={formData.tags}
                      people={formData.people}
                      location={formData.location}
                      onTagsChange={handleTagsChange}
                      onPeopleChange={handlePeopleChange}
                      onLocationChange={handleLocationChange}
                    />
                  </Suspense>
                </div>

                {/* Status Toggles */}
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-24 rounded-lg" />}>
                  <PhotoStatusToggles
                    isPublished={formData.isPublished}
                    isLeading={formData.isLeading}
                    isGalleryLeading={formData.isGalleryLeading}
                    onInputChange={handleInputChange}
                  />
                </Suspense>

                {/* Actions */}
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-16 rounded-lg" />}>
                  <PhotoActions
                    saving={saving}
                    error={error}
                    photo={photo}
                    onBack={() => {
                      if (typeof window !== 'undefined' && window.history.length > 1) {
                        router.back()
                      } else {
                        router.push(photo?.albumId ? `/admin/albums/${String(photo.albumId)}` : '/admin/albums')
                      }
                    }}
                  />
                </Suspense>
              </form>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </AdminGuard>
  )
}
