'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useI18n } from '@/hooks/useI18n'
import NotificationDialog from '@/components/NotificationDialog'

interface AlbumFormData {
  name: string
  alias: string
  description: string
  isPublic: boolean
  isFeatured: boolean
  storageProvider: string
  parentAlbumId: string
}

interface AlbumOption {
  _id: string
  name: string
  alias: string
  level: number
  storagePath: string
}

interface StorageOption {
  id: string
  name: string
  type: string
  isEnabled: boolean
}

interface NotificationState {
  isOpen: boolean
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
}

export default function CreateAlbumPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [parentAlbums, setParentAlbums] = useState<AlbumOption[]>([])
  const [storageOptions, setStorageOptions] = useState<StorageOption[]>([])
  const [loadingStorageOptions, setLoadingStorageOptions] = useState(true)
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })

  const [formData, setFormData] = useState<AlbumFormData>({
    name: '',
    alias: '',
    description: '',
    isPublic: false,
    isFeatured: false,
    storageProvider: 'local',
    parentAlbumId: ''
  })

  useEffect(() => {
    loadParentAlbums()
    loadStorageOptions()
  }, [session])

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message
    })
  }

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }))
  }

  const loadParentAlbums = async () => {
    try {
      const response = await fetch('/api/albums/hierarchy?includePrivate=true')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const userRole = (session?.user as any)?.role
          const userId = (session?.user as any)?._id
          
          // Flatten the tree to get all albums for parent selection
          const flattenAlbums = (albums: any[]): AlbumOption[] => {
            let result: AlbumOption[] = []
            for (const album of albums) {
              // For owners, only include albums they created
              // For admins, include all albums
              if (userRole === 'admin' || (userRole === 'owner' && album.createdBy === userId)) {
                result.push({
                  _id: album._id,
                  name: album.name,
                  alias: album.alias,
                  level: album.level,
                  storagePath: album.storagePath
                })
              }
              
              if (album.children && album.children.length > 0) {
                result = result.concat(flattenAlbums(album.children))
              }
            }
            return result
          }
          
          const allAlbums = flattenAlbums(data.data)
          setParentAlbums(allAlbums)
        }
      }
    } catch (error) {
      console.error('Failed to load parent albums:', error)
    }
  }

  const loadStorageOptions = async () => {
    try {
      const userRole = (session?.user as any)?.role
      
      // For owners, use the owner-specific API that respects permissions
      // For admins and others, use the admin API that shows all options
      const apiEndpoint = userRole === 'owner' 
        ? '/api/owner/storage-options' 
        : '/api/admin/storage-options'
      
      const response = await fetch(apiEndpoint)
      const data = await response.json()
      
      if (data.success) {
        setStorageOptions(data.data)
        // Set default storage provider to first available option
        if (data.data.length > 0) {
          setFormData(prev => ({
            ...prev,
            storageProvider: data.data[0].id
          }))
        }
      } else {
        console.error('Failed to load storage options:', data.error)
        // Fallback to local storage
        setStorageOptions([{
          id: 'local',
          name: 'Local Storage',
          type: 'local',
          isEnabled: true
        }])
      }
    } catch (error) {
      console.error('Error loading storage options:', error)
      // Fallback to local storage
      setStorageOptions([{
        id: 'local',
        name: 'Local Storage',
        type: 'local',
        isEnabled: true
      }])
    } finally {
      setLoadingStorageOptions(false)
    }
  }

  const generateAlias = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
  }

  const handleNameChange = (name: string) => {
    setFormData(prev => ({ 
      ...prev, 
      name,
      alias: generateAlias(name) // Auto-generate alias from name
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.alias) {
      showNotification('error', 'Validation Error', 'Name and alias are required')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/albums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          showNotification('success', 'Album Created', 'Album created successfully!')
          setTimeout(() => {
            router.push(`/admin/albums/${data.data._id}`)
          }, 1500)
        } else {
          showNotification('error', 'Creation Failed', data.error || 'Failed to create album')
        }
      } else {
        showNotification('error', 'Creation Failed', 'Failed to create album')
      }
    } catch (error) {
      console.error('Failed to create album:', error)
      showNotification('error', 'Creation Failed', 'Failed to create album')
    } finally {
      setIsLoading(false)
    }
  }

  const getStorageProviderName = (provider: string) => {
    switch (provider) {
      case 'google-drive': return 'Google Drive'
      case 'aws-s3': return 'Amazon S3'
      case 'local': return 'Local Storage'
      default: return provider
    }
  }

  const getParentDisplayName = (album: AlbumOption) => {
    const indent = '  '.repeat(album.level)
    return `${indent}${album.name} (${album.storagePath})`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('admin.createNewAlbum')}</h1>
                <p className="mt-2 text-gray-600">
                  Create a new album with hierarchical organization and storage provider selection.
                </p>
              </div>
              <button
                onClick={() => router.push('/albums')}
                className="btn-secondary"
              >
                Back to Albums
              </button>
            </div>
          </div>

          {/* Album Creation Form */}
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Album Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="input"
                        placeholder="Enter album name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Album Alias *
                      </label>
                      <input
                        type="text"
                        value={formData.alias}
                        onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
                        className="input"
                        placeholder="URL-friendly name"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        This will be used in the folder structure and URLs
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="input"
                      rows={3}
                      placeholder="Describe your album"
                    />
                  </div>
                </div>

                {/* Storage Configuration */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Storage Provider *
                      </label>
                      {loadingStorageOptions ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading storage options...
                          </div>
                        </div>
                      ) : (
                        <select
                          value={formData.storageProvider}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            storageProvider: e.target.value
                          }))}
                          className="input"
                          required
                        >
                          {storageOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Where photos will be stored
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Parent Album
                      </label>
                      <select
                        value={formData.parentAlbumId}
                        onChange={(e) => setFormData(prev => ({ ...prev, parentAlbumId: e.target.value }))}
                        className="input"
                      >
                        <option value="">No Parent (Root Level)</option>
                        {parentAlbums.map((album) => (
                          <option key={album._id} value={album._id}>
                            {getParentDisplayName(album)}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Select parent album for hierarchy
                      </p>
                    </div>
                  </div>
                </div>

                {/* Folder Structure Preview */}
                {formData.parentAlbumId && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">📁 Folder Structure Preview</h4>
                    <div className="text-sm text-blue-800">
                      <p><strong>Storage Path:</strong></p>
                      <div className="font-mono bg-white p-2 rounded border mt-1">
                        {parentAlbums.find(a => a._id === formData.parentAlbumId)?.storagePath}/{formData.alias}
                      </div>
                    </div>
                  </div>
                )}

                {/* Album Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Album Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isPublic"
                        checked={formData.isPublic}
                        onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                        Public Album
                      </label>
                      <p className="ml-2 text-sm text-gray-500">
                        Visible to all users
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isFeatured"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isFeatured" className="ml-2 block text-sm text-gray-900">
                        Featured Album
                      </label>
                      <p className="ml-2 text-sm text-gray-500">
                        Highlighted on the home page
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push('/albums')}
                    className="btn-secondary"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating...' : 'Create Album'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Notification Dialog */}
      <NotificationDialog
        isOpen={notification.isOpen}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  )
}
