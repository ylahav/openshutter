'use client'

interface PhotoStatusTogglesProps {
  isPublished: boolean
  isLeading: boolean
  isGalleryLeading: boolean
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function PhotoStatusToggles({ 
  isPublished, 
  isLeading, 
  isGalleryLeading, 
  onInputChange 
}: PhotoStatusTogglesProps) {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPublished"
          name="isPublished"
          checked={isPublished}
          onChange={onInputChange}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-700">
          Published (visible to public)
        </label>
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isLeading"
          name="isLeading"
          checked={isLeading}
          onChange={onInputChange}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label htmlFor="isLeading" className="ml-2 block text-sm text-gray-700">
          Leading Photo (album cover)
        </label>
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isGalleryLeading"
          name="isGalleryLeading"
          checked={isGalleryLeading}
          onChange={onInputChange}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label htmlFor="isGalleryLeading" className="ml-2 block text-sm text-gray-700">
          Gallery Leading Photo (hero showcase)
        </label>
      </div>
    </div>
  )
}
