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
import AlbumMetadataEditor from '@/components/AlbumMetadataEditor'
import AlbumBreadcrumbs from '@/components/AlbumBreadcrumbs'
import { MultiLangText, MultiLangHTML, MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'
import { TemplateAlbum } from '@/types'

export default function EditAlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [album, setAlbum] = useState<TemplateAlbum | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: {} as MultiLangText,
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
    isPublic: false,
    isFeatured: false,
    showExifData: true,
    order: 0
  })
  const { currentLanguage } = useLanguage()

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
          const albumData = result.data
          setAlbum(albumData)
          
          // Initialize form data
          setFormData({
            name: (typeof albumData.name === 'string' ? { en: albumData.name } : (albumData.name || {})) as MultiLangText,
            description: (typeof albumData.description === 'string' ? { en: albumData.description } : (albumData.description || {})) as MultiLangHTML,
            tags: albumData.tags || [],
            people: albumData.people || [],
            location: albumData.location,
            isPublic: albumData.isPublic || false,
            isFeatured: albumData.isFeatured || false,
            showExifData: albumData.showExifData !== undefined ? albumData.showExifData : true,
            order: albumData.order || 0
          })
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

    fetchAlbum()
  }, [resolvedParams.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/albums/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          name: MultiLangUtils.clean(formData.name),
          description: MultiLangUtils.clean(formData.description),
          tags: formData.tags,
          people: formData.people,
          location: formData.location,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Redirect back to the album page
          router.push(`/admin/albums/${resolvedParams.id}`)
        } else {
          setError(result.error || 'Failed to update album')
        }
      } else {
        setError('Failed to update album')
      }
    } catch (error) {
      console.error('Failed to update album:', error)
      setError('Failed to update album')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  // Metadata handlers
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
              <p className="mt-4 text-gray-600">Loading album...</p>
            </div>
          </div>
          <Footer />
        </div>
      </AdminGuard>
    )
  }

  if (error || !album) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
              <p className="text-gray-600 mb-4">{error || 'Album not found'}</p>
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
          {/* Breadcrumbs */}
          <AlbumBreadcrumbs album={album} role="admin" currentPage="edit" />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Album</h1>
              <p className="mt-2 text-gray-600">
                {MultiLangUtils.getValue(album.name as any, currentLanguage)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Album Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Album Name
                    </label>
                    <MultiLangInput
                      value={formData.name}
                      onChange={(value) => setFormData(prev => ({ ...prev, name: value as MultiLangText }))}
                      placeholder="Enter album name..."
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="alias" className="block text-sm font-medium text-gray-700 mb-2">
                      URL Alias
                    </label>
                    <input
                      type="text"
                      id="alias"
                      value={album.alias}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">URL alias cannot be changed</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <MultiLangHTMLEditor
                    value={formData.description}
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value as MultiLangHTML }))}
                    placeholder="Enter album description..."
                    height={240}
                  />
                </div>

                {/* Metadata */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Album Metadata
                  </label>
                  <AlbumMetadataEditor
                    tags={formData.tags}
                    people={formData.people}
                    location={formData.location}
                    onTagsChange={handleTagsChange}
                    onPeopleChange={handlePeopleChange}
                    onLocationChange={handleLocationChange}
                  />
                </div>

                {/* Album Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-2">
                      Display Order
                    </label>
                    <input
                      type="number"
                      id="order"
                      name="order"
                      value={formData.order}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Storage Provider
                    </label>
                    <input
                      type="text"
                      value={album.storageProvider}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      disabled
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Photo Count
                    </label>
                    <input
                      type="text"
                      value={album.photoCount}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      disabled
                    />
                  </div>
                </div>

                {/* Status Toggles */}
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isPublic"
                      name="isPublic"
                      checked={formData.isPublic}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                      Public (visible to visitors)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-700">
                      Featured (highlighted on homepage)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showExifData"
                      name="showExifData"
                      checked={formData.showExifData}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="showExifData" className="ml-2 block text-sm text-gray-700">
                      Show EXIF data in photo viewer
                    </label>
                  </div>
                </div>

                {/* Read-only Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Album Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>
                      <span className="ml-2 text-gray-600">{new Date(album.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Last Updated:</span>
                      <span className="ml-2 text-gray-600">{new Date(album.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Created By:</span>
                      <span className="ml-2 text-gray-600">{album.createdBy}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Level:</span>
                      <span className="ml-2 text-gray-600">{album.level}</span>
                    </div>
                    {album.parentPath && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-700">Parent Path:</span>
                        <span className="ml-2 text-gray-600">{album.parentPath}</span>
                      </div>
                    )}
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
                  <Link
                    href={`/admin/albums/${resolvedParams.id}`}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Cancel
                  </Link>
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
