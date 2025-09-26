#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb')
const fs = require('fs')
const path = require('path')
const { storageManager } = require('../services/storage/manager')
require('dotenv').config({ path: '.env.local' })

function resolveBasePaths() {
  const paths = []
  if (process.env.LOCAL_STORAGE_PATH) paths.push(process.env.LOCAL_STORAGE_PATH)
  paths.push('./uploads')
  paths.push('./storage')
  // Normalize to absolute
  return paths.map(p => (path.isAbsolute(p) ? p : path.join(process.cwd(), p)))
}

function tryReadFile(relativePath, bases) {
  for (const base of bases) {
    const full = path.join(base, relativePath)
    try {
      const buf = fs.readFileSync(full)
      return { buffer: buf, fullPath: full }
    } catch {}
  }
  return null
}

async function main() {
  const albumIdArg = process.argv[2]
  if (!albumIdArg) {
    console.error('Usage: pnpm run reread:album -- <albumObjectId>')
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
  const albums = db.collection('albums')
  const photos = db.collection('photos')

  const albumId = new ObjectId(albumIdArg)
  const album = await albums.findOne({ _id: albumId })
  if (!album) {
    console.error('Album not found:', albumIdArg)
    process.exit(1)
  }

  const list = await photos.find({ albumId }).toArray()
  console.log(`Album ${album.alias} (${album._id}) photos: ${list.length}`)

  const ExifParser = require('exif-parser')
  let processed = 0
  let updated = 0
  let missing = 0
  
  // Resolve storage provider for each photo dynamically
  

  for (const photo of list) {
    processed++
    const rel = photo?.storage?.path
    if (!rel) { missing++; continue }
    let buffer = null
    try {
      const provider = photo?.storage?.provider || 'local'
      const service = await storageManager.getProvider(provider)
      buffer = await service.getFileBuffer(rel)
    } catch {}
    if (!buffer) {
      console.warn('File not found for', rel)
      missing++
      continue
    }
    try {
      const parser = ExifParser.create(buffer)
      const result = parser.parse()
      const tags = result?.tags || null
      const exif = {}
      if (tags) {
        if (tags.Make) exif.make = tags.Make
        if (tags.Model) exif.model = tags.Model
        if (tags.DateTime) exif.dateTime = new Date(tags.DateTime)
        if (tags.DateTimeOriginal) exif.dateTimeOriginal = new Date(tags.DateTimeOriginal)
        if (tags.ExposureTime) exif.exposureTime = tags.ExposureTime
        if (tags.FNumber) exif.fNumber = tags.FNumber
        if (tags.ISO) exif.iso = tags.ISO
        if (tags.FocalLength) exif.focalLength = tags.FocalLength
        if (tags.GPSLatitude && tags.GPSLongitude) {
          exif.gps = { latitude: tags.GPSLatitude, longitude: tags.GPSLongitude }
          if (tags.GPSAltitude) exif.gps.altitude = tags.GPSAltitude
        }
      }
      if (Object.keys(exif).length > 0) {
        await photos.updateOne({ _id: photo._id }, { $set: { exif, updatedAt: new Date() } })
        updated++
      }
    } catch (e) {
      console.warn('EXIF parse failed for', rel, e.message)
    }
  }

  console.log('Done.', { processed, updated, missing })
  await client.close()
}

main().catch(err => { console.error(err); process.exit(1) })
