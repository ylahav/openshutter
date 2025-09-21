import { NextRequest, NextResponse } from 'next/server'
import { siteConfigService } from '@/services/site-config'

export async function GET(request: NextRequest) {
  try {
    const config = await siteConfigService.getConfig()
    
    return NextResponse.json({
      success: true,
      data: {
        title: config.title,
        description: config.description,
        logo: config.logo,
        favicon: config.favicon,
        languages: config.languages,
        theme: config.theme,
        seo: config.seo,
        contact: config.contact,
        homePage: config.homePage,
        features: config.features,
        template: config.template
      }
    })
  } catch (error) {
    console.error('Failed to get site config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get site config' },
      { status: 500 }
    )
  }
}
