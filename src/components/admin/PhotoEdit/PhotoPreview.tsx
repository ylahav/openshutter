'use client'

import { TemplatePhoto } from '@/types'

interface PhotoPreviewProps {
  photo: TemplatePhoto
}

export default function PhotoPreview({ photo }: PhotoPreviewProps) {
  return (
    <div className="flex items-start space-x-6">
      <div className="flex-shrink-0">
        <img
          src={photo.storage.thumbnailPath || photo.storage.url}
          alt={typeof photo.title === 'string' ? photo.title : photo.title.en}
          className="w-32 h-32 object-cover rounded-lg"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Name
            </label>
            <p className="text-sm text-gray-600">{photo.originalFilename}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Size
            </label>
            <p className="text-sm text-gray-600">{(photo.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dimensions
            </label>
            <p className="text-sm text-gray-600">
              {photo.dimensions?.width || 0} × {photo.dimensions?.height || 0}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <p className="text-sm text-gray-600">{photo.mimeType}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
