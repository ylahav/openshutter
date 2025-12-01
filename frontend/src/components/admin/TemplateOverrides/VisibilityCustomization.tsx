'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Eye } from 'lucide-react'

interface VisibilityCustomizationProps {
  localOverrides: any
  onVisibilityChange: (visibilityType: string, value: boolean) => void
  template?: any
}

export default function VisibilityCustomization({ localOverrides, onVisibilityChange, template }: VisibilityCustomizationProps) {
  // Use template visibility if available, otherwise fallback to default fields
  const visibilityFields = template?.visibility 
    ? Object.entries(template.visibility).map(([key, defaultValue]) => ({
        key,
        label: key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase()),
        description: defaultValue ? 'Visible by default' : 'Hidden by default'
      }))
    : [
        { key: 'hero', label: 'Hero Section', description: 'Show/hide the hero section' },
        { key: 'languageSelector', label: 'Language Selector', description: 'Show/hide language selector' },
        { key: 'authButtons', label: 'Auth Buttons', description: 'Show/hide authentication buttons' },
        { key: 'footerMenu', label: 'Footer Menu', description: 'Show/hide footer menu' }
      ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Visibility Customization
        </CardTitle>
        <CardDescription>
          Control which elements are visible on your template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibilityFields.map((field) => (
            <div key={field.key} className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor={field.key}>{field.label}</Label>
                <p className="text-sm text-muted-foreground">{field.description}</p>
              </div>
              <Switch
                id={field.key}
                checked={localOverrides.customVisibility?.[field.key] ?? true}
                onCheckedChange={(checked) => onVisibilityChange(field.key, checked)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
