// Import & Sync functionality temporarily disabled
// This file contains the original implementation commented out for future re-enabling

// Original implementation (commented out):
/*
'use client'

import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import FolderSelectionDialog from '@/components/FolderSelectionDialog'
import { useI18n } from '@/hooks/useI18n'
import { useState } from 'react'

interface ImportProgress {
  status: 'idle' | 'scanning' | 'importing' | 'completed' | 'error'
  currentStep: string
  progress: number
  totalItems: number
  processedItems: number
  albumsCreated: number
  photosImported: number
  scannedAlbums?: number
  scannedPhotos?: number
  currentItem?: string
  errors: string[]
}

export default function AdminImportSyncPage() {
  const { t } = useI18n()
  const [progress, setProgress] = useState<ImportProgress>({
    status: 'idle',
    currentStep: '',
    progress: 0,
    totalItems: 0,
    processedItems: 0,
    albumsCreated: 0,
    photosImported: 0,
    scannedAlbums: 0,
    scannedPhotos: 0,
    currentItem: '',
    errors: []
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [showFolderDialog, setShowFolderDialog] = useState(false)

  const scanFolders = async () => {
    try {
      const response = await fetch('/api/admin/import-sync/google-drive', {
        method: 'GET',
      })
      
      if (!response.ok) {
        throw new Error('Failed to scan folders')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to scan folders')
      }

      return data.data
    } catch (error) {
      console.error('Scan error:', error)
      setMessage({ type: 'error', text: 'Failed to scan folders: ' + (error instanceof Error ? error.message : 'Unknown error') })
      throw error
    }
  }

  const startGoogleDriveImport = () => {
    setMessage(null)
    setShowFolderDialog(true)
  }

  const handleFolderSelection = async (selectedFolders: any[]) => {
    setShowFolderDialog(false)
    setProgress({
      status: 'importing',
      currentStep: `Processing ${selectedFolders.length} selected folders...`,
      progress: 0,
      totalItems: selectedFolders.length,
      processedItems: 0,
      albumsCreated: 0,
      photosImported: 0,
      scannedAlbums: 0,
      scannedPhotos: 0,
      currentItem: '',
      errors: []
    })

    try {
      const response = await fetch('/api/admin/import-sync/google-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedFolders
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to start import process')
      }

      // Handle streaming response for progress updates
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              setProgress(prev => {
                const newState = {
                  ...prev,
                  ...data,
                  errors: [...prev.errors, ...(data.newErrors || [])]
                }
                return newState
              })
            } catch (e) {
              console.error('Failed to parse progress data:', e)
            }
          }
        }
      }

      setMessage({ type: 'success', text: t('admin.importCompleted') })
    } catch (error) {
      console.error('Import error:', error)
      setProgress(prev => ({ ...prev, status: 'error' }))
      setMessage({ type: 'error', text: t('admin.importFailed') })
    }
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'scanning': return 'text-blue-600'
      case 'importing': return 'text-yellow-600'
      case 'completed': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'scanning':
      case 'importing':
        return (
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      case 'completed':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        )
    }
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('admin.importSync')}</h1>
              <p className="text-gray-600 mt-2">{t('admin.importSyncDescription')}</p>
            </div>
            <div className="flex gap-3 items-center">
              <Link href="/admin" className="btn-secondary">{t('admin.backToAdmin')}</Link>
            </div>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : message.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{t('admin.googleDriveImport')}</h2>
                  <p className="text-gray-600 text-sm">{t('admin.googleDriveImportDescription')}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={startGoogleDriveImport}
                  disabled={progress.status === 'importing'}
                  className="w-full btn-primary flex items-center justify-center"
                >
                  {progress.status === 'importing' ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  )}
                  {progress.status === 'importing' 
                    ? t('admin.importing') 
                    : 'Select Folders to Import'
                  }
                </button>

                {progress.status !== 'idle' && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${getStatusColor()}`}>
                        {getStatusIcon()}
                        <span className="ml-2">{progress.currentStep}</span>
                      </span>
                      <span className="text-sm text-gray-600">
                        {progress.processedItems}/{progress.totalItems}
                      </span>
                    </div>

                    {progress.currentItem && progress.currentItem.trim() !== '' && (
                      <div className="mb-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                        <div className="text-sm text-blue-800">
                          <span className="font-medium">{t('admin.currentlyProcessing')}:</span>
                          <span className="ml-2 font-mono text-xs">{progress.currentItem}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="mb-2 text-xs text-gray-500">
                      Debug: currentItem="{progress.currentItem}", scannedAlbums={progress.scannedAlbums}, scannedPhotos={progress.scannedPhotos}
                    </div>
                    
                    {progress.totalItems > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(progress.processedItems / progress.totalItems) * 100}%` }}
                        ></div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">{t('admin.scannedAlbums')}:</span>
                        <span className="ml-2 font-medium text-gray-800">{progress.scannedAlbums || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('admin.scannedPhotos')}:</span>
                        <span className="ml-2 font-medium text-gray-800">{progress.scannedPhotos || 0}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                      <div>
                        <span className="text-gray-600">{t('admin.albumsCreated')}:</span>
                        <span className="ml-2 font-medium text-green-600">{progress.albumsCreated}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">{t('admin.photosImported')}:</span>
                        <span className="ml-2 font-medium text-blue-600">{progress.photosImported}</span>
                      </div>
                    </div>

                    {progress.errors.length > 0 && (
                      <div className="mt-3">
                        <details className="text-sm">
                          <summary className="text-red-600 cursor-pointer">
                            {t('admin.errors')} ({progress.errors.length})
                          </summary>
                          <div className="mt-2 max-h-32 overflow-y-auto">
                            {progress.errors.map((error, index) => (
                              <div key={index} className="text-red-600 text-xs mb-1">
                                {error}
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{t('admin.importInfo')}</h2>
                  <p className="text-gray-600 text-sm">{t('admin.importInfoDescription')}</p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{t('admin.importInfo1')}</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{t('admin.importInfo2')}</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{t('admin.importInfo3')}</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{t('admin.importInfo4')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">{t('admin.importWarning')}</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>{t('admin.importWarningText')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <FolderSelectionDialog
          isOpen={showFolderDialog}
          onClose={() => setShowFolderDialog(false)}
          onConfirm={handleFolderSelection}
          onScan={scanFolders}
        />
      </div>
    </AdminGuard>
  )
}
*/

// Temporary placeholder component
export default function AdminImportSyncPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Import & Sync Temporarily Disabled</h1>
          <p className="text-gray-600 mb-6">
            The Import & Sync functionality is temporarily disabled for deployment. 
            It will be re-enabled in a future update.
          </p>
          <a 
            href="/admin" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Admin Panel
          </a>
        </div>
      </div>
    </div>
  )
}
