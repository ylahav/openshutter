'use client'

import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

const Gallery: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Gallery</h1>
        <p className="text-muted-foreground">Gallery page coming soon...</p>
      </main>
      <Footer />
    </div>
  )
}

export default Gallery
