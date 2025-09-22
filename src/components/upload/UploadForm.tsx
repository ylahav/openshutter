'use client'

import { TemplateAlbum } from '@/types'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'

interface UploadFormProps {
  albums: TemplateAlbum[]
  selectedAlbumId: string
  onAlbumChange: (albumId: string) => void
  title: string
  onTitleChange: (title: string) => void
  description: string
  onDescriptionChange: (description: string) => void
  tags: string
  onTagsChange: (tags: string) => void
}

export default function UploadForm({
  albums,
  selectedAlbumId,
  onAlbumChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  tags,
  onTagsChange
}: UploadFormProps) {
  const { currentLanguage } = useLanguage()

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Upload Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="album" className="block text-sm font-medium text-gray-700 mb-2">
            Album
          </label>
          <select
            id="album"
            value={selectedAlbumId}
            onChange={(e) => onAlbumChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an album</option>
            {albums.map((album) => (
              <option key={album._id} value={album._id}>
                {MultiLangUtils.getTextValue(album.name, currentLanguage)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title (Optional)
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter photo title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Enter photo description"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
          Tags (Optional)
        </label>
        <input
          id="tags"
          type="text"
          value={tags}
          onChange={(e) => onTagsChange(e.target.value)}
          placeholder="Enter tags separated by commas"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Separate multiple tags with commas
        </p>
      </div>
    </div>
  )
}
