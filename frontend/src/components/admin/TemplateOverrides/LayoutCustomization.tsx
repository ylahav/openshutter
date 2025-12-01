'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Layout } from 'lucide-react'

interface LayoutCustomizationProps {
  localOverrides: any
  onLayoutChange: (layoutType: string, value: string) => void
}

export default function LayoutCustomization({ localOverrides, onLayoutChange }: LayoutCustomizationProps) {
  const layoutFields = [
    { key: 'maxWidth', label: 'Max Width', description: 'Maximum container width' },
    { key: 'containerPadding', label: 'Container Padding', description: 'Padding around content' },
    { key: 'gridGap', label: 'Grid Gap', description: 'Spacing between grid items' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layout className="h-5 w-5" />
          Layout Customization
        </CardTitle>
        <CardDescription>
          Customize the layout and spacing of your template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {layoutFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                value={localOverrides.customLayout?.[field.key] || ''}
                onChange={(e) => onLayoutChange(field.key, e.target.value)}
                placeholder="Enter value"
              />
              <p className="text-sm text-muted-foreground">{field.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
