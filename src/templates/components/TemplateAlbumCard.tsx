'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { TemplateAlbum } from '@/types/ui'

const resolveTemplate = () => {
  if (typeof window === 'undefined') return 'default'
  const fromGlobal = (window as any).__ACTIVE_TEMPLATE__
  const fromStorage = localStorage.getItem('activeTemplate')
  return (fromGlobal || fromStorage || 'default') as string
}

const DynamicAlbumCard = dynamic(async () => {
  const template = resolveTemplate()
  try {
    const mod = await import(`@/templates/${template}/components/AlbumCard`)
    return (mod as any).default || mod
  } catch (e) {
    const fallback = await import('@/templates/default/components/AlbumCard')
    return (fallback as any).default || fallback
  }
}, { 
  ssr: false,
  loading: () => <div>Loading...</div>
}) as React.ComponentType<{ album: TemplateAlbum; className?: string }>

export default function TemplateAlbumCard(props: { album: TemplateAlbum; className?: string }) {
  return <DynamicAlbumCard {...props} />
}
