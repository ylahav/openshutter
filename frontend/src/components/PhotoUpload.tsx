'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { TemplateAlbum } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { MultiLangUtils } from '@/types/multi-lang'

// Dynamic imports for heavy components
const UploadDropzone = dynamic(() => import('@/components/upload/UploadDropzone'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-lg" />
})

const UploadProgressList = dynamic(() => import('@/components/upload/UploadProgress'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-24 rounded-lg" />
})

const UploadForm = dynamic(() => import('@/components/upload/UploadForm'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

interface UploadProgress {
  filename: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

export default function PhotoUpload() {
  const { currentLanguage } = useLanguage()
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [albums, setAlbums] = useState<TemplateAlbum[]>([])
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')

  // Load albums on component mount
  useEffect(() => {
    const loadAlbums = async () => {
      try {
        const response = await fetch('/api/albums')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setAlbums(result.data)
          }
        }
      } catch (error) {
        console.error('Failed to load albums:', error)
      }
    }

    loadAlbums()
  }, [])

  // Preselect album from query param
  useEffect(() => {
    const albumIdFromQuery = searchParams.get('albumId')
    if (albumIdFromQuery) {
      setSelectedAlbumId(albumIdFromQuery)
    }
  }, [searchParams])

  const handleFilesSelected = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    
    // Initialize upload progress for each file
    const newUploads: UploadProgress[] = acceptedFiles.map(file => ({
      filename: file.name,
      progress: 0,
      status: 'pending'
    }))
    
    setUploads(prev => [...prev, ...newUploads])

    // Upload each file
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i]
      const uploadIndex = uploads.length + i
      
      try {
        // Update status to uploading
        setUploads(prev => prev.map((upload, index) => 
          index === uploadIndex ? { ...upload, status: 'uploading' } : upload
        ))

        // Create form data
        const formData = new FormData()
        formData.append('file', file)
        formData.append('albumId', selectedAlbumId)
        formData.append('title', title || file.name)
        formData.append('description', description)
        formData.append('tags', tags)

        // Upload file
        const response = await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        }

        // Update status to completed
        setUploads(prev => prev.map((upload, index) => 
          index === uploadIndex ? { ...upload, status: 'completed', progress: 100 } : upload
        ))

        // If this is the last file and we have a returnTo URL, redirect after a short delay
        if (i === acceptedFiles.length - 1 && returnTo) {
          setTimeout(() => {
            window.location.href = returnTo
          }, 1500)
        }

      } catch (error) {
        console.error(`Upload failed for ${file.name}:`, error)
        
        // Update status to error
        setUploads(prev => prev.map((upload, index) => 
          index === uploadIndex ? { 
            ...upload, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          } : upload
        ))
      }
    }

    setIsUploading(false)
  }, [uploads.length, selectedAlbumId, title, description, tags])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFilesSelected,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true
  })

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index))
  }

  const clearForm = () => {
    setTitle('')
    setDescription('')
    setTags('')
    setSelectedAlbumId('')
    setUploads([])
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">Upload Photos</h2>
          <p className="text-sm text-gray-600">
            Drag and drop your photos here or click to browse
          </p>
        </div>
        
        <div className="card-body">
          {/* Upload Form */}
          <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg mb-6" />}>
            <UploadForm
              albums={albums}
              selectedAlbumId={selectedAlbumId}
              onAlbumChange={setSelectedAlbumId}
              title={title}
              onTitleChange={setTitle}
              description={description}
              onDescriptionChange={setDescription}
              tags={tags}
              onTagsChange={setTags}
            />
          </Suspense>

          {/* Drop Zone */}
          <Suspense fallback={<div className="animate-pulse bg-gray-200 h-32 rounded-lg mb-6" />}>
            <UploadDropzone
              onFilesSelected={handleFilesSelected}
              isUploading={isUploading}
            />
          </Suspense>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Progress</h3>
                <button
                  onClick={clearForm}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear All
                </button>
              </div>
              
              <div className="space-y-3">
                <AnimatePresence>
                  {uploads.map((upload, index) => (
                    <motion.div
                      key={`${upload.filename}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {upload.filename}
                        </span>
                        <button
                          onClick={() => removeUpload(index)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`
                              h-2 rounded-full transition-all duration-300
                              ${upload.status === 'completed' ? 'bg-green-500' : 
                                upload.status === 'error' ? 'bg-red-500' : 
                                upload.status === 'uploading' ? 'bg-primary-500' : 
                                'bg-gray-300'
                              }
                            `}
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                        
                        <span className="text-sm text-gray-500 min-w-[60px]">
                          {upload.status === 'completed' ? '100%' : 
                           upload.status === 'error' ? 'Error' : 
                           upload.status === 'uploading' ? `${upload.progress}%` : 
                           'Pending'
                          }
                        </span>
                      </div>
                      
                      {upload.status === 'error' && upload.error && (
                        <p className="text-sm text-red-600 mt-2">{upload.error}</p>
                      )}
                      
                      {upload.status === 'completed' && (
                        <p className="text-sm text-green-600 mt-2">Upload successful!</p>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Upload Status */}
          {isUploading && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 text-primary-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span>Uploading photos...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
