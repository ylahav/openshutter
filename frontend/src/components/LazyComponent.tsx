'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

interface LazyComponentProps {
  children: ReactNode
  fallback?: ReactNode
  threshold?: number
  rootMargin?: string
  className?: string
}

export default function LazyComponent({
  children,
  fallback = <div className="animate-pulse bg-gray-200 rounded" />,
  threshold = 0.1,
  rootMargin = '50px',
  className = ''
}: LazyComponentProps) {
  const [isInView, setIsInView] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsInView(true)
          setHasLoaded(true)
          observer.disconnect()
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold, rootMargin, hasLoaded])

  return (
    <div ref={ref} className={className}>
      {isInView ? children : fallback}
    </div>
  )
}
