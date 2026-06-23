/**
 * CLI: install a template kit JSON into MongoDB.
 *
 *   pnpm --filter @openshutter/backend run install:template-kit ../templates-kits/studio.kit.json
 *
 * Idempotent: pages are upserted by alias; their page_modules are wiped and re-created.
 * `category` is forced to 'system' on install (these are template-provided pages).
 *
 * Out of scope for the spike: theme/site_config writes, asset shipping, kit validation,
 * permission checks. See templates-kits/studio.kit.json for the schema.
 */

import fs from 'fs/promises'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import mongoose, { Types } from 'mongoose'
import { connectDB } from '../config/db'

// Standalone scripts don't go through NestJS's ConfigModule, so they pick up MONGODB_URI
// from process.env only if shell-exported. Parse backend/.env inline (no dotenv dep) so
// the script targets the same database the dev server uses.
function loadBackendEnv(): void {
  const envPath = path.resolve(__dirname, '../../.env')
  if (!existsSync(envPath)) return
  const text = readFileSync(envPath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
loadBackendEnv()

type MultiLang = string | Record<string, string>

interface KitModule {
  type: string
  zone?: string
  rowOrder?: number
  columnIndex?: number
  columnProportion?: number
  rowSpan?: number
  colSpan?: number
  order?: number
  props?: Record<string, unknown>
}

interface KitPage {
  alias: string
  slug?: string
  role?: string
  frontendTemplate?: string
  frontendTemplates?: string[]
  category?: 'system' | 'site'
  isPublished?: boolean
  title?: MultiLang
  subtitle?: MultiLang
  layout?: { zones: string[] }
  modules: KitModule[]
}

interface KitTheme {
  layoutShellInstances?: Record<string, { gridRows?: number; gridColumns?: number; modules?: unknown[] }>
}

interface Kit {
  meta: { kitId: string; version: string; name: string; pageAliasPrefix: string }
  theme?: KitTheme
  pages: KitPage[]
}

function toMultiLangText(v: MultiLang | undefined): { en: string; he: string } {
  if (!v) return { en: '', he: '' }
  if (typeof v === 'string') return { en: v, he: v }
  return { en: String(v.en ?? ''), he: String(v.he ?? '') }
}

async function findAdminUserId(): Promise<Types.ObjectId> {
  const db = mongoose.connection.db
  if (!db) throw new Error('Database not connected')
  const user = await db.collection('users').findOne({ role: 'admin' })
  if (!user?._id) {
    throw new Error('No admin user found. Create one in /admin/users before installing kits.')
  }
  return user._id as Types.ObjectId
}

async function installKit(kitPath: string): Promise<void> {
  const absPath = path.isAbsolute(kitPath) ? kitPath : path.resolve(process.cwd(), kitPath)
  const raw = await fs.readFile(absPath, 'utf8')
  const kit = JSON.parse(raw) as Kit

  if (!kit?.pages?.length) throw new Error('Kit has no pages')

  await connectDB()
  const db = mongoose.connection.db
  if (!db) throw new Error('Database connection not established')

  // eslint-disable-next-line no-console
  console.log(`Connected: ${mongoose.connection.host}/${mongoose.connection.name}`)

  const pages = db.collection('pages')
  const pageModules = db.collection('page_modules')
  const userId = await findAdminUserId()
  const now = new Date()

  // eslint-disable-next-line no-console
  console.log(`Installing kit "${kit.meta.kitId}" v${kit.meta.version} (${kit.pages.length} pages)`)

  // Theme — layoutShellInstances merged into site_config.template.layoutShellInstances
  // (LayoutShellModule reads from there + layoutPresets). Mirrors backend/src/template/noir-footer-shell.ts.
  const shells = kit.theme?.layoutShellInstances
  if (shells && Object.keys(shells).length > 0) {
    const siteConfig = db.collection('site_config')
    const setOps: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(shells)) {
      setOps[`template.layoutShellInstances.${key}`] = value
      setOps[`template.layoutPresets.${key}`] = value
    }
    await siteConfig.updateOne({}, { $set: setOps }, { upsert: true })
    // eslint-disable-next-line no-console
    console.log(`  + layoutShellInstances: ${Object.keys(shells).join(', ')}`)
  }

  for (const p of kit.pages) {
    const aliasLower = p.alias.toLowerCase()
    const slugLower = (p.slug ?? p.alias).toLowerCase()

    const pageDoc: Record<string, unknown> = {
      title: toMultiLangText(p.title),
      alias: aliasLower,
      slug: slugLower,
      category: p.category ?? 'system',
      isPublished: p.isPublished ?? true,
      layout: p.layout ?? { zones: ['main'] },
      updatedBy: userId,
      updatedAt: now,
    }
    if (p.subtitle) pageDoc.subtitle = toMultiLangText(p.subtitle)
    if (p.role) pageDoc.pageRole = p.role
    if (p.frontendTemplate) pageDoc.frontendTemplate = p.frontendTemplate
    if (Array.isArray(p.frontendTemplates) && p.frontendTemplates.length > 0) {
      pageDoc.frontendTemplates = p.frontendTemplates
    }

    const existing = await pages.findOne({ alias: aliasLower })
    let pageId: Types.ObjectId

    if (existing) {
      pageId = existing._id as Types.ObjectId
      await pages.updateOne({ _id: pageId }, { $set: pageDoc })
      // eslint-disable-next-line no-console
      console.log(`  ↻ updated  ${aliasLower}  (_id=${pageId}, ${p.modules.length} modules)`)
    } else {
      const insertDoc = {
        ...pageDoc,
        createdBy: userId,
        createdAt: now,
      }
      const result = await pages.insertOne(insertDoc as any)
      pageId = result.insertedId as Types.ObjectId
      // eslint-disable-next-line no-console
      console.log(`  + inserted ${aliasLower}  (_id=${pageId}, ${p.modules.length} modules)`)
    }

    // Sanity check: read back the row so we surface DB mismatches loudly.
    const written = await pages.findOne({ _id: pageId })
    if (!written) {
      throw new Error(`Wrote ${aliasLower} but cannot read it back — wrong database?`)
    }

    // Wipe + re-create page_modules so the install is idempotent.
    await pageModules.deleteMany({ pageId })
    if (p.modules.length > 0) {
      const moduleDocs = p.modules.map((m, idx) => ({
        pageId,
        type: m.type,
        zone: m.zone ?? 'main',
        order: m.order ?? idx,
        rowOrder: m.rowOrder ?? idx,
        columnIndex: m.columnIndex ?? 0,
        ...(m.columnProportion !== undefined ? { columnProportion: m.columnProportion } : {}),
        ...(m.rowSpan !== undefined ? { rowSpan: m.rowSpan } : {}),
        ...(m.colSpan !== undefined ? { colSpan: m.colSpan } : {}),
        props: m.props ?? {},
        createdAt: now,
        updatedAt: now,
      }))
      await pageModules.insertMany(moduleDocs as any)
    }
  }

  // eslint-disable-next-line no-console
  console.log('Done. Visit the public site to see the new pages render.')
}

const kitArg = process.argv[2]
if (!kitArg) {
  // eslint-disable-next-line no-console
  console.error('Usage: install-template-kit <path-to-kit.json>')
  process.exit(1)
}

installKit(kitArg)
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Install failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => undefined)
  })
