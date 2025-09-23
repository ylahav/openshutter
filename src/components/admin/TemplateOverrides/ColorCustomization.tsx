'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Palette } from 'lucide-react'

interface ColorCustomizationProps {
  localOverrides: any
  onColorChange: (colorType: string, value: string) => void
}

export default function ColorCustomization({ localOverrides, onColorChange }: ColorCustomizationProps) {
  const colorFields = [
    { key: 'primary', label: 'Primary Color', description: 'Main brand color' },
    { key: 'secondary', label: 'Secondary Color', description: 'Supporting color' },
    { key: 'accent', label: 'Accent Color', description: 'Highlight color' },
    { key: 'background', label: 'Background Color', description: 'Page background' },
    { key: 'text', label: 'Text Color', description: 'Main text color' },
    { key: 'muted', label: 'Muted Color', description: 'Secondary text color' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Color Customization
        </CardTitle>
        <CardDescription>
          Customize the color scheme of your template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {colorFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={field.key}
                  type="color"
                  value={localOverrides.customColors?.[field.key] || '#000000'}
                  onChange={(e) => onColorChange(field.key, e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  type="text"
                  value={localOverrides.customColors?.[field.key] || '#000000'}
                  onChange={(e) => onColorChange(field.key, e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">{field.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
