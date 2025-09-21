'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTemplateOverrides } from '@/hooks/useTemplateOverrides'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Palette, Type, Layout, Eye, Settings, RotateCcw, ArrowLeft } from 'lucide-react'

export default function TemplateOverridesPage() {
  const router = useRouter()
  const { template, hasOverrides, activeOverrides, loading, error, updateOverrides, resetOverrides } = useTemplateOverrides()
  const { config } = useSiteConfig()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [localOverrides, setLocalOverrides] = useState<any>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (activeOverrides) {
      setLocalOverrides(activeOverrides)
    }
  }, [activeOverrides])

  const handleColorChange = (colorType: string, value: string) => {
    const newOverrides = {
      ...localOverrides,
      customColors: {
        ...localOverrides.customColors,
        [colorType]: value
      }
    }
    setLocalOverrides(newOverrides)
    setHasChanges(true)
  }

  const handleFontChange = (fontType: string, value: string) => {
    const newOverrides = {
      ...localOverrides,
      customFonts: {
        ...localOverrides.customFonts,
        [fontType]: value
      }
    }
    setLocalOverrides(newOverrides)
    setHasChanges(true)
  }

  const handleLayoutChange = (layoutType: string, value: string) => {
    const newOverrides = {
      ...localOverrides,
      customLayout: {
        ...localOverrides.customLayout,
        [layoutType]: value
      }
    }
    setLocalOverrides(newOverrides)
    setHasChanges(true)
  }

  const handleVisibilityChange = (component: string, value: boolean) => {
    const newOverrides = {
      ...localOverrides,
      componentVisibility: {
        ...localOverrides.componentVisibility,
        [component]: value
      }
    }
    setLocalOverrides(newOverrides)
    setHasChanges(true)
  }

  const handleHeaderConfigChange = (configType: string, value: any) => {
    const newOverrides = {
      ...localOverrides,
      headerConfig: {
        ...localOverrides.headerConfig,
        [configType]: value
      }
    }
    setLocalOverrides(newOverrides)
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setIsUpdating(true)
      await updateOverrides(localOverrides)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save overrides:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReset = async () => {
    try {
      setIsResetting(true)
      await resetOverrides()
      setLocalOverrides({})
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to reset overrides:', error)
    } finally {
      setIsResetting(false)
    }
  }

  const handleBack = () => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to go back?')
      if (confirmed) {
        router.push('/admin')
      }
    } else {
      router.push('/admin')
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?')
      if (confirmed) {
        setLocalOverrides(activeOverrides)
        setHasChanges(false)
      }
    } else {
      setLocalOverrides(activeOverrides)
      setHasChanges(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading template overrides...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>No template found</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Template Overrides</h1>
            <p className="text-muted-foreground">
              Customize your active template: <Badge variant="outline">{template.displayName}</Badge>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
          {hasOverrides && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isResetting}
            >
              {isResetting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reset to Default
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {hasOverrides && (
        <Alert>
          <AlertDescription>
            This template has custom overrides applied. Changes will be merged with the base template configuration.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="fonts" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Fonts
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="visibility" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visibility
          </TabsTrigger>
          <TabsTrigger value="header" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Header
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Color Customization</CardTitle>
              <CardDescription>
                Override the template's color scheme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary">Primary Color</Label>
                  <Input
                    id="primary"
                    type="color"
                    value={localOverrides.customColors?.primary || template.colors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary">Secondary Color</Label>
                  <Input
                    id="secondary"
                    type="color"
                    value={localOverrides.customColors?.secondary || template.colors.secondary}
                    onChange={(e) => handleColorChange('secondary', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent">Accent Color</Label>
                  <Input
                    id="accent"
                    type="color"
                    value={localOverrides.customColors?.accent || template.colors.accent}
                    onChange={(e) => handleColorChange('accent', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="background">Background Color</Label>
                  <Input
                    id="background"
                    type="color"
                    value={localOverrides.customColors?.background || template.colors.background}
                    onChange={(e) => handleColorChange('background', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text">Text Color</Label>
                  <Input
                    id="text"
                    type="color"
                    value={localOverrides.customColors?.text || template.colors.text}
                    onChange={(e) => handleColorChange('text', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="muted">Muted Color</Label>
                  <Input
                    id="muted"
                    type="color"
                    value={localOverrides.customColors?.muted || template.colors.muted}
                    onChange={(e) => handleColorChange('muted', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fonts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Font Customization</CardTitle>
              <CardDescription>
                Override the template's font settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="heading-font">Heading Font</Label>
                  <Input
                    id="heading-font"
                    value={localOverrides.customFonts?.heading || template.fonts.heading}
                    onChange={(e) => handleFontChange('heading', e.target.value)}
                    placeholder="e.g., Inter, Roboto, Arial"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body-font">Body Font</Label>
                  <Input
                    id="body-font"
                    value={localOverrides.customFonts?.body || template.fonts.body}
                    onChange={(e) => handleFontChange('body', e.target.value)}
                    placeholder="e.g., Inter, Roboto, Arial"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Layout Customization</CardTitle>
              <CardDescription>
                Override the template's layout settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-width">Max Width</Label>
                  <Input
                    id="max-width"
                    value={localOverrides.customLayout?.maxWidth || template.layout.maxWidth}
                    onChange={(e) => handleLayoutChange('maxWidth', e.target.value)}
                    placeholder="e.g., 1200px, 100%"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="container-padding">Container Padding</Label>
                  <Input
                    id="container-padding"
                    value={localOverrides.customLayout?.containerPadding || template.layout.containerPadding}
                    onChange={(e) => handleLayoutChange('containerPadding', e.target.value)}
                    placeholder="e.g., 1rem, 2rem"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grid-gap">Grid Gap</Label>
                  <Input
                    id="grid-gap"
                    value={localOverrides.customLayout?.gridGap || template.layout.gridGap}
                    onChange={(e) => handleLayoutChange('gridGap', e.target.value)}
                    placeholder="e.g., 1.5rem, 2rem"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visibility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Component Visibility</CardTitle>
              <CardDescription>
                Show or hide template components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {Object.entries(template.visibility || {}).map(([component, defaultValue]) => (
                  <div key={component} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium capitalize">
                        {component.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {defaultValue ? 'Visible by default' : 'Hidden by default'}
                      </p>
                    </div>
                    <Switch
                      checked={localOverrides.componentVisibility?.[component] ?? defaultValue}
                      onCheckedChange={(checked) => handleVisibilityChange(component, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="header" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Header Configuration</CardTitle>
              <CardDescription>
                Customize header component settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Show Logo</Label>
                    <p className="text-sm text-muted-foreground">
                      Display the site logo in the header
                    </p>
                  </div>
                  <Switch
                    checked={localOverrides.headerConfig?.showLogo ?? template.componentsConfig?.header?.showLogo ?? true}
                    onCheckedChange={(checked) => handleHeaderConfigChange('showLogo', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Show Site Title</Label>
                    <p className="text-sm text-muted-foreground">
                      Display the site title in the header
                    </p>
                  </div>
                  <Switch
                    checked={localOverrides.headerConfig?.showSiteTitle ?? template.componentsConfig?.header?.showSiteTitle ?? true}
                    onCheckedChange={(checked) => handleHeaderConfigChange('showSiteTitle', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Enable Theme Toggle</Label>
                    <p className="text-sm text-muted-foreground">
                      Show dark/light mode toggle button
                    </p>
                  </div>
                  <Switch
                    checked={localOverrides.headerConfig?.enableThemeToggle ?? template.componentsConfig?.header?.enableThemeToggle ?? false}
                    onCheckedChange={(checked) => handleHeaderConfigChange('enableThemeToggle', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Enable Language Selector</Label>
                    <p className="text-sm text-muted-foreground">
                      Show language selection dropdown
                    </p>
                  </div>
                  <Switch
                    checked={localOverrides.headerConfig?.enableLanguageSelector ?? template.componentsConfig?.header?.enableLanguageSelector ?? true}
                    onCheckedChange={(checked) => handleHeaderConfigChange('enableLanguageSelector', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Show Auth Buttons</Label>
                    <p className="text-sm text-muted-foreground">
                      Display login/logout buttons
                    </p>
                  </div>
                  <Switch
                    checked={localOverrides.headerConfig?.showAuthButtons ?? template.componentsConfig?.header?.showAuthButtons ?? true}
                    onCheckedChange={(checked) => handleHeaderConfigChange('showAuthButtons', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Show Greeting</Label>
                    <p className="text-sm text-muted-foreground">
                      Display welcome message for logged-in users
                    </p>
                  </div>
                  <Switch
                    checked={localOverrides.headerConfig?.showGreeting ?? template.componentsConfig?.header?.showGreeting ?? false}
                    onCheckedChange={(checked) => handleHeaderConfigChange('showGreeting', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
