'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdvancedFilterSearch } from '@/components/search/AdvancedFilterSearch'
import Header from '../components/Header'
import Footer from '../components/Footer'

function SearchPageContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  
  return (
    <div className="min-h-screen">
      <Header />
      <AdvancedFilterSearch initialQuery={initialQuery} />
      <Footer />
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
        </div>
        <Footer />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
