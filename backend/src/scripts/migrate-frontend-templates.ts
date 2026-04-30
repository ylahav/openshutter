import mongoose from 'mongoose'
import { connectDB } from '../config/db'

const VALID_PACKS = new Set(['atelier', 'noir', 'studio'])

type PageDoc = {
  _id: unknown
  frontendTemplate?: unknown
  frontendTemplates?: unknown
}

function normalizeLegacyPack(value: unknown): string | null {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return null
  return VALID_PACKS.has(normalized) ? normalized : null
}

function normalizePackArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const raw of value) {
    const v = normalizeLegacyPack(raw)
    if (v && !out.includes(v)) out.push(v)
  }
  return out
}

function sameArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

async function run() {
  const apply = process.argv.includes('--apply')
  const verbose = process.argv.includes('--verbose')

  await connectDB()
  const db = mongoose.connection.db
  if (!db) throw new Error('Database connection not established')

  const pages = db.collection('pages')
  const docs = (await pages
    .find({}, { projection: { _id: 1, frontendTemplate: 1, frontendTemplates: 1 } })
    .toArray()) as PageDoc[]

  let examined = 0
  let changed = 0
  let backfilledFromLegacy = 0
  let normalizedArray = 0
  let normalizedLegacy = 0
  let setLegacyFromArray = 0

  for (const doc of docs) {
    examined++
    const currentArray = normalizePackArray(doc.frontendTemplates)
    const currentLegacy = normalizeLegacyPack(doc.frontendTemplate)

    const nextArray = currentArray.length > 0
      ? currentArray
      : (currentLegacy ? [currentLegacy] : [])

    const nextLegacy = nextArray.length === 1 ? nextArray[0] : null

    const arrayChanged = !sameArray(currentArray, nextArray)
    const legacyChanged = currentLegacy !== nextLegacy
    if (!arrayChanged && !legacyChanged) continue

    changed++
    if (currentArray.length === 0 && currentLegacy && nextArray.length === 1) backfilledFromLegacy++
    if (arrayChanged && currentArray.length > 0) normalizedArray++
    if (legacyChanged && nextLegacy === null) normalizedLegacy++
    if (legacyChanged && nextLegacy !== null && currentLegacy !== nextLegacy) setLegacyFromArray++

    if (verbose) {
      // eslint-disable-next-line no-console
      console.log(`[plan] page=${String(doc._id)} array=${JSON.stringify(currentArray)} -> ${JSON.stringify(nextArray)}, legacy=${currentLegacy ?? 'null'} -> ${nextLegacy ?? 'null'}`)
    }

    if (apply) {
      await pages.updateOne(
        { _id: doc._id as any },
        {
          $set: {
            frontendTemplates: nextArray,
            frontendTemplate: nextLegacy,
          },
        },
      )
    }
  }

  // eslint-disable-next-line no-console
  console.log('--- frontend template migration ---')
  // eslint-disable-next-line no-console
  console.log(`mode: ${apply ? 'APPLY' : 'DRY-RUN'}`)
  // eslint-disable-next-line no-console
  console.log(`examined: ${examined}`)
  // eslint-disable-next-line no-console
  console.log(`would_change${apply ? 'd' : ''}: ${changed}`)
  // eslint-disable-next-line no-console
  console.log(`backfilled_from_legacy: ${backfilledFromLegacy}`)
  // eslint-disable-next-line no-console
  console.log(`normalized_existing_arrays: ${normalizedArray}`)
  // eslint-disable-next-line no-console
  console.log(`legacy_set_to_null_for_multi_or_empty: ${normalizedLegacy}`)
  // eslint-disable-next-line no-console
  console.log(`legacy_aligned_to_single_array_pack: ${setLegacyFromArray}`)
  // eslint-disable-next-line no-console
  console.log(apply
    ? 'Done. Re-run without --apply to verify idempotence.'
    : 'Dry-run only. Re-run with --apply to persist changes.')
}

run()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Migration failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => undefined)
  })

