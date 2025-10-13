'use client'

import { useState, useRef, useCallback } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { Camera, Upload, X, CheckCircle, AlertCircle } from 'lucide-react'

interface MobilePhotoUploadProps {
  onUpload: (files: File[]) => Promise<void>
  maxFiles?: number
  acceptedTypes?: string[]
  className?: string
}

export default function MobilePhotoUpload({
  onUpload,
  maxFiles = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = ''
}: MobilePhotoUploadProps) {
  const { t } = useI18n()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => 
      acceptedTypes.includes(file.type) && file.size <= 50 * 1024 * 1024 // 50MB limit
    )

    if (validFiles.length !== fileArray.length) {
      alert(t('mobile.upload.invalidFiles', 'Some files were skipped due to invalid format or size'))
    }

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, maxFiles))
  }, [acceptedTypes, maxFiles, t])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus('idle')

    try {
      // Simulate progress for mobile UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      await onUpload(selectedFiles)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadStatus('success')
      
      // Reset after success
      setTimeout(() => {
        setSelectedFiles([])
        setUploadProgress(0)
        setUploadStatus('idle')
      }, 2000)
      
    } catch (error) {
      setUploadStatus('error')
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`mobile-photo-upload ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${selectedFiles.length > 0 ? 'border-green-500 bg-green-50' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Upload className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">
                {t('mobile.upload.selectFiles', 'Select Files')}
              </span>
            </button>

            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Camera className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">
                {t('mobile.upload.takePhoto', 'Take Photo')}
              </span>
            </button>
          </div>

          <p className="text-sm text-gray-600">
            {t('mobile.upload.dragDrop', 'Drag and drop files here, or click to select')}
          </p>
          <p className="text-xs text-gray-500">
            {t('mobile.upload.maxFiles', `Max ${maxFiles} files, 50MB each`)}
          </p>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-700">
            {t('mobile.upload.selectedFiles', 'Selected Files')} ({selectedFiles.length})
          </h3>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-gray-200 rounded flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{t('mobile.upload.uploading', 'Uploading...')}</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Status */}
      {uploadStatus === 'success' && (
        <div className="mt-4 flex items-center space-x-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">
            {t('mobile.upload.success', 'Upload completed successfully!')}
          </span>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="mt-4 flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">
            {t('mobile.upload.error', 'Upload failed. Please try again.')}
          </span>
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && !isUploading && uploadStatus === 'idle' && (
        <button
          onClick={handleUpload}
          className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {t('mobile.upload.uploadFiles', `Upload ${selectedFiles.length} Files`)}
        </button>
      )}
    </div>
  )
}
