import { NextRequest, NextResponse } from 'next/server'
import { siteConfigService } from '@/services/site-config'
import path from 'path'
import { promises as fs } from 'fs'

type TemplateJson = {
  templateName: string
  displayName: string
  version: string
  author?: string
  description?: string
  category?: string
  features?: Record<string, any>
  colors?: Record<string, string>
  layout?: Record<string, string>
  components?: Record<string, string>
  visibility?: Record<string, boolean>
  pages?: Record<string, string>
  assets?: Record<string, string>
}

let cache: { data: TemplateJson[]; ts: number } | null = null
const CACHE_TTL_MS = 60 * 1000

async function readTemplatesFromDisk(): Promise<TemplateJson[]> {
  const templatesDir = path.join(process.cwd(), 'src', 'templates')
  const entries = await fs.readdir(templatesDir, { withFileTypes: true })

  const results: TemplateJson[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const dir = path.join(templatesDir, entry.name)
    const cfgPath = path.join(dir, 'template.config.json')
    try {
      const raw = await fs.readFile(cfgPath, 'utf8')
      const json = JSON.parse(raw)
      // Minimal validation
      if (
        json &&
        typeof json.templateName === 'string' &&
        typeof json.displayName === 'string' &&
        typeof json.version === 'string'
      ) {
        results.push(json as TemplateJson)
      }
    } catch (_) {
      // ignore missing/invalid configs
    }
  }
  return results
}

export async function GET() {
  try {
    const now = Date.now()
    if (cache && now - cache.ts < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cache.data })
    }
    const templates = await readTemplatesFromDisk()
    cache = { data: templates, ts: now }
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
