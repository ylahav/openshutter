'use client'

import Link from 'next/link'
import AdminGuard from '@/components/AdminGuard'
import { useI18n } from '@/hooks/useI18n'
import { useState } from 'react'

export default function AdminBackupRestorePage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleDatabaseBackup = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/backup/database', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: t('admin.databaseBackupSuccess') })
        // Trigger download
        const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `database-backup-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        setMessage({ type: 'error', text: data.error || t('admin.databaseBackupFailed') })
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('admin.databaseBackupFailed') })
    } finally {
      setLoading(false)
    }
  }

  const handleDatabaseRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setMessage(null)
    
    try {
      const fileContent = await file.text()
      const backupData = JSON.parse(fileContent)
      
      const response = await fetch('/api/admin/backup/restore-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup: backupData }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: t('admin.databaseRestoreSuccess') })
      } else {
        setMessage({ type: 'error', text: data.error || t('admin.databaseRestoreFailed') })
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('admin.databaseRestoreFailed') })
    } finally {
      setLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleFilesBackup = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/backup/files', {
        method: 'POST',
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `files-backup-${new Date().toISOString().split('T')[0]}.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setMessage({ type: 'success', text: t('admin.filesBackupSuccess') })
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || t('admin.filesBackupFailed') })
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('admin.filesBackupFailed') })
    } finally {
      setLoading(false)
    }
  }

  const handleFilesRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setMessage(null)
    
    try {
      const formData = new FormData()
      formData.append('backup', file)
      
      const response = await fetch('/api/admin/backup/restore-files', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: t('admin.filesRestoreSuccess') })
      } else {
        setMessage({ type: 'error', text: data.error || t('admin.filesRestoreFailed') })
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('admin.filesRestoreFailed') })
    } finally {
      setLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('admin.backupRestore')}</h1>
              <p className="text-gray-600 mt-2">{t('admin.backupRestoreDescription')}</p>
            </div>
            <div className="flex gap-3 items-center">
              <Link href="/admin" className="btn-secondary">{t('admin.backToAdmin')}</Link>
            </div>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Database Backup & Restore */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{t('admin.databaseBackup')}</h2>
                  <p className="text-gray-600 text-sm">{t('admin.databaseBackupDescription')}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={handleDatabaseBackup}
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center"
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {t('admin.backupDatabase')}
                </button>

                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleDatabaseRestore}
                    disabled={loading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="database-restore"
                  />
                  <label
                    htmlFor="database-restore"
                    className={`w-full btn-secondary flex items-center justify-center cursor-pointer ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    {t('admin.restoreDatabase')}
                  </label>
                </div>
              </div>
            </div>

            {/* Files Backup & Restore */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{t('admin.filesBackup')}</h2>
                  <p className="text-gray-600 text-sm">{t('admin.filesBackupDescription')}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={handleFilesBackup}
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center"
                >
                  {loading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {t('admin.backupFiles')}
                </button>

                <div className="relative">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFilesRestore}
                    disabled={loading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="files-restore"
                  />
                  <label
                    htmlFor="files-restore"
                    className={`w-full btn-secondary flex items-center justify-center cursor-pointer ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    {t('admin.restoreFiles')}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Notice */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">{t('admin.backupWarning')}</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>{t('admin.backupWarningText')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}
