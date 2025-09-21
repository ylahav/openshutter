'use client'

import * as React from 'react'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps {
  className?: string
  children: React.ReactNode
}

interface DialogHeaderProps {
  children: React.ReactNode
}

interface DialogTitleProps {
  className?: string
  children: React.ReactNode
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className = '', children, ...props }, ref) => {
    // Check if custom width classes are provided
    const hasCustomWidth = className.includes('max-w-') || className.includes('w-[')
    const defaultWidth = hasCustomWidth ? '' : 'max-w-md'
    
    return (
      <div
        ref={ref}
        className={`bg-white rounded-lg shadow-lg w-full ${defaultWidth} mx-4 ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
DialogContent.displayName = 'DialogContent'

const DialogHeader = ({ children }: DialogHeaderProps) => (
  <div className="flex items-center justify-between p-6 border-b">
    {children}
  </div>
)

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className = '', children, ...props }, ref) => (
    <h2
      ref={ref}
      className={`text-lg font-semibold text-gray-900 ${className}`}
      {...props}
    >
      {children}
    </h2>
  )
)
DialogTitle.displayName = 'DialogTitle'

export { Dialog, DialogContent, DialogHeader, DialogTitle }
