'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void
  isUploading: boolean
}

export default function UploadDropzone({ onFilesSelected, isUploading }: UploadDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesSelected(acceptedFiles)
  }, [onFilesSelected])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp', '.tiff']
    },
    multiple: true,
    disabled: isUploading
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <motion.div 
        className="space-y-4"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium text-gray-900">
            {isDragActive ? 'Drop files here' : 'Drag & drop photos here'}
          </p>
          <p className="text-sm text-gray-500">
            or click to select files
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Supports: JPEG, PNG, GIF, WebP, BMP, TIFF
        </div>
      </motion.div>
    </div>
  )
}
