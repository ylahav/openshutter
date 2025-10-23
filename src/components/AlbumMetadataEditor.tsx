'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import CollectionPopup from '@/components/admin/CollectionPopup'

interface AlbumMetadataEditorProps {
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

export default function AlbumMetadataEditor({
  tags,
  people,
  location,
  onTagsChange,
  onPeopleChange,
  onLocationChange
}: AlbumMetadataEditorProps) {
  const [locationName, setLocationName] = useState(location?.name || '')
  const [locationAddress, setLocationAddress] = useState(location?.address || '')
  const [locationLat, setLocationLat] = useState(location?.coordinates?.latitude?.toString() || '')
  const [locationLng, setLocationLng] = useState(location?.coordinates?.longitude?.toString() || '')
  
  // Popup states
  const [tagsPopupOpen, setTagsPopupOpen] = useState(false)
  const [peoplePopupOpen, setPeoplePopupOpen] = useState(false)
  const [locationsPopupOpen, setLocationsPopupOpen] = useState(false)

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
  }, [locationName, locationAddress, locationLat, locationLng])

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  const removePerson = (personToRemove: string) => {
    onPeopleChange(people.filter(person => person !== personToRemove))
  }

  return (
    <div className="space-y-6">
      {/* Tags Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Tags
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTagsPopupOpen(true)}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Tags
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {tags.length === 0 && (
            <p className="text-sm text-gray-500 italic">No tags selected</p>
          )}
        </div>
      </div>

      {/* People Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            People
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPeoplePopupOpen(true)}
            className="text-green-600 border-green-200 hover:bg-green-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add People
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {people.map((person, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="bg-green-100 text-green-800 hover:bg-green-200"
            >
              👤 {person}
              <button
                type="button"
                onClick={() => removePerson(person)}
                className="ml-2 text-green-600 hover:text-green-800"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {people.length === 0 && (
            <p className="text-sm text-gray-500 italic">No people selected</p>
          )}
        </div>
      </div>

      {/* Location Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLocationsPopupOpen(true)}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Location
          </Button>
        </div>
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

      {/* Collection Popups */}
      <CollectionPopup
        isOpen={tagsPopupOpen}
        onClose={() => setTagsPopupOpen(false)}
        title="Select Tags"
        collectionType="tags"
        selectedItems={tags}
        onSelectionChange={onTagsChange}
        searchPlaceholder="Search tags..."
      />

      <CollectionPopup
        isOpen={peoplePopupOpen}
        onClose={() => setPeoplePopupOpen(false)}
        title="Select People"
        collectionType="people"
        selectedItems={people}
        onSelectionChange={onPeopleChange}
        searchPlaceholder="Search people..."
      />

      <CollectionPopup
        isOpen={locationsPopupOpen}
        onClose={() => setLocationsPopupOpen(false)}
        title="Select Location"
        collectionType="locations"
        selectedItems={location?.name ? [location.name] : []}
        onSelectionChange={(items) => {
          if (items.length > 0) {
            setLocationName(items[0])
          } else {
            setLocationName('')
          }
        }}
        searchPlaceholder="Search locations..."
      />
    </div>
  )
}
