'use client'

import { useState, useEffect } from 'react'

export interface TemplateCustomization {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  typography: {
    fontFamily: string
    headingSize: string
    bodySize: string
  }
  layout: {
    headerStyle: string
    cardStyle: string
    spacing: string
  }
  effects: {
    animations: boolean
    shadows: boolean
    gradients: boolean
    glassMorphism: boolean
  }
}

const defaultCustomization: TemplateCustomization = {
  colors: {
    primary: '#0ea5e9',
    secondary: '#64748b',
    accent: '#06b6d4',
    background: '#ffffff',
    text: '#1e293b'
  },
  typography: {
    fontFamily: 'Inter',
    headingSize: 'large',
    bodySize: 'medium'
  },
  layout: {
    headerStyle: 'modern',
    cardStyle: 'rounded',
    spacing: 'comfortable'
  },
  effects: {
    animations: true,
    shadows: true,
    gradients: true,
    glassMorphism: true
  }
}

export function useTemplateCustomization() {
  const [customization, setCustomization] = useState<TemplateCustomization>(defaultCustomization)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCustomization = async () => {
      try {
        const response = await fetch('/api/admin/template-customization')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setCustomization(result.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch template customization:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomization()
  }, [])

  return { customization, loading }
}

// Helper function to get CSS custom properties from customization
export function getCustomCSSProperties(customization: TemplateCustomization) {
  return {
    '--color-primary': customization.colors.primary,
    '--color-secondary': customization.colors.secondary,
    '--color-accent': customization.colors.accent,
    '--color-background': customization.colors.background,
    '--color-text': customization.colors.text,
    '--font-family': customization.typography.fontFamily,
    '--heading-size': customization.typography.headingSize,
    '--body-size': customization.typography.bodySize,
  } as React.CSSProperties
}

// Helper function to get dynamic classes based on customization
export function getDynamicClasses(customization: TemplateCustomization) {
  const classes = []
  
  // Card style classes
  if (customization.layout.cardStyle === 'rounded') {
    classes.push('rounded-lg')
  } else if (customization.layout.cardStyle === 'sharp') {
    classes.push('rounded-none')
  } else if (customization.layout.cardStyle === 'pill') {
    classes.push('rounded-full')
  } else {
    classes.push('rounded-sm')
  }
  
  // Shadow classes
  if (customization.effects.shadows) {
    classes.push('shadow-lg')
  }
  
  // Animation classes
  if (customization.effects.animations) {
    classes.push('transition-all', 'duration-300')
  }
  
  return classes.join(' ')
}
