import { NextRequest, NextResponse } from 'next/server'
import { templateService } from '@/services/template'
import { siteConfigService } from '@/services/site-config'

export async function GET() {
  try {
    console.log('API: Getting available templates...')
    const templates = await templateService.getAvailableTemplates()
    console.log('API: Templates retrieved:', templates.length)
    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    console.error('API: Error getting templates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get templates' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { templateName } = await request.json()
    console.log('API: Setting active template to:', templateName)
    
    // Get current site config
    const siteConfig = await siteConfigService.getConfig()
    
    // Update the template setting
    const updatedConfig = {
      ...siteConfig,
      template: {
        ...siteConfig.template,
        activeTemplate: templateName
      }
    }
    
    // Save the updated config
    await siteConfigService.updateConfig(updatedConfig)
    
    console.log('API: Template set successfully')
    return NextResponse.json({ success: true, message: 'Template updated successfully' })
  } catch (error) {
    console.error('API: Error setting template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to set template' },
      { status: 500 }
    )
  }
}
