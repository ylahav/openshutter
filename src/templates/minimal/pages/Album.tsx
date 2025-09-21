'use client'

import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

const Album: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Album</h1>
        <p className="text-muted-foreground">Album page coming soon...</p>
      </main>
      <Footer />
    </div>
  )
}

export default Album
