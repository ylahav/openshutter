#!/usr/bin/env node

const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

async function main() {
  const basePathArg = process.argv[2]
  if (!basePathArg) {
    console.error('Usage: pnpm run storage:set-base -- <absoluteBasePath>')
    process.exit(1)
  }
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL
  if (!uri) {
    console.error('Missing MONGODB_URI/DATABASE_URL')
    process.exit(1)
  }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db()
  const coll = db.collection('storage_configs')

  const res = await coll.updateOne(
    { providerId: 'local' },
    { $set: { providerId: 'local', name: 'Local Storage', isEnabled: true, config: { basePath: basePathArg, isEnabled: true }, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  )

  console.log('Updated storage_configs local:', res.matchedCount ? 'updated' : 'inserted', basePathArg)
  await client.close()
}

main().catch(err => { console.error(err); process.exit(1) })
