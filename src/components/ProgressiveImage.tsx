'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { TemplatePhoto } from '@/types'
import { PerformanceMonitor } from '@/services/performance-monitor'

interface ProgressiveImageProps {
  photo: TemplatePhoto
  alt: string
  width: number
  height: number
  className?: string
  sizes?: string
  priority?: boolean
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
  style?: React.CSSProperties
  onClick?: () => void
  useOptimalDimensions?: boolean // Whether to calculate optimal dimensions based on photo aspect ratio
}

export default function ProgressiveImage({
  photo,
  alt,
  width,
  height,
  className = '',
  sizes,
  priority = false,
  loading = 'lazy',
  fetchPriority = 'auto',
  style,
  onClick,
  useOptimalDimensions = true
}: ProgressiveImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [optimalDimensions, setOptimalDimensions] = useState({ width, height })
  const [loadStartTime, setLoadStartTime] = useState<number>(0)

  // Calculate optimal dimensions based on photo aspect ratio
  useEffect(() => {
    if (useOptimalDimensions && photo.dimensions) {
      const { width: photoWidth, height: photoHeight } = photo.dimensions
      const aspectRatio = photoWidth / photoHeight
      
      // Calculate dimensions that fit within the container while maintaining aspect ratio
      const containerAspectRatio = width / height
      
      let optimalWidth = width
      let optimalHeight = height
      
      if (aspectRatio > containerAspectRatio) {
        // Photo is wider than container - fit to width
        optimalHeight = Math.round(width / aspectRatio)
      } else {
        // Photo is taller than container - fit to height
        optimalWidth = Math.round(height * aspectRatio)
      }
      
      setOptimalDimensions({ width: optimalWidth, height: optimalHeight })
    } else {
      setOptimalDimensions({ width, height })
    }
  }, [photo.dimensions, width, height, useOptimalDimensions])

  // Generate a low-quality placeholder (1x1 pixel with blur)
  const generateBlurDataURL = (width: number, height: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      // Create a simple gradient placeholder
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#f3f4f6')
      gradient.addColorStop(1, '#e5e7eb')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }
    return canvas.toDataURL('image/jpeg', 0.1)
  }

  const [blurDataURL, setBlurDataURL] = useState<string>('')

  useEffect(() => {
    setBlurDataURL(generateBlurDataURL(optimalDimensions.width, optimalDimensions.height))
  }, [optimalDimensions.width, optimalDimensions.height])

  const handleImageLoad = () => {
    setImageLoaded(true)
    
    // Track performance metrics
    if (loadStartTime > 0) {
      const imageUrl = photo.storage?.thumbnailPath || photo.storage?.url || photo.url || ''
      const imageSize = photo.size || 0
      const format = imageUrl.split('.').pop()?.toLowerCase() || 'unknown'
      const cached = false // TODO: Implement cache detection
      
      PerformanceMonitor.trackImageLoad(imageUrl, loadStartTime, imageSize, format, cached)
    }
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(true)
  }

  const handleImageStart = () => {
    setLoadStartTime(performance.now())
  }

  const imageSrc = photo.storage?.thumbnailPath || photo.storage?.url || photo.url || '/placeholder.jpg'

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={style}
      onClick={onClick}
    >
      {/* Blur placeholder */}
      {!imageLoaded && !imageError && blurDataURL && (
        <div className="absolute inset-0">
          <Image
            src={blurDataURL}
            alt=""
            width={optimalDimensions.width}
            height={optimalDimensions.height}
            className="w-full h-full object-cover filter blur-sm scale-110"
            sizes={sizes}
            priority={priority}
            decoding="async"
            fetchPriority={fetchPriority}
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Loading spinner */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      )}

      {/* Main image */}
      <Image
        src={imageSrc}
        alt={alt}
        width={optimalDimensions.width}
        height={optimalDimensions.height}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        sizes={sizes}
        priority={priority}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        onLoad={handleImageLoad}
        onError={handleImageError}
        onLoadStart={handleImageStart}
        style={{ objectFit: 'cover' }}
      />

      {/* Error fallback */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Failed to load</p>
          </div>
        </div>
      )}
    </div>
  )
}
