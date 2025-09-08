'use client'

import * as React from 'react'

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
  className?: string
  children: React.ReactNode
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
    
    const variantClasses = {
      default: 'bg-blue-100 text-blue-800',
      secondary: 'bg-gray-100 text-gray-800',
      outline: 'border border-gray-300 text-gray-700',
      destructive: 'bg-red-100 text-red-800'
    }
    
    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Badge.displayName = 'Badge'

export { Badge }
