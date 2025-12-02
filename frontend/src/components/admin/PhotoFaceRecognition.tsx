'use client'

import { useState, useEffect } from 'react'
import FaceDetectionViewer from './FaceDetectionViewer'
import FaceMatchingPanel from './FaceMatchingPanel'
import NotificationDialog from '@/components/NotificationDialog'

interface PhotoFaceRecognitionProps {
  photoId: string
  imageUrl: string
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
  onFacesUpdated?: () => void
}

export default function PhotoFaceRecognition({
  photoId,
  imageUrl,
  detectedFaces = [],
  onFacesUpdated
}: PhotoFaceRecognitionProps) {
  const [faces, setFaces] = useState(detectedFaces)
  const [isExpanded, setIsExpanded] = useState(false)
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

  useEffect(() => {
    setFaces(detectedFaces)
  }, [detectedFaces])

  const handleFaceDetected = async (detectedFaces: any[]) => {
    setFaces(detectedFaces.map(face => ({
      box: face.box,
      landmarks: face.landmarks,
      matchedPersonId: face.matchedPersonId,
      confidence: face.confidence
    })))
    onFacesUpdated?.()
  }

  const handleMatchComplete = async () => {
    // Fetch updated photo data to get matched faces
    try {
      const response = await fetch(`/api/photos/${photoId}`)
      if (response.ok) {
        const photo = await response.json()
        if (photo?.faceRecognition?.faces) {
          const updatedFaces = photo.faceRecognition.faces.map((face: any) => ({
            box: face.box,
            landmarks: face.landmarks,
            matchedPersonId: face.matchedPersonId?.toString(),
            confidence: face.confidence
          }))
          setFaces(updatedFaces)
          showNotification('success', 'Faces Matched', `Successfully matched ${updatedFaces.filter((f: any) => f.matchedPersonId).length} face(s)`)
        }
      }
    } catch (error) {
      console.error('Failed to refresh photo data:', error)
      showNotification('error', 'Refresh Error', 'Failed to refresh face data. Please reload the page.')
    }
    onFacesUpdated?.()
  }

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message
    })
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Face Recognition</h3>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Face Detection</h4>
            <FaceDetectionViewer
              imageUrl={imageUrl}
              photoId={photoId}
              detectedFaces={faces}
              onFaceDetected={handleFaceDetected}
              onError={(error: string) => showNotification('error', 'Face Detection Error', error)}
              onSuccess={(message: string) => showNotification('success', 'Success', message)}
            />
          </div>

          {faces.length > 0 && (
            <div className="border-t pt-4">
              <FaceMatchingPanel
                photoId={photoId}
                faces={faces}
                onMatchComplete={handleMatchComplete}
                onFaceClick={(faceIndex) => {
                  // Scroll to face detection viewer and highlight the face
                  // This could be enhanced to visually highlight the face on the canvas
                  console.log('Face clicked:', faceIndex)
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Notification Dialog */}
      <NotificationDialog
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        autoClose={notification.type === 'success' || notification.type === 'info'}
        autoCloseDelay={5000}
      />
    </div>
  )
}
