'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useI18n } from '@/hooks/useI18n'
import AdminGuard from '@/components/AdminGuard'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'

interface Album {
  _id: string
  name: any
  alias: string
  description: any
  isPublic: boolean
  isFeatured: boolean
  storageProvider: string
  storagePath: string
  parentAlbumId?: string
  parentPath: string
  level: number
  order: number
  photoCount: number
  createdAt: string
}

export default function AdminAlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const response = await fetch('/api/albums')
        if (!response.ok) {
          throw new Error('Failed to fetch albums')
        }
        
        const result = await response.json()
        if (result.success) {
          setAlbums(result.data)
        } else {
          setError(result.error || 'Failed to fetch albums')
        }
      } catch (error) {
        console.error('Failed to fetch albums:', error)
        setError('Failed to fetch albums')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlbums()
  }, [])

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{t('loadingAlbums')}</p>
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
              <h1 className="text-3xl font-bold text-gray-900">{t('albumsManagement')}</h1>
              <p className="mt-2 text-gray-600">
                {t('albumsOverview')}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link href="/albums/new" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500">
                {t('createNewAlbum')}
              </Link>
              <Link href="/admin" className="btn-secondary">
                {t('backToAdmin')}
              </Link>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{albums.length}</div>
                <div className="text-sm text-gray-600">{t('totalAlbums')}</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {albums.filter(album => album.isPublic).length}
                </div>
                <div className="text-sm text-gray-600">{t('publicAlbums')}</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {albums.filter(album => album.isFeatured).length}
                </div>
                <div className="text-sm text-gray-600">{t('featuredAlbums')}</div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {albums.reduce((total, album) => total + album.photoCount, 0)}
                </div>
                <div className="text-sm text-gray-600">{t('totalPhotos')}</div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Albums Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => (
              <div key={album._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{typeof album.name === 'string' ? album.name : MultiLangUtils.getValue(album.name as any, currentLanguage)}</h3>
                    <div className="flex space-x-2">
                      {album.isFeatured && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {t('featured')}
                        </span>
                      )}
                      {album.isPublic ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {t('public')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {t('private')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{typeof album.description === 'string' ? album.description : MultiLangUtils.getValue(album.description as any, currentLanguage)}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>{album.photoCount} {t('photos')}</span>
                    <span>{album.storageProvider}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Link
                      href={`/admin/albums/${album._id}`}
                      className="flex-1 text-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {t('manage')}
                    </Link>
                    <Link
                      href={`/albums/${album.alias}`}
                      className="flex-1 text-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      {t('view')}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {albums.length === 0 && !error && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noAlbums')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('getStartedCreateAlbum')}</p>
              <div className="mt-6">
                <Link
                  href="/albums/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('createAlbum')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}
