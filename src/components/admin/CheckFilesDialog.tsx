'use client'

import { useState } from 'react'

interface MissingFile {
  filename: string
  normalized: string
}

interface CheckFilesDialogProps {
  isOpen: boolean
  onClose: () => void
  missingFiles: MissingFile[]
  fileMap: Map<string, File>
  albumId: string
  onUploadComplete?: () => void
}

export default function CheckFilesDialog({
  isOpen,
  onClose,
  missingFiles,
  fileMap,
  albumId,
  onUploadComplete
}: CheckFilesDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)

  if (!isOpen) return null

  const toggleFile = (normalized: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(normalized)) {
        next.delete(normalized)
      } else {
        next.add(normalized)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedFiles(new Set(missingFiles.map(f => f.normalized)))
  }

  const deselectAll = () => {
    setSelectedFiles(new Set())
  }

  const handleUpload = async () => {
    if (selectedFiles.size === 0) return

    try {
      setUploading(true)
      setUploadProgress({ current: 0, total: selectedFiles.size })

      const filesToUpload: File[] = []
      selectedFiles.forEach(normalized => {
        const file = fileMap.get(normalized)
        if (file) {
          filesToUpload.push(file)
        }
      })

      let uploaded = 0
      for (const file of filesToUpload) {
        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('albumId', albumId)

          const response = await fetch('/api/photos/upload', {
            method: 'POST',
            body: formData
          })

          if (response.ok) {
            uploaded++
            setUploadProgress({ current: uploaded, total: filesToUpload.length })
          }
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error)
        }
      }

      if (onUploadComplete) {
        onUploadComplete()
      }

      // Close dialog and show success
      onClose()
      setSelectedFiles(new Set())
      setUploadProgress(null)
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Missing Files ({missingFiles.length})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {missingFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No missing files
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  {selectedFiles.size} of {missingFiles.length} selected
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {missingFiles.map((file, index) => {
                  const isSelected = selectedFiles.has(file.normalized)
                  return (
                    <label
                      key={index}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFile(file.normalized)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-mono text-gray-700 flex-1">
                        {file.filename}
                      </span>
                    </label>
                  )
                })}
              </div>

              {uploadProgress && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Uploading...</span>
                    <span>{uploadProgress.current} / {uploadProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.size === 0 || uploading}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? `Uploading... (${uploadProgress?.current || 0}/${uploadProgress?.total || 0})` : `Upload Selected (${selectedFiles.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}
