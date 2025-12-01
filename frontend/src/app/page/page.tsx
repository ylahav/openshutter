'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import PageDisplay from '@/components/PageDisplay'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

function PageContent() {
  const searchParams = useSearchParams()
  const alias = searchParams.get('alias')

  if (!alias) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
            <p className="text-gray-600 mb-6">
              No page alias specified. Please provide a valid page alias.
            </p>
            <div className="space-x-4">
              <a href="/" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Go Home
              </a>
              <a href="/albums" className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                View Gallery
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return <PageDisplay alias={alias} />
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading page...</p>
          </div>
        </div>
        <Footer />
      </div>
    }>
      <PageContent />
    </Suspense>
  )
}
