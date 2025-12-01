'use client'

import * as React from 'react'
import { Check } from '@/lib/icons'

interface CheckboxProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, checked = false, onCheckedChange, disabled = false, className = '', ...props }, ref) => {
    return (
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={`
            w-4 h-4 border-2 rounded flex items-center justify-center cursor-pointer transition-colors
            ${checked 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className}
          `}
          onClick={() => !disabled && onCheckedChange?.(!checked)}
        >
          {checked && <Check className="w-3 h-3" />}
        </div>
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
