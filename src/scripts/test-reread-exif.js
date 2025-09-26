#!/usr/bin/env node

const { ObjectId, MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

const { ExifExtractor } = require('../services/exif-extractor')
const { connectToDatabase } = require('../lib/mongodb')

async function main() {
  const albumId = process.argv[2]
  if (!albumId) {
    console.error('Usage: pnpm run test:reread-exif -- <albumId>')
    process.exit(1)
  }

  const { db } = await connectToDatabase()
  const albums = db.collection('albums')
  const photos = db.collection('photos')

  const _id = new ObjectId(albumId)
  const album = await albums.findOne({ _id })
  if (!album) {
    console.error('Album not found:', albumId)
    process.exit(1)
  }

  console.log('Album:', album.alias, album._id.toString())
  const list = await photos.find({ albumId: _id }).limit(5).toArray()
  console.log(`Found ${list.length} photos, processing up to 5...`)

  let updated = 0
  for (const photo of list) {
    const before = photo.exif
    const updatedPhoto = await ExifExtractor.extractAndUpdateExif(photo, { force: true })
    const after = updatedPhoto?.exif
    console.log(photo.filename, 'before:', !!before, 'after:', !!after)
    if (after) updated++
  }

  console.log('Updated with EXIF:', updated)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
