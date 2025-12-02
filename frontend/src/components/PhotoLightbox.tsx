'use client'

import { useEffect, useRef, useState } from 'react'

export interface LightboxPhoto {
  _id: string
  url: string
  thumbnailUrl?: string
  title?: string
  takenAt?: string | Date
  faceRecognition?: {
    faces?: Array<{
      box: { x: number; y: number; width: number; height: number }
      matchedPersonId?: string
      confidence?: number
    }>
  }
  exif?: {
    // Basic Camera Information
    make?: string
    model?: string
    serialNumber?: string
    
    // Date and Time
    dateTime?: string | Date
    dateTimeOriginal?: string | Date
    dateTimeDigitized?: string | Date
    offsetTime?: string
    offsetTimeOriginal?: string
    offsetTimeDigitized?: string
    
    // Camera Settings
    exposureTime?: string
    fNumber?: number
    iso?: number
    focalLength?: number
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
    
    // Legacy fields for backward compatibility
    gpsLatitude?: number
    gpsLongitude?: number
  }
  metadata?: {
    width?: number
    height?: number
    fileSize?: number
    format?: string
  }
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[]
  startIndex: number
  isOpen: boolean
  onClose: () => void
  autoPlay?: boolean
  intervalMs?: number
}

export default function PhotoLightbox({
  photos,
  startIndex,
  isOpen,
  onClose,
  autoPlay = false,
  intervalMs = 4000,
}: PhotoLightboxProps) {
  const [current, setCurrent] = useState(startIndex)
  const [playing, setPlaying] = useState(autoPlay)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [showFaces, setShowFaces] = useState(false)
  const [faceData, setFaceData] = useState<{
    faces: Array<{
      box: { x: number; y: number; width: number; height: number }
      matchedPersonId?: string
      confidence?: number
      personName?: string
    }>
    imageSize: { width: number; height: number }
  } | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    setCurrent(startIndex)
  }, [startIndex])

  // Fetch face data when photo changes
  useEffect(() => {
    if (!isOpen) return
    
    const photo = photos[current]
    if (!photo?._id) {
      // Check if face data is already in photo object
      const faces = photo?.faceRecognition?.faces
      if (faces && Array.isArray(faces) && faces.length > 0) {
        setFaceData({
          faces: faces.map((face: any) => ({
            box: face.box,
            matchedPersonId: face.matchedPersonId?.toString(),
            confidence: face.confidence
          })),
          imageSize: { width: 0, height: 0 }
        })
        return
      }
      setFaceData(null)
      return
    }

    const fetchFaceData = async () => {
      try {
        const response = await fetch(`/api/photos/${photo._id}`)
        if (response.ok) {
          const photoData = await response.json()
          if (photoData?.faceRecognition?.faces?.length > 0) {
            // Fetch person names for matched faces (only if authenticated)
            const facesWithNames = await Promise.all(
              photoData.faceRecognition.faces.map(async (face: any) => {
                if (face.matchedPersonId) {
                  try {
                    const personResponse = await fetch(`/api/people/${face.matchedPersonId}`)
                    if (personResponse.ok) {
                      const personData = await personResponse.json()
                      // Note: /api/people is a Next.js route, may still use success wrapper
                      const person = personData.success ? personData.data : personData
                      const name = person.fullName?.en || person.fullName?.he || person.firstName?.en || person.firstName?.he || 'Unknown'
                      return { ...face, personName: name }
                    }
                  } catch (err) {
                    // Silently fail if not authenticated or person not found
                    console.debug('Could not fetch person name:', err)
                  }
                }
                return face
              })
            )
            setFaceData({
              faces: facesWithNames,
              imageSize: { width: 0, height: 0 } // Will be updated when image loads
            })
          } else {
            setFaceData(null)
          }
        }
      } catch (error) {
        console.error('Failed to fetch face data:', error)
        setFaceData(null)
      }
    }

    fetchFaceData()
  }, [current, isOpen, photos])

  // Draw faces on canvas when image loads or face data changes
  useEffect(() => {
    if (!showFaces || !faceData || !imageRef.current || !canvasRef.current) return

    const img = imageRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Wait for image to load
    if (!img.complete) {
      img.onload = () => {
        canvas.width = img.offsetWidth
        canvas.height = img.offsetHeight
        drawFaces()
      }
    } else {
      canvas.width = img.offsetWidth
      canvas.height = img.offsetHeight
      drawFaces()
    }

    function drawFaces() {
      if (!ctx || !img || !faceData) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Get actual image dimensions
      const imgNaturalWidth = img.naturalWidth || faceData.imageSize.width
      const imgNaturalHeight = img.naturalHeight || faceData.imageSize.height
      
      if (!imgNaturalWidth || !imgNaturalHeight) return

      // Calculate scale factors - face boxes are relative to natural image size
      const displayedWidth = img.offsetWidth
      const displayedHeight = img.offsetHeight
      const scaleX = displayedWidth / imgNaturalWidth
      const scaleY = displayedHeight / imgNaturalHeight

      faceData.faces.forEach((face) => {
        const x = face.box.x * scaleX
        const y = face.box.y * scaleY
        const width = face.box.width * scaleX
        const height = face.box.height * scaleY

        // Draw bounding box
        ctx.strokeStyle = face.matchedPersonId ? '#10b981' : '#f59e0b'
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, width, height)

        // Draw label background
        if (face.personName) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
          const labelText = face.personName
          ctx.font = '14px sans-serif'
          const textMetrics = ctx.measureText(labelText)
          const labelWidth = textMetrics.width + 8
          const labelHeight = 20
          ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight)

          // Draw label text
          ctx.fillStyle = '#ffffff'
          ctx.fillText(labelText, x + 4, y - 6)
        }
      })
    }

    // Redraw on resize
    const handleResize = () => {
      if (img.complete) {
        canvas.width = img.offsetWidth
        canvas.height = img.offsetHeight
        drawFaces()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [showFaces, faceData, current])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying(p => !p)
      }
      if (e.key.toLowerCase() === 'f') toggleFullscreen()
      if (e.key.toLowerCase() === 'i') setShowInfo(s => !s)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (playing) {
      timerRef.current && clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        next()
      }, intervalMs)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [playing, intervalMs, isOpen, current])

  const next = () => setCurrent(c => (c + 1) % photos.length)
  const prev = () => setCurrent(c => (c - 1 + photos.length) % photos.length)

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      next()
    } else if (isRightSwipe) {
      prev()
    }
  }

  const containerRef = useRef<HTMLDivElement>(null)
  const toggleFullscreen = async () => {
    const el = containerRef.current
    if (!el) return
    const doc: any = document
    const isFs = doc.fullscreenElement || doc.webkitFullscreenElement
    try {
      if (!isFs) {
        await (el.requestFullscreen?.() || (el as any).webkitRequestFullscreen?.())
      } else {
        await (document.exitFullscreen?.() || (doc as any).webkitExitFullscreen?.())
      }
    } catch {}
  }

  if (!isOpen) return null

  const photo = photos[current]

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-1000 bg-black/95 text-white flex flex-col"
      role="dialog"
      aria-modal="true"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 text-sm">
        <div className="opacity-80">{current + 1} / {photos.length}</div>
        <div className="flex items-center gap-2">
          {faceData && faceData.faces.length > 0 && (
            <button 
              onClick={() => setShowFaces(s => !s)} 
              className="px-2 py-1 rounded hover:bg-white/10" 
              aria-label="Toggle Face Detection"
              title={`${showFaces ? 'Hide' : 'Show'} detected faces`}
            >
              {showFaces ? '👤' : '👥'}
            </button>
          )}
          <button onClick={toggleFullscreen} className="px-2 py-1 rounded hover:bg-white/10" aria-label="Toggle Fullscreen">⛶</button>
          <button onClick={() => setPlaying(p => !p)} className="px-2 py-1 rounded hover:bg-white/10" aria-label="Play/Pause">
            {playing ? 'Pause' : 'Play'}
          </button>
          <button onClick={() => setShowInfo(s => !s)} className="px-2 py-1 rounded hover:bg-white/10" aria-label="Toggle Info">
            {showInfo ? '📋' : 'ℹ️'}
          </button>
          <button onClick={onClose} className="px-2 py-1 rounded hover:bg-white/10" aria-label="Close">✕</button>
        </div>
      </div>

      {/* Content */}
      <div 
        className="flex-1 flex items-center justify-center select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button 
          onClick={prev} 
          className="px-6 py-4 mx-4 rounded-lg hover:bg-white/20 transition-all duration-200 text-4xl font-bold" 
          aria-label="Previous"
        >
          ‹
        </button>
        <div className="max-h-[85vh] max-w-[92vw] relative">
          <img
            ref={imageRef}
            src={photo.url}
            alt={photo.title || ''}
            className="object-contain max-h-[85vh] max-w-[92vw]"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget
              if (faceData && canvasRef.current) {
                canvasRef.current.width = img.offsetWidth
                canvasRef.current.height = img.offsetHeight
                setFaceData({
                  ...faceData,
                  imageSize: { width: img.naturalWidth, height: img.naturalHeight }
                })
              }
            }}
          />
          {showFaces && faceData && faceData.faces.length > 0 && (
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          )}
          
          {/* Info Overlay */}
          {showInfo && (
            <div className="absolute top-0 right-0 bg-black/90 text-white p-4 rounded-l-lg max-w-[400px] max-h-[85vh] overflow-y-auto z-10">
              <div className="space-y-3">
                {/* Photo Title */}
                {photo.title && (
                  <div className="text-lg font-semibold border-b border-white/20 pb-2">{photo.title}</div>
                )}
                
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="opacity-60">Photo {current + 1} of {photos.length}</div>
                  {photo.metadata?.width && photo.metadata?.height && (
                    <div className="opacity-60">{photo.metadata.width} × {photo.metadata.height}</div>
                  )}
                </div>

                {/* Date/Time */}
                {(photo.takenAt || photo.exif?.dateTime || photo.exif?.dateTimeOriginal) && (
                  <div className="text-sm">
                    <span className="opacity-60">📅 Taken:</span> {(() => {
                      const date = photo.takenAt || photo.exif?.dateTime || photo.exif?.dateTimeOriginal
                      if (!date) return 'Unknown'
                      return new Date(date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    })()}
                  </div>
                )}

                {/* EXIF Data */}
                {photo.exif && (
                  <div className="space-y-3 border-t border-white/20 pt-2">
                    <div className="text-sm font-semibold opacity-80">EXIF Data</div>
                    
                    {/* Basic Camera Information */}
                    {(photo.exif.make || photo.exif.model || photo.exif.serialNumber) && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium opacity-70">Camera</div>
                        {photo.exif.make && (
                          <div className="text-sm"><span className="opacity-60">Make:</span> {photo.exif.make}</div>
                        )}
                        {photo.exif.model && (
                          <div className="text-sm"><span className="opacity-60">Model:</span> {photo.exif.model}</div>
                        )}
                        {photo.exif.serialNumber && (
                          <div className="text-sm"><span className="opacity-60">Serial:</span> {photo.exif.serialNumber}</div>
                        )}
                      </div>
                    )}

                    {/* Lens Information */}
                    {(photo.exif.lensModel || photo.exif.lensInfo || photo.exif.lensSerialNumber) && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium opacity-70">Lens</div>
                        {photo.exif.lensModel && (
                          <div className="text-sm"><span className="opacity-60">Model:</span> {photo.exif.lensModel}</div>
                        )}
                        {photo.exif.lensInfo && (
                          <div className="text-sm"><span className="opacity-60">Info:</span> {photo.exif.lensInfo}</div>
                        )}
                        {photo.exif.lensSerialNumber && (
                          <div className="text-sm"><span className="opacity-60">Serial:</span> {photo.exif.lensSerialNumber}</div>
                        )}
                      </div>
                    )}

                    {/* Exposure Settings */}
                    {(photo.exif.fNumber || photo.exif.exposureTime || photo.exif.iso || photo.exif.focalLength || photo.exif.exposureProgram || photo.exif.exposureMode) && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium opacity-70">Exposure</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {photo.exif.fNumber && (
                            <div><span className="opacity-60">f/</span>{photo.exif.fNumber}</div>
                          )}
                          {photo.exif.exposureTime && (
                            <div><span className="opacity-60">1/</span>{photo.exif.exposureTime}</div>
                          )}
                          {photo.exif.iso && (
                            <div><span className="opacity-60">ISO</span> {photo.exif.iso}</div>
                          )}
                          {photo.exif.focalLength && (
                            <div><span className="opacity-60">{photo.exif.focalLength}mm</span></div>
                          )}
                        </div>
                        {photo.exif.exposureProgram && (
                          <div className="text-sm"><span className="opacity-60">Program:</span> {photo.exif.exposureProgram}</div>
                        )}
                        {photo.exif.exposureMode && (
                          <div className="text-sm"><span className="opacity-60">Mode:</span> {photo.exif.exposureMode}</div>
                        )}
                        {photo.exif.exposureBiasValue && (
                          <div className="text-sm"><span className="opacity-60">Bias:</span> {photo.exif.exposureBiasValue} EV</div>
                        )}
                      </div>
                    )}

                    {/* Image Quality Settings */}
                    {(photo.exif.whiteBalance || photo.exif.meteringMode || photo.exif.flash || photo.exif.colorSpace) && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium opacity-70">Image Quality</div>
                        {photo.exif.whiteBalance && (
                          <div className="text-sm"><span className="opacity-60">White Balance:</span> {photo.exif.whiteBalance}</div>
                        )}
                        {photo.exif.meteringMode && (
                          <div className="text-sm"><span className="opacity-60">Metering:</span> {photo.exif.meteringMode}</div>
                        )}
                        {photo.exif.flash && (
                          <div className="text-sm"><span className="opacity-60">Flash:</span> {photo.exif.flash}</div>
                        )}
                        {photo.exif.colorSpace && (
                          <div className="text-sm"><span className="opacity-60">Color Space:</span> {photo.exif.colorSpace}</div>
                        )}
                        {photo.exif.sceneCaptureType && (
                          <div className="text-sm"><span className="opacity-60">Scene:</span> {photo.exif.sceneCaptureType}</div>
                        )}
                      </div>
                    )}

                    {/* Resolution Information */}
                    {(photo.exif.xResolution || photo.exif.yResolution || photo.exif.resolutionUnit) && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium opacity-70">Resolution</div>
                        {photo.exif.xResolution && photo.exif.yResolution && (
                          <div className="text-sm">
                            <span className="opacity-60">DPI:</span> {photo.exif.xResolution} × {photo.exif.yResolution}
                            {photo.exif.resolutionUnit && ` ${photo.exif.resolutionUnit}`}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Software and Processing */}
                    {(photo.exif.software || photo.exif.copyright || photo.exif.exifVersion) && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium opacity-70">Processing</div>
                        {photo.exif.software && (
                          <div className="text-sm"><span className="opacity-60">Software:</span> {photo.exif.software}</div>
                        )}
                        {photo.exif.copyright && (
                          <div className="text-sm"><span className="opacity-60">Copyright:</span> {photo.exif.copyright}</div>
                        )}
                        {photo.exif.exifVersion && (
                          <div className="text-sm"><span className="opacity-60">EXIF Version:</span> {photo.exif.exifVersion}</div>
                        )}
                      </div>
                    )}

                    {/* GPS Location */}
                    {((photo.exif.gps?.latitude && photo.exif.gps?.longitude) || (photo.exif.gpsLatitude && photo.exif.gpsLongitude)) && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium opacity-70">Location</div>
                        <div className="text-sm">
                          <span className="opacity-60">📍 GPS:</span> {
                            photo.exif.gps?.latitude && photo.exif.gps?.longitude 
                              ? `${photo.exif.gps.latitude.toFixed(6)}, ${photo.exif.gps.longitude.toFixed(6)}`
                              : `${photo.exif.gpsLatitude?.toFixed(6)}, ${photo.exif.gpsLongitude?.toFixed(6)}`
                          }
                          {photo.exif.gps?.altitude && ` (${photo.exif.gps.altitude}m)`}
                        </div>
                      </div>
                    )}

                    {/* Additional Technical Data */}
                    {(photo.exif.recommendedExposureIndex || photo.exif.subsecTimeOriginal || photo.exif.subsecTimeDigitized) && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium opacity-70">Technical</div>
                        {photo.exif.recommendedExposureIndex && (
                          <div className="text-sm"><span className="opacity-60">REI:</span> {photo.exif.recommendedExposureIndex}</div>
                        )}
                        {photo.exif.subsecTimeOriginal && (
                          <div className="text-sm"><span className="opacity-60">Subsec Original:</span> {photo.exif.subsecTimeOriginal}</div>
                        )}
                        {photo.exif.subsecTimeDigitized && (
                          <div className="text-sm"><span className="opacity-60">Subsec Digitized:</span> {photo.exif.subsecTimeDigitized}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                    {/* Face Recognition */}
                    {faceData && faceData.faces.length > 0 && (
                      <div className="space-y-1 border-t border-white/20 pt-2">
                        <div className="text-xs font-medium opacity-70">Detected People</div>
                        <div className="space-y-1">
                          {faceData.faces.map((face, idx) => (
                            <div key={idx} className="text-sm">
                              {face.personName ? (
                                <span className="text-green-400">✓ {face.personName}</span>
                              ) : (
                                <span className="opacity-60">Face {idx + 1} (unidentified)</span>
                              )}
                              {face.confidence && face.confidence < 1.0 && (
                                <span className="opacity-60 ml-2">
                                  ({(face.confidence * 100).toFixed(0)}%)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* File Info */}
                {photo.metadata && (
                  <div className="space-y-1 border-t border-white/20 pt-2 text-xs opacity-60">
                    {photo.metadata.format && <div>Format: {photo.metadata.format.toUpperCase()}</div>}
                    {photo.metadata.fileSize && (
                      <div>Size: {(photo.metadata.fileSize / 1024 / 1024).toFixed(1)} MB</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <button 
          onClick={next} 
          className="px-6 py-4 mx-4 rounded-lg hover:bg-white/20 transition-all duration-200 text-4xl font-bold" 
          aria-label="Next"
        >
          ›
        </button>
      </div>

      {/* Hints */}
      <div className="px-4 py-2 text-xs text-white/60">
        Arrow keys to navigate • Space to play/pause • F for fullscreen • I for info • Esc to close • Swipe left/right on mobile
      </div>
    </div>
  )
}
