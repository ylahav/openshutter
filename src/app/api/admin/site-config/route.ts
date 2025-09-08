import { NextRequest, NextResponse } from 'next/server'
import { siteConfigService } from '@/services/site-config'
import { SiteConfigUpdate } from '@/types/site-config'

export async function GET() {
  try {
    const config = await siteConfigService.getConfig()
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('API: Failed to get site config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get site configuration' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates: SiteConfigUpdate = await request.json()
    const config = await siteConfigService.updateConfig(updates)
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('Failed to update site config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update site configuration' },
      { status: 500 }
    )
  }
}
