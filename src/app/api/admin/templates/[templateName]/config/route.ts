import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

function getTemplateConfigPath(templateName: string) {
  return path.join(process.cwd(), 'src', 'templates', templateName, 'template.config.json')
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ templateName: string }> }) {
  try {
    const { templateName } = await params
    const filePath = getTemplateConfigPath(templateName)
    const raw = await fs.readFile(filePath, 'utf8')
    const json = JSON.parse(raw)
    return NextResponse.json({ success: true, data: json })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to read template config' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ templateName: string }> }) {
  try {
    const { templateName } = await params
    const body = await req.json()
    // basic schema check
    if (!body || typeof body.templateName !== 'string' || body.templateName !== templateName) {
      return NextResponse.json({ success: false, error: 'Invalid template config' }, { status: 400 })
    }
    const filePath = getTemplateConfigPath(templateName)
    // backup into dedicated backups dir to avoid build picking it up
    try {
      const existing = await fs.readFile(filePath, 'utf8')
      const backupsDir = path.join(process.cwd(), 'src', 'templates', '_backups')
      try { await fs.mkdir(backupsDir, { recursive: true }) } catch {}
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(backupsDir, `${templateName}-template.config-${stamp}.json`)
      await fs.writeFile(backupPath, existing, 'utf8')
    } catch {}
    // write pretty JSON
    await fs.writeFile(filePath, JSON.stringify(body, null, 2), 'utf8')
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to write template config' }, { status: 500 })
  }
}
