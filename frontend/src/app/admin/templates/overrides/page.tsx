'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useTemplateOverrides } from '@/hooks/useTemplateOverrides'
import { useSiteConfig } from '@/hooks/useSiteConfig'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Loader2, Settings, RotateCcw, ArrowLeft, Palette, Type, Layout, Eye } from 'lucide-react'

// Dynamic imports for heavy components
const ColorCustomization = dynamic(() => import('@/components/admin/TemplateOverrides/ColorCustomization'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

const FontCustomization = dynamic(() => import('@/components/admin/TemplateOverrides/FontCustomization'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

const LayoutCustomization = dynamic(() => import('@/components/admin/TemplateOverrides/LayoutCustomization'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

const VisibilityCustomization = dynamic(() => import('@/components/admin/TemplateOverrides/VisibilityCustomization'), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />
})

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
          <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
            <ColorCustomization
              localOverrides={localOverrides}
              onColorChange={handleColorChange}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="fonts" className="space-y-4">
          <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
            <FontCustomization
              localOverrides={localOverrides}
              onFontChange={handleFontChange}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="layout" className="space-y-4">
          <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
            <LayoutCustomization
              localOverrides={localOverrides}
              onLayoutChange={handleLayoutChange}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="visibility" className="space-y-4">
          <Suspense fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}>
            <VisibilityCustomization
              localOverrides={localOverrides}
              onVisibilityChange={handleVisibilityChange}
              template={template}
            />
          </Suspense>
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
