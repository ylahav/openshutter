'use client'

import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function AlbumPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8">Album</h1>
          <p>Album content coming soon...</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
