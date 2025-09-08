'use client'

import dynamic from 'next/dynamic'

const PhotoUpload = dynamic(() => import('@/components/PhotoUpload'), {
  ssr: false
})

export default function PhotoUploadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">OpenShutter</h1>
            </div>
            <nav className="flex space-x-8">
              <a href="/" className="text-gray-500 hover:text-gray-700">
                Home
              </a>
                          <a href="/admin" className="text-gray-500 hover:text-gray-700">
              Admin
              </a>
              <a href="/albums" className="text-gray-500 hover:text-gray-700">
                Albums
              </a>
              <a href="/photos/upload" className="text-primary-600 font-medium">
                Upload Photos
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Upload Photos
            </h2>
            <p className="text-lg text-gray-600">
              Upload your photos to Google Drive and organize them with tags and albums
            </p>
          </div>

          <PhotoUpload />
        </div>
      </main>
    </div>
  )
}
