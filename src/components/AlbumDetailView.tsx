'use client'

import Link from 'next/link'
import { useState } from 'react'
import PhotoLightbox from '@/components/PhotoLightbox'
import BulkActions from '@/components/admin/BulkActions'
import { MultiLangUtils } from '@/types/multi-lang'
import { TemplateAlbum, TemplatePhoto } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useI18n } from '@/hooks/useI18n'
import NotificationDialog from '@/components/NotificationDialog'
import ConfirmDialog from '@/components/ConfirmDialog'

export interface AlbumDetailViewProps {
  album: TemplateAlbum
  photos: TemplatePhoto[]
  role: 'admin' | 'owner'
  albumId: string
}

export default function AlbumDetailView({ album, photos, role, albumId }: AlbumDetailViewProps) {
  const { currentLanguage } = useLanguage()
  const { t } = useI18n()
  const backHref = role === 'admin' ? '/admin/albums' : '/owner/albums'
  const editHref = role === 'admin' ? `/admin/albums/${albumId}/edit` : `/owner/albums/${albumId}/edit`
  const uploadHref = role === 'admin' ? `/admin/photos/upload?albumId=${albumId}` : `/photos/upload?albumId=${albumId}&returnTo=/owner/albums/${albumId}`
  const [localPhotos, setLocalPhotos] = useState<TemplatePhoto[]>(photos)
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [reReadingExif, setReReadingExif] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const [bulkMode, setBulkMode] = useState(false)
  const [notification, setNotification] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'info' | 'warning'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  })
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

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

  const handleReReadExif = () => {
    setShowConfirmDialog(true)
  }

  const confirmReReadExif = async () => {
    setShowConfirmDialog(false)
    
    try {
      setReReadingExif(true)
      const response = await fetch(`/api/admin/albums/${albumId}/re-read-exif`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      
      if (result.success) {
        const message = t('albums.exifReReadResults')
          .replace('{processed}', result.data.processed)
          .replace('{updated}', result.data.updated)
          .replace('{errors}', result.data.errors)
          + (result.data.errorsList ? t('albums.exifReReadErrors').replace('{errors}', result.data.errorsList.join('\n')) : '')
        setNotification({
          isOpen: true,
          type: 'success',
          title: t('albums.exifReReadCompleted'),
          message: message
        })
        // Refresh the page to show updated EXIF data after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setNotification({
          isOpen: true,
          type: 'error',
          title: t('albums.exifReReadFailed'),
          message: result.error || t('albums.exifReReadUnknownError')
        })
      }
    } catch (error) {
      console.error('Failed to re-read EXIF data:', error)
      setNotification({
        isOpen: true,
        type: 'error',
        title: t('albums.exifReReadFailed'),
        message: t('albums.exifReReadTryAgain')
      })
    } finally {
      setReReadingExif(false)
    }
  }

  // Bulk actions handlers
  const handleBulkUpdate = async (updates: {
    tags?: string[]
    people?: string[]
    location?: {
      name: string
      coordinates?: { latitude: number; longitude: number }
      address?: string
    }
    isPublished?: boolean
    isLeading?: boolean
  }) => {
    try {
      const response = await fetch(`/api/photos/bulk-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoIds: selectedPhotos,
          updates
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update photos')
      }

      const result = await response.json()
      if (result.success) {
        setNotification({
          isOpen: true,
          type: 'success',
          title: 'Bulk Update Successful',
          message: `Successfully updated ${selectedPhotos.length} photos`
        })
        setSelectedPhotos([])
        setBulkMode(false)
        // Refresh the page to show updated data
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        throw new Error(result.error || 'Failed to update photos')
      }
    } catch (error) {
      console.error('Failed to bulk update photos:', error)
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Bulk Update Failed',
        message: error instanceof Error ? error.message : 'An error occurred'
      })
    }
  }

  const handlePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    )
  }

  const handleSelectAll = () => {
    if (selectedPhotos.length === localPhotos.length) {
      setSelectedPhotos([])
    } else {
      setSelectedPhotos(localPhotos.map(photo => photo._id))
    }
  }

  const handleClearSelection = () => {
    setSelectedPhotos([])
    setBulkMode(false)
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
                {(role === 'admin' || role === 'owner') && (
                  <button
                    onClick={handleReReadExif}
                    disabled={reReadingExif}
                    className="w-full text-center px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reReadingExif ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                        {t('albums.reReadingExif')}
                      </div>
                    ) : (
                      t('albums.reReadExifData')
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Photos Grid */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Photos ({localPhotos.length})</h2>
            <div className="flex items-center gap-3">
              {role === 'admin' && localPhotos.length > 0 && (
                <button
                  onClick={() => setBulkMode(!bulkMode)}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    bulkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {bulkMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
                </button>
              )}
              <Link href={uploadHref} className="btn-primary">
                Upload Photos
              </Link>
            </div>
          </div>

          {bulkMode && localPhotos.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedPhotos.length === localPhotos.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-600">
                    {selectedPhotos.length} of {localPhotos.length} selected
                  </span>
                </div>
                <button
                  onClick={handleClearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
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
              {localPhotos.map((photo, idx) => (
                <div key={photo._id} className={`relative group ${bulkMode ? 'cursor-pointer' : ''}`}>
                  {bulkMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedPhotos.includes(photo._id)}
                        onChange={() => handlePhotoSelection(photo._id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => {
                      if (!bulkMode) {
                        setLightboxIndex(idx)
                        setLightboxOpen(true)
                      } else {
                        handlePhotoSelection(photo._id)
                      }
                    }}
                  >
                    <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={(photo as any).storage?.thumbnailPath || (photo as any).storage?.url}
                        alt={typeof photo.title === 'string' ? photo.title : MultiLangUtils.getTextValue((photo as any).title, currentLanguage) || ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </button>
                  <div className="mt-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {typeof photo.title === 'string' ? photo.title : MultiLangUtils.getTextValue((photo as any).title, currentLanguage) || ''}
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
      {/* Lightbox */}
      <PhotoLightbox
        photos={localPhotos.map(p => ({
          _id: p._id,
          url: (p as any).storage?.url || (p as any).storage?.originalPath,
          thumbnailUrl: (p as any).storage?.thumbnailPath,
          title: typeof p.title === 'string' ? p.title : MultiLangUtils.getTextValue((p as any).title, currentLanguage) || '',
          takenAt: (p as any).exif?.dateTimeOriginal,
          exif: (p as any).exif ? {
            // Basic Camera Information
            make: (p as any).exif.make,
            model: (p as any).exif.model,
            serialNumber: (p as any).exif.serialNumber,
            
            // Date and Time
            dateTime: (p as any).exif.dateTime,
            dateTimeOriginal: (p as any).exif.dateTimeOriginal,
            dateTimeDigitized: (p as any).exif.dateTimeDigitized,
            offsetTime: (p as any).exif.offsetTime,
            offsetTimeOriginal: (p as any).exif.offsetTimeOriginal,
            offsetTimeDigitized: (p as any).exif.offsetTimeDigitized,
            
            // Camera Settings
            exposureTime: (p as any).exif.exposureTime,
            fNumber: (p as any).exif.fNumber,
            iso: (p as any).exif.iso,
            focalLength: (p as any).exif.focalLength,
            exposureProgram: (p as any).exif.exposureProgram,
            exposureMode: (p as any).exif.exposureMode,
            exposureBiasValue: (p as any).exif.exposureBiasValue,
            maxApertureValue: (p as any).exif.maxApertureValue,
            shutterSpeedValue: (p as any).exif.shutterSpeedValue,
            apertureValue: (p as any).exif.apertureValue,
            
            // Image Quality
            whiteBalance: (p as any).exif.whiteBalance,
            meteringMode: (p as any).exif.meteringMode,
            flash: (p as any).exif.flash,
            colorSpace: (p as any).exif.colorSpace,
            customRendered: (p as any).exif.customRendered,
            sceneCaptureType: (p as any).exif.sceneCaptureType,
            
            // Resolution
            xResolution: (p as any).exif.xResolution,
            yResolution: (p as any).exif.yResolution,
            resolutionUnit: (p as any).exif.resolutionUnit,
            focalPlaneXResolution: (p as any).exif.focalPlaneXResolution,
            focalPlaneYResolution: (p as any).exif.focalPlaneYResolution,
            focalPlaneResolutionUnit: (p as any).exif.focalPlaneResolutionUnit,
            
            // Lens Information
            lensInfo: (p as any).exif.lensInfo,
            lensModel: (p as any).exif.lensModel,
            lensSerialNumber: (p as any).exif.lensSerialNumber,
            
            // Software and Processing
            software: (p as any).exif.software,
            copyright: (p as any).exif.copyright,
            exifVersion: (p as any).exif.exifVersion,
            
            // GPS Information
            gps: (p as any).exif.gps ? {
              latitude: (p as any).exif.gps.latitude,
              longitude: (p as any).exif.gps.longitude,
              altitude: (p as any).exif.gps.altitude,
            } : undefined,
            
            // Additional Technical Data
            recommendedExposureIndex: (p as any).exif.recommendedExposureIndex,
            subsecTimeOriginal: (p as any).exif.subsecTimeOriginal,
            subsecTimeDigitized: (p as any).exif.subsecTimeDigitized,
            
            // Legacy fields for backward compatibility
            gpsLatitude: (p as any).exif.gpsLatitude,
            gpsLongitude: (p as any).exif.gpsLongitude,
          } : undefined,
          metadata: (p as any).metadata ? {
            width: (p as any).metadata.width,
            height: (p as any).metadata.height,
            fileSize: (p as any).metadata.fileSize,
            format: (p as any).metadata.format,
          } : undefined,
        }))}
        startIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        autoPlay={false}
        intervalMs={4000}
      />

      {/* Notification Dialog */}
      <NotificationDialog
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        autoClose={false}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={confirmReReadExif}
        title={t('albums.reReadExifData')}
        message={t('albums.confirmReReadExif')}
        confirmText={t('albums.reReadExifData')}
        cancelText={t('cancel')}
        variant="default"
      />

      {/* Bulk Actions */}
      {role === 'admin' && (
        <BulkActions
          selectedItems={selectedPhotos}
          onBulkUpdate={handleBulkUpdate}
          onClearSelection={handleClearSelection}
          itemType="photos"
        />
      )}
    </div>
  )
}
