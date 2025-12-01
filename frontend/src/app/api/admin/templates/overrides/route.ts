import { NextRequest, NextResponse } from 'next/server'
import { siteConfigService } from '@/services/site-config'
import { templateService } from '@/services/template'
import { SiteConfig } from '@/types/site-config'

export async function GET(request: NextRequest) {
  try {
    const config = await siteConfigService.getConfig()
    if (!config) {
      return NextResponse.json({ success: false, error: 'Site config not found' }, { status: 404 })
    }

    const activeTemplateName = config.template?.activeTemplate || 'default'
    const templateWithOverrides = await templateService.getTemplateWithOverrides(activeTemplateName, config)
    
    if (!templateWithOverrides) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 })
    }

    const hasOverrides = templateService.hasTemplateOverrides(config)
    const activeOverrides = templateService.getActiveOverrides(config)

    return NextResponse.json({
      success: true,
      data: {
        template: templateWithOverrides,
        hasOverrides,
        activeOverrides,
        baseTemplate: activeTemplateName
      }
    })
  } catch (error) {
    console.error('Error fetching template overrides:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template overrides' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { overrides, templateName } = body

    if (!overrides || !templateName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: overrides, templateName' },
        { status: 400 }
      )
    }

    const config = await siteConfigService.getConfig()
    if (!config) {
      return NextResponse.json({ success: false, error: 'Site config not found' }, { status: 404 })
    }

    // Update site config with new overrides
    const updatedConfig = templateService.updateSiteConfigOverrides(config, templateName, overrides)
    
    // Save updated config
    const updatedSiteConfig = await siteConfigService.updateConfig(updatedConfig)

    // Return the updated template with overrides applied
    const templateWithOverrides = await templateService.getTemplateWithOverrides(templateName, updatedSiteConfig)
    
    return NextResponse.json({
      success: true,
      data: {
        template: templateWithOverrides,
        hasOverrides: templateService.hasTemplateOverrides(updatedConfig),
        activeOverrides: templateService.getActiveOverrides(updatedConfig)
      }
    })
  } catch (error) {
    console.error('Error updating template overrides:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update template overrides' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const config = await siteConfigService.getConfig()
    if (!config) {
      return NextResponse.json({ success: false, error: 'Site config not found' }, { status: 404 })
    }

    // Reset all template overrides
    const updatedConfig = templateService.resetTemplateOverrides(config)
    
    // Save updated config
    const updatedSiteConfig = await siteConfigService.updateConfig(updatedConfig)

    // Return the base template without overrides
    const activeTemplateName = updatedConfig.template?.activeTemplate || 'default'
    const baseTemplate = await templateService.getTemplateConfig(activeTemplateName)
    
    return NextResponse.json({
      success: true,
      data: {
        template: baseTemplate,
        hasOverrides: false,
        activeOverrides: {}
      }
    })
  } catch (error) {
    console.error('Error resetting template overrides:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset template overrides' },
      { status: 500 }
    )
  }
}
