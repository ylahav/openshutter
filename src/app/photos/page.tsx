import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Photos - OpenShutter',
  description: 'Browse and manage your photo collection',
}

export default function PhotosPage() {
  // TODO: Fetch photos from database
  const photos: any[] = [] // Placeholder for photos data

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
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                Home
              </Link>
                          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
              Admin
              </Link>
              <Link href="/albums" className="text-gray-500 hover:text-gray-700">
                Albums
              </Link>
              <Link href="/photos" className="text-primary-600 font-medium">
                Photos
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Your Photos
              </h2>
              <p className="text-lg text-gray-600">
                Browse and organize your photo collection
              </p>
            </div>
            <Link href="/photos/upload" className="btn-primary">
              Upload Photos
            </Link>
          </div>

          {photos.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No photos yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start building your photo collection by uploading some images.
                </p>
                <div className="mt-6">
                  <Link href="/photos/upload" className="btn-primary">
                    Upload Your First Photo
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Photo cards would go here */}
              {photos.map((photo: any) => (
                <div key={photo.id} className="card hover:shadow-lg transition-shadow duration-200">
                  <div className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-t-lg">
                    {/* Photo thumbnail would go here */}
                    <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="card-body">
                    <h3 className="text-sm font-medium text-gray-900 mb-1 truncate">
                      {photo.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleDateString() : 'Unknown date'}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {photo.size ? `${(photo.size / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
                      </span>
                      <Link 
                        href={`/photos/${photo.id}`} 
                        className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
