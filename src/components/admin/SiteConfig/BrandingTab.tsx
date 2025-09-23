'use client'

import { SiteConfig } from '@/types/site-config'
import { useRef } from 'react'

interface BrandingTabProps {
  config: SiteConfig
  setConfig: (config: SiteConfig) => void
  logoUploading: boolean
  setLogoUploading: (uploading: boolean) => void
  setMessage: (message: string) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

export default function BrandingTab({ 
  config, 
  setConfig, 
  logoUploading, 
  setLogoUploading, 
  setMessage, 
  fileInputRef 
}: BrandingTabProps) {
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLogoUploading(true)
    setMessage('')

    try {
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch('/api/admin/site-config/logo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (data.success) {
        setConfig(data.data.config)
        setMessage('Logo uploaded successfully!')
        
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setMessage('Failed to upload logo')
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      setMessage('Failed to upload logo')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleLogoDelete = async () => {
    if (!config?.logo) return

    setLogoUploading(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/site-config/logo', {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        setConfig(data.data.config)
        setMessage('Logo deleted successfully!')
      } else {
        setMessage('Failed to delete logo')
      }
    } catch (error) {
      console.error('Error deleting logo:', error)
      setMessage('Failed to delete logo')
    } finally {
      setLogoUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {config.logo && (
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">Current Logo:</div>
          <img src={config.logo} alt="Site Logo" className="h-16 w-auto object-contain border border-gray-200 rounded" />
          <button
            type="button"
            onClick={handleLogoDelete}
            disabled={logoUploading}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {logoUploading ? 'Deleting...' : 'Delete Logo'}
          </button>
        </div>
      )}
      <div>
        <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-2">Upload New Logo</label>
        <div className="flex items-center space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            id="logo"
            accept="image/*"
            onChange={handleLogoUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={logoUploading}
          />
          {logoUploading && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Uploading...
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">Supported formats: JPEG, PNG, GIF, WebP, SVG. Max size: 5MB.</p>
      </div>
    </div>
  )
}
