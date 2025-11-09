'use client'

import { useSearchParams } from 'next/navigation'
import { AdvancedFilterSearch } from '@/components/search/AdvancedFilterSearch'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      <AdvancedFilterSearch initialQuery={initialQuery} />
      <Footer />
    </div>
  )
}
