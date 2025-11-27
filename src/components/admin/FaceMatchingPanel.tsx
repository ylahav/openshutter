'use client'

import { useState, useEffect } from 'react'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'

interface FaceMatchingPanelProps {
  photoId: string
  faces: Array<{
    box: { x: number; y: number; width: number; height: number }
    matchedPersonId?: string
    confidence?: number
  }>
  onMatchComplete?: () => void
  onFaceClick?: (faceIndex: number) => void
}

interface Person {
  _id: string
  fullName: { [key: string]: string }
  firstName?: { [key: string]: string }
  profileImage?: {
    url: string
  }
}

export default function FaceMatchingPanel({
  photoId,
  faces,
  onMatchComplete,
  onFaceClick
}: FaceMatchingPanelProps) {
  const { currentLanguage } = useLanguage()
  const [isMatching, setIsMatching] = useState(false)
  const [assigningFaceIndex, setAssigningFaceIndex] = useState<number | null>(null)
  const [people, setPeople] = useState<Person[]>([])

  useEffect(() => {
    fetchPeople()
  }, [])

  const fetchPeople = async () => {
    try {
      // Fetch all people (limit=1000 to get all)
      const response = await fetch('/api/people?limit=1000')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setPeople(result.data || [])
        } else {
          console.error('Failed to fetch people:', result.error)
        }
      } else {
        console.error('Failed to fetch people:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch people:', error)
    }
  }

  const handleMatchFaces = async () => {
    setIsMatching(true)
    try {
      const response = await fetch('/api/admin/face-recognition/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId,
          threshold: 0.6
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Fetch updated photo data to get matched faces
          const photoResponse = await fetch(`/api/photos/${photoId}`)
          if (photoResponse.ok) {
            const photoData = await photoResponse.json()
            if (photoData.success && photoData.data?.faceRecognition?.faces) {
              // Update faces with matched data
              const updatedFaces = photoData.data.faceRecognition.faces.map((face: any) => ({
                box: face.box,
                matchedPersonId: face.matchedPersonId?.toString(),
                confidence: face.confidence
              }))
              // Trigger parent to update faces
              onMatchComplete?.()
              // Return updated faces so parent can update state
              return updatedFaces
            }
          }
          onMatchComplete?.()
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Face matching failed:', errorData.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Face matching failed:', error)
    } finally {
      setIsMatching(false)
    }
  }

  const handleAssignFace = async (faceIndex: number, personId: string) => {
    setAssigningFaceIndex(faceIndex)
    try {
      const response = await fetch('/api/admin/face-recognition/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId,
          faceIndex,
          personId
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          onMatchComplete?.()
        }
      }
    } catch (error) {
      console.error('Face assignment failed:', error)
    } finally {
      setAssigningFaceIndex(null)
    }
  }

  const getPersonName = (person: Person): string => {
    return MultiLangUtils.getTextValue(person.fullName || person.firstName || {}, currentLanguage) || 'Unknown'
  }

  const getPersonNameById = (personId: string | null | undefined): string => {
    if (!personId) return 'Not assigned'
    const person = people.find(p => p._id === personId)
    if (!person) return 'Unknown'
    return getPersonName(person)
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Face Matching</h3>
        <button
          type="button"
          onClick={handleMatchFaces}
          disabled={isMatching || faces.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMatching ? 'Matching...' : 'Auto Match Faces'}
        </button>
      </div>

      {faces.length === 0 && (
        <p className="text-gray-500 text-sm">No faces detected. Please detect faces first.</p>
      )}

      {faces.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700">Detected Faces:</h4>
          {faces.map((face, index) => {
            const matchedPersonId = face.matchedPersonId
            const isAssigning = assigningFaceIndex === index
            
            return (
              <div
                key={index}
                className={`p-3 rounded border ${
                  matchedPersonId ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">Face {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => onFaceClick?.(index)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        (click to highlight)
                      </button>
                    </div>
                    {matchedPersonId ? (
                      <div className="text-sm">
                        <span className="text-green-700 font-medium">
                          {getPersonNameById(matchedPersonId)}
                        </span>
                        {face.confidence !== undefined && face.confidence < 1.0 && (
                          <span className="text-gray-600 ml-2">
                            ({(face.confidence * 100).toFixed(1)}% confidence)
                          </span>
                        )}
                        {face.confidence === 1.0 && (
                          <span className="text-gray-600 ml-2">(manually assigned)</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Not assigned</div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <select
                      value={matchedPersonId || ''}
                      onChange={(e) => {
                        const selectedPersonId = e.target.value
                        if (selectedPersonId) {
                          handleAssignFace(index, selectedPersonId)
                        }
                      }}
                      disabled={isAssigning}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select person...</option>
                      {people.map((person) => (
                        <option key={person._id} value={person._id}>
                          {getPersonName(person)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
