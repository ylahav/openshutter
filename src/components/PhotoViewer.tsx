'use client'

import { useState, useEffect, useCallback } from 'react'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'

interface Photo {
  _id: string
  title: Record<string, string> | string
  description?: Record<string, string> | string
  storage: {
    url: string
    thumbnailPath: string
  }
  tags?: string[]
  people?: string[]
  location?: {
    name: string
    coordinates?: { latitude: number; longitude: number }
    address?: string
  }
  exif?: {
    // Basic Camera Information
    make?: string
    model?: string
    serialNumber?: string
    
    // Date and Time
    dateTime?: string
    dateTimeOriginal?: string
    dateTimeDigitized?: string
    offsetTime?: string
    offsetTimeOriginal?: string
    offsetTimeDigitized?: string
    
    // Camera Settings
    exposureTime?: string
    fNumber?: string
    iso?: number
    focalLength?: string
    exposureProgram?: string
    exposureMode?: string
    exposureBiasValue?: number
    maxApertureValue?: number
    shutterSpeedValue?: string
    apertureValue?: string
    
    // Image Quality
    whiteBalance?: string
    meteringMode?: string
    flash?: string
    colorSpace?: string
    customRendered?: string
    sceneCaptureType?: string
    
    // Resolution
    xResolution?: number
    yResolution?: number
    resolutionUnit?: string
    focalPlaneXResolution?: number
    focalPlaneYResolution?: number
    focalPlaneResolutionUnit?: string
    
    // Lens Information
    lensInfo?: string
    lensModel?: string
    lensSerialNumber?: string
    
    // Software and Processing
    software?: string
    copyright?: string
    exifVersion?: string
    
    // GPS Information
    gps?: {
      latitude?: number
      longitude?: number
      altitude?: number
    }
    
    // Additional Technical Data
    recommendedExposureIndex?: number
    subsecTimeOriginal?: string
    subsecTimeDigitized?: string
  }
  uploadedAt?: string
  createdAt: string
}

interface PhotoViewerProps {
  photos: Photo[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onNavigate: (index: number) => void
  showExifData?: boolean
}

export default function PhotoViewer({ 
  photos, 
  currentIndex, 
  isOpen, 
  onClose, 
  onNavigate,
  showExifData = true
}: PhotoViewerProps) {
  const { currentLanguage, isRTL } = useLanguage()
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  // Get the correct arrow direction based on RTL
  const getArrowPath = () => isRTL ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"
  
  const currentPhoto = photos[currentIndex]
  const hasNext = currentIndex < photos.length - 1
  const hasPrev = currentIndex > 0

  const displayTitle = MultiLangUtils.getTextValue(currentPhoto?.title as any, currentLanguage)
  const displayDescription = MultiLangUtils.getTextValue(currentPhoto?.description as any, currentLanguage)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return
    
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowLeft':
        if (hasPrev) {
          onNavigate(currentIndex - 1)
        }
        break
      case 'ArrowRight':
        if (hasNext) {
          onNavigate(currentIndex + 1)
        }
        break
    }
  }, [isOpen, hasPrev, hasNext, currentIndex, onClose, onNavigate])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleKeyDown])

  useEffect(() => {
    if (currentPhoto) {
      setImageLoading(true)
      setImageError(false)
    }
  }, [currentPhoto])

  if (!isOpen || !currentPhoto) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white hover:text-gray-300 transition-colors"
        aria-label="Close photo viewer"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Navigation buttons */}
      {hasPrev && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-3 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full"
          aria-label="Previous photo"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {hasNext && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-3 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full"
          aria-label="Next photo"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getArrowPath()} />
          </svg>
        </button>
      )}

      {/* Photo counter */}
      <div className="absolute top-4 left-4 z-10 text-white text-sm">
        {currentIndex + 1} of {photos.length}
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center w-full h-full px-4">
        {/* Photo */}
        <div className="relative max-w-full max-h-[80vh] flex items-center justify-center">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent"></div>
            </div>
          )}
          
          {imageError ? (
            <div className="text-white text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>Failed to load image</p>
            </div>
          ) : (
            <img
              src={currentPhoto.storage.url}
              alt={displayTitle}
              className="max-w-full max-h-full object-contain"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false)
                setImageError(true)
              }}
            />
          )}
        </div>

        {/* Photo info */}
        <div className="mt-6 max-w-2xl w-full text-center text-white">
          <h2 className="text-xl font-semibold mb-2">{displayTitle}</h2>
          
          {displayDescription && (
            <p className="text-gray-300 mb-4">{displayDescription}</p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            {currentPhoto.tags && currentPhoto.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>{currentPhoto.tags.join(', ')}</span>
              </div>
            )}

            {currentPhoto.people && currentPhoto.people.length > 0 && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span>{currentPhoto.people.join(', ')}</span>
              </div>
            )}

            {currentPhoto.location && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{currentPhoto.location.name}</span>
              </div>
            )}

            {/* EXIF Data */}
            {showExifData && currentPhoto.exif && (
              <>
                {/* Camera Information */}
                {currentPhoto.exif.make && currentPhoto.exif.model && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{currentPhoto.exif.make} {currentPhoto.exif.model}</span>
                  </div>
                )}

                {/* Lens Information */}
                {currentPhoto.exif.lensModel && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>{currentPhoto.exif.lensModel}</span>
                  </div>
                )}

                {/* Camera Settings */}
                {currentPhoto.exif.exposureTime && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{currentPhoto.exif.exposureTime}</span>
                  </div>
                )}

                {currentPhoto.exif.fNumber && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>f/{currentPhoto.exif.fNumber}</span>
                  </div>
                )}

                {currentPhoto.exif.iso && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span>ISO {currentPhoto.exif.iso}</span>
                  </div>
                )}

                {currentPhoto.exif.focalLength && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>{currentPhoto.exif.focalLength}mm</span>
                  </div>
                )}

                {/* Date Taken */}
                {currentPhoto.exif.dateTimeOriginal && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Taken: {new Date(currentPhoto.exif.dateTimeOriginal).toLocaleDateString()}</span>
                  </div>
                )}

                {/* GPS */}
                {currentPhoto.exif.gps && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{currentPhoto.exif.gps.latitude?.toFixed(4)}, {currentPhoto.exif.gps.longitude?.toFixed(4)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm text-center opacity-70">
        Use ← → arrow keys to navigate • ESC to close
      </div>
    </div>
  )
}
