'use client'

import dynamic from 'next/dynamic'

const resolveTemplate = () => {
  if (typeof window === 'undefined') return 'default'
  const fromGlobal = (window as any).__ACTIVE_TEMPLATE__
  const fromStorage = localStorage.getItem('activeTemplate')
  return (fromGlobal || fromStorage || 'default') as string
}

const DynamicFooter = dynamic(async () => {
  const template = resolveTemplate()
  try {
    const mod = await import(`@/templates/${template}/components/Footer`)
    return (mod as any).default || mod
  } catch (e) {
    const fallback = await import('@/templates/default/components/Footer')
    return (fallback as any).default || fallback
  }
}, { ssr: false })

export default function TemplateFooter() {
  return <DynamicFooter />
}
