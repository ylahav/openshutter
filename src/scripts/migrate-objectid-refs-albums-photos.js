#!/usr/bin/env node

const { MongoClient, ObjectId } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables')
  process.exit(1)
}

function isHex24String(value) {
  return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value)
}

async function migrate() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()

  const albums = db.collection('albums')
  const photos = db.collection('photos')

  let albumParentUpdated = 0
  let albumCoverUpdated = 0
  let albumAllowedUsersUpdated = 0
  let photosAlbumUpdated = 0

  // albums.parentAlbumId
  const albumsWithStringParent = await albums.find({ parentAlbumId: { $type: 'string' } }).toArray()
  for (const a of albumsWithStringParent) {
    if (isHex24String(a.parentAlbumId)) {
      await albums.updateOne({ _id: a._id }, { $set: { parentAlbumId: new ObjectId(a.parentAlbumId) } })
      albumParentUpdated++
    }
  }

  // albums.coverPhotoId
  const albumsWithStringCover = await albums.find({ coverPhotoId: { $type: 'string' } }).toArray()
  for (const a of albumsWithStringCover) {
    if (isHex24String(a.coverPhotoId)) {
      await albums.updateOne({ _id: a._id }, { $set: { coverPhotoId: new ObjectId(a.coverPhotoId) } })
      albumCoverUpdated++
    }
  }

  // albums.allowedUsers[]
  const albumsWithStringAllowed = await albums.find({ allowedUsers: { $exists: true, $ne: null } }).toArray()
  for (const a of albumsWithStringAllowed) {
    if (Array.isArray(a.allowedUsers) && a.allowedUsers.some(u => typeof u === 'string')) {
      const newArray = a.allowedUsers.map(u => (isHex24String(u) ? new ObjectId(u) : u)).filter(Boolean)
      await albums.updateOne({ _id: a._id }, { $set: { allowedUsers: newArray } })
      albumAllowedUsersUpdated++
    }
  }

  // photos.albumId
  const photosWithStringAlbum = await photos.find({ albumId: { $type: 'string' } }).toArray()
  for (const p of photosWithStringAlbum) {
    if (isHex24String(p.albumId)) {
      await photos.updateOne({ _id: p._id }, { $set: { albumId: new ObjectId(p.albumId) } })
      photosAlbumUpdated++
    }
  }

  // Indexes
  try { await albums.createIndex({ parentAlbumId: 1 }) } catch {}
  try { await albums.createIndex({ coverPhotoId: 1 }) } catch {}
  try { await albums.createIndex({ allowedUsers: 1 }) } catch {}
  try { await photos.createIndex({ albumId: 1 }) } catch {}

  console.log('✅ Migration completed:')
  console.log('  albums.parentAlbumId updated:', albumParentUpdated)
  console.log('  albums.coverPhotoId updated:', albumCoverUpdated)
  console.log('  albums.allowedUsers updated:', albumAllowedUsersUpdated)
  console.log('  photos.albumId updated:', photosAlbumUpdated)

  await client.close()
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
