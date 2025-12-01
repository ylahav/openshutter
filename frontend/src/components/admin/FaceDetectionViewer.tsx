'use client'

import { useState, useEffect, useRef } from 'react'
import { FaceRecognitionService, FaceDetection } from '@/services/face-recognition'

interface FaceDetectionViewerProps {
  imageUrl: string
  photoId: string
  detectedFaces?: Array<{
    box: { x: number; y: number; width: number; height: number }
    landmarks?: {
      leftEye: { x: number; y: number }
      rightEye: { x: number; y: number }
      nose: { x: number; y: number }
      mouth: { x: number; y: number }
    }
    matchedPersonId?: string
    confidence?: number
  }>
  onFaceDetected?: (faces: FaceDetection[]) => void
  onFaceClick?: (faceIndex: number) => void
  onError?: (error: string) => void
  onSuccess?: (message: string) => void
}

export default function FaceDetectionViewer({
  imageUrl,
  photoId,
  detectedFaces = [],
  onFaceDetected,
  onFaceClick,
  onError,
  onSuccess
}: FaceDetectionViewerProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [faces, setFaces] = useState<FaceDetection[]>([])
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [isManualMode, setIsManualMode] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null) // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
  const [faceDescriptors, setFaceDescriptors] = useState<Map<number, number[]>>(new Map()) // Store descriptors for each face
  const [manualFaces, setManualFaces] = useState<Set<number>>(new Set()) // Track which faces were manually detected
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null) // Separate canvas for drawing selection rectangle

  // Load models on mount
  useEffect(() => {
    let mounted = true

    const loadModels = async () => {
      try {
        await FaceRecognitionService.loadModels()
        if (mounted) {
          setModelsLoaded(true)
        }
      } catch (error) {
        console.error('Failed to load face recognition models:', error)
      }
    }

    loadModels()

    return () => {
      mounted = false
    }
  }, [])

  // Use detected faces from props if available
  useEffect(() => {
    if (detectedFaces.length > 0) {
      const newFaces = detectedFaces.map(face => ({
        descriptor: [] as number[], // Empty array for display (descriptors not passed from props)
        box: face.box,
        landmarks: face.landmarks
      }))
      setFaces(newFaces)
      // Clear manual faces set when loading from props (these are auto-detected)
      setManualFaces(new Set())
      // Clear selection if selected face no longer exists
      if (selectedFaceIndex !== null && selectedFaceIndex >= newFaces.length) {
        setSelectedFaceIndex(null)
      }
    }
  }, [detectedFaces])

  // Draw faces on canvas
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = imageRef.current

    // Set canvas size to match image
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    // Draw image
    ctx.drawImage(img, 0, 0)

    // Draw face boxes
    faces.forEach((face, index) => {
      const { box } = face
      const isSelected = selectedFaceIndex === index
      const isManual = manualFaces.has(index)

      // Draw bounding box with different colors for auto vs manual detection
      // Auto-detected: green (#00ff00), Manual: orange (#ff8800)
      // Selected: yellow (#ffff00)
      let strokeColor = '#00ff00' // Default: auto-detected (green)
      if (isSelected) {
        strokeColor = '#ffff00' // Selected: yellow
      } else if (isManual) {
        strokeColor = '#ff8800' // Manual: orange
      }

      ctx.strokeStyle = strokeColor
      ctx.lineWidth = isSelected ? 3 : 2
      ctx.strokeRect(box.x, box.y, box.width, box.height)

      // Draw resize handles if selected
      if (isSelected && isManualMode) {
        const handleSize = 8
        const handles = [
          { x: box.x, y: box.y }, // NW
          { x: box.x + box.width, y: box.y }, // NE
          { x: box.x, y: box.y + box.height }, // SW
          { x: box.x + box.width, y: box.y + box.height }, // SE
          { x: box.x + box.width / 2, y: box.y }, // N
          { x: box.x + box.width / 2, y: box.y + box.height }, // S
          { x: box.x, y: box.y + box.height / 2 }, // W
          { x: box.x + box.width, y: box.y + box.height / 2 } // E
        ]

        ctx.fillStyle = '#ffff00'
        handles.forEach(handle => {
          ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 1
          ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
        })
      }

      // Draw landmarks if available
      if (face.landmarks) {
        ctx.fillStyle = '#ff0000'
        const landmarks = [
          face.landmarks.leftEye,
          face.landmarks.rightEye,
          face.landmarks.nose,
          face.landmarks.mouth
        ]

        landmarks.forEach(landmark => {
          ctx.beginPath()
          ctx.arc(landmark.x, landmark.y, 3, 0, 2 * Math.PI)
          ctx.fill()
        })
      }

      // Draw face index with label
      ctx.fillStyle = strokeColor
      ctx.font = '16px Arial'
      const label = `Face ${index + 1}${isManual ? ' (Manual)' : ''}`
      ctx.fillText(label, box.x, box.y - 5)
    })

    // Update cursor based on mode
    if (isManualMode && selectedFaceIndex !== null) {
      canvas.style.cursor = 'default'
    } else {
      canvas.style.cursor = isManualMode ? 'crosshair' : faces.length > 0 ? 'pointer' : 'default'
    }
  }, [faces, imageRef.current?.complete, isManualMode, selectedFaceIndex])

  // Draw selection rectangle on overlay canvas
  useEffect(() => {
    if (!overlayCanvasRef.current || !imageRef.current) return

    const overlay = overlayCanvasRef.current
    const ctx = overlay.getContext('2d')
    if (!ctx) return

    const img = imageRef.current
    const rect = overlay.getBoundingClientRect()
    
    // Set overlay canvas size to match displayed image size
    overlay.width = rect.width
    overlay.height = rect.height

    // Clear overlay
    ctx.clearRect(0, 0, overlay.width, overlay.height)

    // Draw selection rectangle if drawing
    if (currentRect && isDrawing) {
      const scaleX = rect.width / img.naturalWidth
      const scaleY = rect.height / img.naturalHeight

      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(
        currentRect.x * scaleX,
        currentRect.y * scaleY,
        currentRect.width * scaleX,
        currentRect.height * scaleY
      )
      ctx.setLineDash([])
    }
  }, [currentRect, isDrawing, imageRef.current?.complete])

  const handleDetectFaces = async () => {
    if (!imageRef.current || !modelsLoaded) {
      onError?.('Image not loaded or models not ready')
      return
    }

    setIsDetecting(true)
    try {
      // Do face detection CLIENT-SIDE (avoids server-side monkeyPatch issues)
      console.log('Starting face detection on image:', {
        width: imageRef.current.width,
        height: imageRef.current.height,
        naturalWidth: imageRef.current.naturalWidth,
        naturalHeight: imageRef.current.naturalHeight
      })
      
      let detections = await FaceRecognitionService.detectFaces(imageRef.current)
      console.log(`Detected ${detections.length} face(s) with default settings`)
      
      // If no faces detected, try with even lower threshold
      if (detections.length === 0) {
        console.log('No faces detected with default settings, trying with lower threshold...')
        // Try with very low threshold (0.1) for difficult images
        const lowThresholdDetections = await FaceRecognitionService.detectFaces(imageRef.current, { scoreThreshold: 0.1 })
        console.log(`Detected ${lowThresholdDetections.length} face(s) with low threshold`)
        if (lowThresholdDetections.length > 0) {
          detections = lowThresholdDetections
        }
      }
      
      if (detections.length === 0) {
        onSuccess?.('No faces detected in this image. Try adjusting the image or ensure faces are clearly visible.')
        setIsDetecting(false)
        return
      }

      // Prepare face data with descriptors for server storage
      // detections from FaceRecognitionService.detectFaces() already have the correct structure
      const facesData = detections.map(detection => ({
        descriptor: detection.descriptor, // Already an array from FaceRecognitionService
        box: detection.box, // Already in correct format
        landmarks: detection.landmarks // Already in correct format
      }))

      // Update local state for immediate visual feedback
      setFaces(facesData.map(face => ({
        descriptor: face.descriptor, // Include descriptor to satisfy FaceDetection interface
        box: face.box,
        landmarks: face.landmarks
      })))

      // Send detection results to server for storage
      const response = await fetch('/api/admin/face-recognition/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId,
          faces: facesData // Send client-side detection results
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const facesCount = result.data.facesDetected || facesData.length
          onSuccess?.(`Successfully detected ${facesCount} face${facesCount !== 1 ? 's' : ''}`)
          onFaceDetected?.(facesData)
          // Refresh to show detected faces from database
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        } else {
          const errorMsg = result.error || 'Failed to save face detection results'
          console.error('Failed to save face detection:', errorMsg)
          onError?.(errorMsg)
        }
      } else {
        let errorMsg = 'Failed to save face detection results'
        try {
          const errorData = await response.json()
          errorMsg = errorData.error || errorMsg
        } catch {
          errorMsg = `Server error: ${response.status} ${response.statusText}`
        }
        console.error('Failed to save face detection:', errorMsg)
        onError?.(errorMsg)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Face detection failed. Please check console for details.'
      console.error('Face detection failed:', error)
      onError?.(errorMsg)
    } finally {
      setIsDetecting(false)
    }
  }

  const getResizeHandle = (x: number, y: number, box: { x: number; y: number; width: number; height: number }): string | null => {
    const handleSize = 8
    const tolerance = handleSize + 5

    // Check corners
    if (Math.abs(x - box.x) < tolerance && Math.abs(y - box.y) < tolerance) return 'nw'
    if (Math.abs(x - (box.x + box.width)) < tolerance && Math.abs(y - box.y) < tolerance) return 'ne'
    if (Math.abs(x - box.x) < tolerance && Math.abs(y - (box.y + box.height)) < tolerance) return 'sw'
    if (Math.abs(x - (box.x + box.width)) < tolerance && Math.abs(y - (box.y + box.height)) < tolerance) return 'se'
    
    // Check edges
    if (Math.abs(x - (box.x + box.width / 2)) < tolerance && Math.abs(y - box.y) < tolerance) return 'n'
    if (Math.abs(x - (box.x + box.width / 2)) < tolerance && Math.abs(y - (box.y + box.height)) < tolerance) return 's'
    if (Math.abs(x - box.x) < tolerance && Math.abs(y - (box.y + box.height / 2)) < tolerance) return 'w'
    if (Math.abs(x - (box.x + box.width)) < tolerance && Math.abs(y - (box.y + box.height / 2)) < tolerance) return 'e'

    return null
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    if (!isManualMode) {
      // If not in manual mode, handle click for face selection
      if (faces.length > 0) {
        handleCanvasClick(e)
      }
      return
    }

    // Check if clicking on a resize handle
    if (selectedFaceIndex !== null) {
      const selectedFace = faces[selectedFaceIndex]
      const handle = getResizeHandle(x, y, selectedFace.box)
      if (handle) {
        setIsResizing(true)
        setResizeHandle(handle)
        setDrawStart({ x, y })
        return
      }
    }

    // Check if clicking on an existing face
    const clickedFaceIndex = faces.findIndex(face => {
      const { box } = face
      return (
        x >= box.x &&
        x <= box.x + box.width &&
        y >= box.y &&
        y <= box.y + box.height
      )
    })

    if (clickedFaceIndex >= 0) {
      setSelectedFaceIndex(clickedFaceIndex)
      return
    }

    // Start drawing new rectangle
    setIsDrawing(true)
    setDrawStart({ x, y })
    setCurrentRect({ x, y, width: 0, height: 0 })
    setSelectedFaceIndex(null)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Handle resizing
    if (isResizing && resizeHandle && selectedFaceIndex !== null && drawStart) {
      const face = faces[selectedFaceIndex]
      const deltaX = x - drawStart.x
      const deltaY = y - drawStart.y
      let newBox = { ...face.box }

      switch (resizeHandle) {
        case 'nw':
          newBox.x = Math.max(0, face.box.x + deltaX)
          newBox.y = Math.max(0, face.box.y + deltaY)
          newBox.width = Math.max(50, face.box.width - deltaX)
          newBox.height = Math.max(50, face.box.height - deltaY)
          break
        case 'ne':
          newBox.y = Math.max(0, face.box.y + deltaY)
          newBox.width = Math.max(50, face.box.width + deltaX)
          newBox.height = Math.max(50, face.box.height - deltaY)
          break
        case 'sw':
          newBox.x = Math.max(0, face.box.x + deltaX)
          newBox.width = Math.max(50, face.box.width - deltaX)
          newBox.height = Math.max(50, face.box.height + deltaY)
          break
        case 'se':
          newBox.width = Math.max(50, face.box.width + deltaX)
          newBox.height = Math.max(50, face.box.height + deltaY)
          break
        case 'n':
          newBox.y = Math.max(0, face.box.y + deltaY)
          newBox.height = Math.max(50, face.box.height - deltaY)
          break
        case 's':
          newBox.height = Math.max(50, face.box.height + deltaY)
          break
        case 'w':
          newBox.x = Math.max(0, face.box.x + deltaX)
          newBox.width = Math.max(50, face.box.width - deltaX)
          break
        case 'e':
          newBox.width = Math.max(50, face.box.width + deltaX)
          break
      }

      // Ensure box stays within image bounds
      const img = imageRef.current
      if (newBox.x + newBox.width > img.naturalWidth) {
        newBox.width = img.naturalWidth - newBox.x
      }
      if (newBox.y + newBox.height > img.naturalHeight) {
        newBox.height = img.naturalHeight - newBox.y
      }

      // Update face box
      const updatedFaces = [...faces]
      updatedFaces[selectedFaceIndex] = {
        ...updatedFaces[selectedFaceIndex],
        box: newBox
      }
      setFaces(updatedFaces)
      setDrawStart({ x, y })
      return
    }

    // Handle drawing new rectangle
    if (isManualMode && isDrawing && drawStart) {
      const width = x - drawStart.x
      const height = y - drawStart.y

      setCurrentRect({
        x: Math.min(drawStart.x, x),
        y: Math.min(drawStart.y, y),
        width: Math.abs(width),
        height: Math.abs(height)
      })
    }
  }

  const saveFacesToServer = async (facesToSave: FaceDetection[]) => {
    setIsDetecting(true)
    try {
      // Prepare face data with descriptors for server storage
      const facesData = facesToSave.map((face, index) => {
        // Try to preserve descriptor if we have it
        const descriptor = faceDescriptors.get(index) || face.descriptor || []
        return {
          descriptor,
          box: face.box,
          landmarks: face.landmarks
        }
      })

      const response = await fetch('/api/admin/face-recognition/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId,
          faces: facesData
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          onSuccess?.(`Successfully updated faces`)
          onFaceDetected?.(facesData)
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        } else {
          onError?.(result.error || 'Failed to save face changes')
        }
      } else {
        onError?.('Failed to save face changes')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save face changes'
      console.error('Save faces failed:', error)
      onError?.(errorMsg)
    } finally {
      setIsDetecting(false)
    }
  }

  const handleCanvasMouseUp = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle resize end
    if (isResizing && selectedFaceIndex !== null) {
      setIsResizing(false)
      setResizeHandle(null)
      setDrawStart(null)
      // Save resized face
      await saveFacesToServer(faces)
      return
    }

    // Handle drawing new rectangle
    if (!isManualMode || !isDrawing || !drawStart || !currentRect || !imageRef.current || !modelsLoaded) {
      setIsDrawing(false)
      setDrawStart(null)
      setCurrentRect(null)
      return
    }

    // Only process if rectangle is large enough (at least 50x50 pixels)
    if (currentRect.width < 50 || currentRect.height < 50) {
      setIsDrawing(false)
      setDrawStart(null)
      setCurrentRect(null)
      return
    }

    setIsDetecting(true)
    try {
      // Extract face descriptor from the selected region
      const detection = await FaceRecognitionService.detectFaceInRegion(imageRef.current, currentRect)

      if (!detection) {
        onError?.('No face detected in the selected region. Please try selecting a different area.')
        setIsDrawing(false)
        setDrawStart(null)
        setCurrentRect(null)
        setIsDetecting(false)
        return
      }

      // Add the manually detected face to the existing faces
      const newFaceIndex = faces.length
      const newFaces = [...faces, detection]
      setFaces(newFaces.map(face => ({
        descriptor: face.descriptor, // Include descriptor to satisfy FaceDetection interface
        box: face.box,
        landmarks: face.landmarks
      })))

      // Mark this face as manually detected
      setManualFaces(prev => new Set([...prev, newFaceIndex]))

      // Store descriptor for this face (convert Float32Array to number[] if needed)
      const updatedDescriptors = new Map(faceDescriptors)
      const descriptorArray = Array.isArray(detection.descriptor) 
        ? detection.descriptor 
        : Array.from(detection.descriptor)
      updatedDescriptors.set(newFaceIndex, descriptorArray)
      setFaceDescriptors(updatedDescriptors)

      // Get all faces with descriptors for server
      const allFacesData = newFaces.map((face, idx) => ({
        descriptor: updatedDescriptors.get(idx) || face.descriptor || [],
        box: face.box,
        landmarks: face.landmarks
      }))

      // Send updated faces to server
      setIsDetecting(true)
      try {
        const response = await fetch('/api/admin/face-recognition/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoId,
            faces: allFacesData
          })
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            onSuccess?.(`Successfully added manually selected face. Total: ${newFaces.length} face${newFaces.length !== 1 ? 's' : ''}`)
            onFaceDetected?.(allFacesData)
            setTimeout(() => {
              window.location.reload()
            }, 1000)
          } else {
            onError?.(result.error || 'Failed to save manually selected face')
          }
        } else {
          onError?.('Failed to save manually selected face')
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to save manually selected face'
        console.error('Save faces failed:', error)
        onError?.(errorMsg)
      } finally {
        setIsDetecting(false)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to process manually selected face'
      console.error('Manual face selection failed:', error)
      onError?.(errorMsg)
    } finally {
      setIsDetecting(false)
      setIsDrawing(false)
      setDrawStart(null)
      setCurrentRect(null)
    }
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || faces.length === 0 || isManualMode) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)

    // Find clicked face
    const clickedFaceIndex = faces.findIndex(face => {
      const { box } = face
      return (
        x >= box.x &&
        x <= box.x + box.width &&
        y >= box.y &&
        y <= box.y + box.height
      )
    })

    if (clickedFaceIndex >= 0) {
      onFaceClick?.(clickedFaceIndex)
    }
  }

  const handleDeleteFace = async () => {
    if (selectedFaceIndex === null) return

    const updatedFaces = faces.filter((_, index) => index !== selectedFaceIndex)
    setFaces(updatedFaces)
    
    // Update descriptors map
    const newDescriptors = new Map<number, number[]>()
    updatedFaces.forEach((_, index) => {
      const oldIndex = index < selectedFaceIndex ? index : index + 1
      const descriptor = faceDescriptors.get(oldIndex)
      if (descriptor) {
        newDescriptors.set(index, descriptor)
      }
    })
    setFaceDescriptors(newDescriptors)
    
    // Update manual faces set
    const newManualFaces = new Set<number>()
    updatedFaces.forEach((_, index) => {
      const oldIndex = index < selectedFaceIndex ? index : index + 1
      if (manualFaces.has(oldIndex)) {
        newManualFaces.add(index)
      }
    })
    setManualFaces(newManualFaces)
    
    setSelectedFaceIndex(null)
    await saveFacesToServer(updatedFaces)
  }

  return (
    <div className="relative">
      <div className="relative inline-block">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Photo"
          className="max-w-full h-auto"
          onLoad={() => {
            // Size overlay canvas when image loads
            if (overlayCanvasRef.current && imageRef.current) {
              const overlay = overlayCanvasRef.current
              const rect = overlay.getBoundingClientRect()
              overlay.width = rect.width
              overlay.height = rect.height
            }
            // Auto-detect if no faces are set
            if (faces.length === 0 && modelsLoaded && detectedFaces.length === 0) {
              // Optionally auto-detect on load
            }
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-auto"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={() => {
            if (isDrawing) {
              setIsDrawing(false)
              setDrawStart(null)
              setCurrentRect(null)
            }
            if (isResizing) {
              setIsResizing(false)
              setResizeHandle(null)
              setDrawStart(null)
              if (selectedFaceIndex !== null) {
                saveFacesToServer(faces)
              }
            }
          }}
        />
        {/* Overlay canvas for drawing selection rectangle */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 10 }}
        />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDetectFaces}
            disabled={isDetecting || isManualMode}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDetecting ? 'Detecting...' : 'Detect Faces'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsManualMode(!isManualMode)
              setCurrentRect(null)
              setDrawStart(null)
              setIsDrawing(false)
            }}
            disabled={isDetecting || !modelsLoaded}
            className={`px-4 py-2 rounded ${
              isManualMode
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isManualMode ? 'Exit Manual Selection' : 'Manual Selection'}
          </button>

          {faces.length > 0 && (
            <span className="px-4 py-2 bg-gray-100 rounded self-center">
              {faces.length} face{faces.length !== 1 ? 's' : ''} detected
            </span>
          )}
        </div>

        {isManualMode && (
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Click and drag on the image to draw a rectangle around a face</p>
            <p>• Click on a face to select it (yellow highlight)</p>
            {selectedFaceIndex !== null && (
              <>
                <p>• Drag the yellow handles to resize the selected face</p>
                <p>• Click "Delete Selected Face" to remove it</p>
              </>
            )}
            <div className="mt-2 pt-2 border-t border-gray-300">
              <p className="font-medium mb-1">Legend:</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 border-2 border-green-500"></div>
                  <span>Auto-detected</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 border-2 border-orange-500"></div>
                  <span>Manual</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 border-2 border-yellow-500"></div>
                  <span>Selected</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
