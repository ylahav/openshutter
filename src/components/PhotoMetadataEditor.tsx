'use client'

import { useState, useEffect } from 'react'

interface PhotoMetadataEditorProps {
  tags: string[]
  people: string[]
  location?: {
    name: string
    coordinates?: {
      latitude: number
      longitude: number
    }
    address?: string
  }
  onTagsChange: (tags: string[]) => void
  onPeopleChange: (people: string[]) => void
  onLocationChange: (location?: {
    name: string
    coordinates?: {
      latitude: number
      longitude: number
    }
    address?: string
  }) => void
}

export default function PhotoMetadataEditor({
  tags,
  people,
  location,
  onTagsChange,
  onPeopleChange,
  onLocationChange
}: PhotoMetadataEditorProps) {
  const [newTag, setNewTag] = useState('')
  const [newPerson, setNewPerson] = useState('')
  const [locationName, setLocationName] = useState(location?.name || '')
  const [locationAddress, setLocationAddress] = useState(location?.address || '')
  const [locationLat, setLocationLat] = useState(location?.coordinates?.latitude?.toString() || '')
  const [locationLng, setLocationLng] = useState(location?.coordinates?.longitude?.toString() || '')

  // Update location when form changes
  useEffect(() => {
    if (locationName.trim()) {
      const newLocation = {
        name: locationName.trim(),
        ...(locationAddress.trim() && { address: locationAddress.trim() }),
        ...(locationLat && locationLng && {
          coordinates: {
            latitude: parseFloat(locationLat),
            longitude: parseFloat(locationLng)
          }
        })
      }
      onLocationChange(newLocation)
    } else {
      onLocationChange(undefined)
    }
  }, [locationName, locationAddress, locationLat, locationLng, onLocationChange])

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  const addPerson = () => {
    if (newPerson.trim() && !people.includes(newPerson.trim())) {
      onPeopleChange([...people, newPerson.trim()])
      setNewPerson('')
    }
  }

  const removePerson = (personToRemove: string) => {
    onPeopleChange(people.filter(person => person !== personToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      action()
    }
  }

  return (
    <div className="space-y-6">
      {/* Tags Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, addTag)}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add
          </button>
        </div>
      </div>

      {/* People Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          People
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {people.map((person, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
            >
              👤 {person}
              <button
                type="button"
                onClick={() => removePerson(person)}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPerson}
            onChange={(e) => setNewPerson(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, addPerson)}
            placeholder="Add a person..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={addPerson}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Add
          </button>
        </div>
      </div>

      {/* Location Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Location
        </label>
        <div className="space-y-3">
          <div>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Location name (e.g., Paris, France)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <input
              type="text"
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="Full address (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="number"
                step="any"
                value={locationLat}
                onChange={(e) => setLocationLat(e.target.value)}
                placeholder="Latitude (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="number"
                step="any"
                value={locationLng}
                onChange={(e) => setLocationLng(e.target.value)}
                placeholder="Longitude (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          {locationName && (
            <div className="flex items-center text-sm text-purple-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              📍 {locationName}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
