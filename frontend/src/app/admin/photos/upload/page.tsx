'use client'

import dynamic from 'next/dynamic'

import { useState, useCallback, useEffect } from 'react'
import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import Header from '@/templates/default/components/Header'
import Footer from '@/templates/default/components/Footer'
import { MultiLangUtils } from '@/types/multi-lang'
import { useLanguage } from '@/contexts/LanguageContext'

interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

function PhotoUploadPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentLanguage } = useLanguage()
  const albumId = searchParams.get('albumId')
  
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [albumName, setAlbumName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Fetch album name on component mount
  useEffect(() => {
    if (albumId) {
      fetchAlbumName()
    }
  }, [albumId])

  const fetchAlbumName = async () => {
    try {
      const response = await fetch(`/api/albums/${albumId}`)
      if (response.ok) {
        const album = await response.json()
        // Handle multilingual album name - extract text value using MultiLangUtils
        const name = album.name
        const nameText = typeof name === 'string' 
          ? name 
          : MultiLangUtils.getTextValue(name, currentLanguage) || 'Album'
        setAlbumName(nameText)
      }
    } catch (error) {
      console.error('Failed to fetch album name:', error)
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!albumId) {
      setError('No album selected for upload')
      return
    }

    // Initialize upload progress for each file
    const newUploads: UploadProgress[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }))

    setUploads(prev => [...prev, ...newUploads])
    setIsUploading(true)
    setError(null)

    // Upload each file
    acceptedFiles.forEach((file, index) => {
      uploadFile(file, newUploads.length + uploads.length - acceptedFiles.length + index)
    })
  }, [albumId, uploads.length])

  const uploadFile = async (file: File, uploadIndex: number) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('albumId', albumId!)

    try {
      const xhr = new XMLHttpRequest()
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploads(prev => prev.map((upload, index) => 
            index === uploadIndex ? { ...upload, progress } : upload
          ))
        }
      })

      // Handle upload completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          if (response.success) {
            setUploads(prev => prev.map((upload, index) => 
              index === uploadIndex ? { ...upload, status: 'success', progress: 100 } : upload
            ))
          } else {
            setUploads(prev => prev.map((upload, index) => 
              index === uploadIndex ? { ...upload, status: 'error', error: response.error } : upload
            ))
          }
        } else {
          setUploads(prev => prev.map((upload, index) => 
            index === uploadIndex ? { ...upload, status: 'error', error: 'Upload failed' } : upload
          ))
        }
      })

      // Handle upload error
      xhr.addEventListener('error', () => {
        setUploads(prev => prev.map((upload, index) => 
          index === uploadIndex ? { ...upload, status: 'error', error: 'Network error' } : upload
        ))
      })

      xhr.open('POST', '/api/photos/upload')
      xhr.send(formData)
    } catch (error) {
      console.error('Upload error:', error)
      setUploads(prev => prev.map((upload, index) => 
        index === uploadIndex ? { ...upload, status: 'error', error: 'Upload failed' } : upload
      ))
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: true
  })

  const handleFinish = () => {
    if (albumId) {
      router.push(`/admin/albums/${albumId}`)
    } else {
      router.push('/admin')
    }
  }

  const allUploadsComplete = uploads.length > 0 && uploads.every(upload => upload.status !== 'uploading')
  const hasErrors = uploads.some(upload => upload.status === 'error')

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Upload Photos</h1>
              {albumName && (
                <p className="mt-2 text-gray-600">
                  Uploading to album: <span className="font-medium">{albumName}</span>
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <Link href={albumId ? `/admin/albums/${albumId}` : "/admin"} className="btn-secondary">
                {albumId ? 'Back to Album' : 'Back to Photos'}
              </Link>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Upload Area */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }`}
            >
              <input {...getInputProps()} />
              
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {isDragActive ? 'Drop photos here' : 'Drag & drop photos here'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or click to select files
                  </p>
                </div>
                
                <div className="text-xs text-gray-400">
                  Supports: JPEG, PNG, GIF, BMP, WebP
                </div>
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Progress</h3>
              
              <div className="space-y-4">
                {uploads.map((upload, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {upload.status === 'success' ? (
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : upload.status === 'error' ? (
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {upload.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    
                    <div className="flex-shrink-0 w-24">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            upload.status === 'success'
                              ? 'bg-green-600'
                              : upload.status === 'error'
                              ? 'bg-red-600'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 w-16 text-right">
                      <span className={`text-xs font-medium ${
                        upload.status === 'success'
                          ? 'text-green-600'
                          : upload.status === 'error'
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`}>
                        {upload.status === 'success' ? 'Done' : upload.status === 'error' ? 'Error' : `${upload.progress}%`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {uploads.some(upload => upload.status === 'error') && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">Some uploads failed. Please try again.</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {allUploadsComplete && (
            <div className="mt-8 flex justify-end space-x-3">
              <Link
                href={albumId ? `/admin/albums/${albumId}` : "/admin"}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {albumId ? 'Back to Album' : 'Upload More Photos'}
              </Link>
              <button
                onClick={handleFinish}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {albumId ? 'Go to Album' : 'Go to Photos'}
              </button>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </AdminGuard>
  )
}

export default dynamic(() => Promise.resolve(PhotoUploadPageContent), {
  ssr: false
})
