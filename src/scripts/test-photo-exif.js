#!/usr/bin/env node

const { ObjectId, MongoClient } = require('mongodb')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function main() {
  const id = process.argv[2]
  if (!id) {
    console.error('Usage: pnpm run test:photo-exif -- <photoObjectId>')
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
  const photos = db.collection('photos')

  const _id = new ObjectId(id)
  const photo = await photos.findOne({ _id })
  if (!photo) {
    console.error('Photo not found:', id)
    process.exit(1)
  }

  console.log('Testing EXIF for:', photo.filename, photo.storage?.provider, photo.storage?.path)
  if (photo.storage?.provider !== 'local') {
    console.error('Test script supports only local provider')
    process.exit(1)
  }

  const basePath = process.env.LOCAL_STORAGE_PATH || './uploads'
  const fullPath = path.isAbsolute(basePath) ? path.join(basePath, photo.storage.path) : path.join(process.cwd(), basePath, photo.storage.path)
  console.log('Full path:', fullPath)

  const buffer = fs.readFileSync(fullPath)
  const ExifParser = require('exif-parser')
  const parser = ExifParser.create(buffer)
  const result = parser.parse()
  console.log('Has tags:', !!result?.tags, 'keys:', result?.tags ? Object.keys(result.tags).length : 0)
  if (result?.tags) {
    console.log('Sample tags:', Object.fromEntries(Object.entries(result.tags).slice(0, 10)))
  }

  await client.close()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
