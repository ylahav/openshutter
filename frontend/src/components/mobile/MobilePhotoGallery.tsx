'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'
// Simple interface for mobile gallery display
interface MobilePhoto {
  _id: string
  title: string | Record<string, string>
  description?: string | Record<string, string>
  storage: {
    url: string
    thumbnailPath: string
  }
  dimensions: {
    width: number
    height: number
  }
  uploadedAt: string | Date
  tags?: string[]
  people?: string[]
  location?: string | { name: string; coordinates?: [number, number] }
}
import { 
  Heart, 
  Share2, 
  Download, 
  Info, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react'

// Using Photo from @/types/index.ts instead of local interface

interface MobilePhotoGalleryProps {
  photos: MobilePhoto[]
  onPhotoSelect?: (photo: MobilePhoto, index: number) => void
  className?: string
}

export default function MobilePhotoGallery({
  photos,
  onPhotoSelect,
  className = ''
}: MobilePhotoGalleryProps) {
  const { t } = useI18n()
  const { currentLanguage } = useLanguage()
  const [selectedPhoto, setSelectedPhoto] = useState<MobilePhoto | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  
  const lightboxRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const openLightbox = useCallback((photo: MobilePhoto, index: number) => {
    setSelectedPhoto(photo)
    setSelectedIndex(index)
    setIsLightboxOpen(true)
    setZoom(1)
    setRotation(0)
    onPhotoSelect?.(photo, index)
  }, [onPhotoSelect])

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false)
    setSelectedPhoto(null)
    setZoom(1)
    setRotation(0)
  }, [])

  const navigatePhoto = useCallback((direction: 'prev' | 'next') => {
    if (!selectedPhoto) return
    
    const newIndex = direction === 'prev' 
      ? (selectedIndex - 1 + photos.length) % photos.length
      : (selectedIndex + 1) % photos.length
    
    setSelectedIndex(newIndex)
    setSelectedPhoto(photos[newIndex])
    setZoom(1)
    setRotation(0)
  }, [selectedPhoto, selectedIndex, photos])

  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)))
  }, [])

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isLightboxOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeLightbox()
          break
        case 'ArrowLeft':
          navigatePhoto('prev')
          break
        case 'ArrowRight':
          navigatePhoto('next')
          break
        case '+':
        case '=':
          handleZoom(0.2)
          break
        case '-':
          handleZoom(-0.2)
          break
        case 'r':
          handleRotate()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen, navigatePhoto, handleZoom, handleRotate, closeLightbox])

  // Handle touch gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    const startX = touch.clientX
    const startY = touch.clientY

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      const deltaX = touch.clientX - startX
      const deltaY = touch.clientY - startY
      
      // Swipe left/right for navigation
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          navigatePhoto('prev')
        } else {
          navigatePhoto('next')
        }
      }
    }

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
  }, [navigatePhoto])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Helper functions to get text values using translation utilities
  const getTitleText = (title: string | Record<string, string>): string => {
    if (typeof title === 'string') return title
    return MultiLangUtils.getTextValue(title, currentLanguage) || 'Photo'
  }

  const getDescriptionText = (description?: string | Record<string, string>): string => {
    if (!description) return ''
    if (typeof description === 'string') return description
    return MultiLangUtils.getTextValue(description, currentLanguage) || ''
  }

  return (
    <div className={`mobile-photo-gallery ${className}`}>
      {/* Photo Grid */}
      <div className="grid grid-cols-2 gap-2 p-2">
        {photos.map((photo, index) => (
          <div
            key={photo._id}
            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => openLightbox(photo, index)}
          >
            <img
              src={photo.storage.thumbnailPath || photo.storage.url}
              alt={getTitleText(photo.title)}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-center">
                <h3 className="font-medium text-sm truncate px-2">
                  {getTitleText(photo.title)}
                </h3>
                <p className="text-xs opacity-90">
                  {formatDate(photo.uploadedAt instanceof Date ? photo.uploadedAt.toISOString() : photo.uploadedAt)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && selectedPhoto && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onTouchStart={handleTouchStart}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 text-white">
            <div className="flex items-center space-x-4">
              <button
                onClick={closeLightbox}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div>
                <h2 className="font-semibold text-lg truncate">
                  {getTitleText(selectedPhoto.title)}
                </h2>
                <p className="text-sm opacity-80">
                  {selectedIndex + 1} of {photos.length}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleZoom(-0.2)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleZoom(0.2)}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={handleRotate}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="relative max-w-full max-h-full">
              <img
                ref={imageRef}
                src={selectedPhoto.storage.url}
                alt={getTitleText(selectedPhoto.title)}
                className="max-w-full max-h-full object-contain transition-transform"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between p-4 bg-black/50">
            <button
              onClick={() => navigatePhoto('prev')}
              className="flex items-center space-x-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-white"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">
                {t('mobile.gallery.previous', 'Previous')}
              </span>
            </button>

            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-full hover:bg-white/20 transition-colors text-white">
                <Heart className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-white/20 transition-colors text-white">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-white/20 transition-colors text-white">
                <Download className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => navigatePhoto('next')}
              className="flex items-center space-x-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-white"
            >
              <span className="text-sm font-medium">
                {t('mobile.gallery.next', 'Next')}
              </span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Photo Info */}
          <div className="p-4 bg-black/50 text-white">
            <div className="space-y-2">
              {selectedPhoto.description && (
                <p className="text-sm opacity-90">
                  {getDescriptionText(selectedPhoto.description)}
                </p>
              )}
              
              <div className="flex flex-wrap gap-2">
                {selectedPhoto.tags?.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-600/50 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              {selectedPhoto.people && selectedPhoto.people.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs opacity-70">
                    {t('mobile.gallery.people', 'People')}:
                  </span>
                  <span className="text-xs">
                    {selectedPhoto.people.join(', ')}
                  </span>
                </div>
              )}
              
              {selectedPhoto.location && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs opacity-70">
                    {t('mobile.gallery.location', 'Location')}:
                  </span>
                  <span className="text-xs">
                    {typeof selectedPhoto.location === 'string' ? selectedPhoto.location : selectedPhoto.location?.name || ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
