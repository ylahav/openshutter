'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Type } from 'lucide-react'

interface FontCustomizationProps {
  localOverrides: any
  onFontChange: (fontType: string, value: string) => void
}

export default function FontCustomization({ localOverrides, onFontChange }: FontCustomizationProps) {
  const fontFields = [
    { key: 'heading', label: 'Heading Font', description: 'Font for headings and titles' },
    { key: 'body', label: 'Body Font', description: 'Font for body text and content' }
  ]

  const commonFonts = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat',
    'Source Sans Pro', 'Nunito', 'Playfair Display', 'Merriweather'
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Type className="h-5 w-5" />
          Font Customization
        </CardTitle>
        <CardDescription>
          Customize the typography of your template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fontFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                value={localOverrides.customFonts?.[field.key] || ''}
                onChange={(e) => onFontChange(field.key, e.target.value)}
                placeholder="Enter font name"
                list={`${field.key}-fonts`}
              />
              <datalist id={`${field.key}-fonts`}>
                {commonFonts.map((font) => (
                  <option key={font} value={font} />
                ))}
              </datalist>
              <p className="text-sm text-muted-foreground">{field.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
