'use client'

import dynamic from 'next/dynamic'

// Resolve template name on the client at runtime (from localStorage or global var)
const resolveTemplate = () => {
  if (typeof window === 'undefined') return 'default'
  const fromGlobal = (window as any).__ACTIVE_TEMPLATE__
  const fromStorage = localStorage.getItem('activeTemplate')
  return (fromGlobal || fromStorage || 'default') as string
}

// Define dynamic component at module scope using a factory that resolves at runtime
const DynamicHeader = dynamic(async () => {
  const template = resolveTemplate()
  try {
    const mod = await import(`@/templates/${template}/components/Header`)
    return (mod as any).default || mod
  } catch (e) {
    const fallback = await import('@/templates/default/components/Header')
    return (fallback as any).default || fallback
  }
}, { ssr: false })

export default function TemplateHeader() {
  return <DynamicHeader />
}
