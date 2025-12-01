#!/usr/bin/env node

/**
 * Migration script to convert string user references to ObjectId references
 * 
 * This script:
 * 1. Creates a mapping from username/email to user._id
 * 2. Updates albums.createdBy from string to ObjectId
 * 3. Updates photos.uploadedBy from string to ObjectId
 * 4. Creates a "system" user for any orphaned references
 */

const { MongoClient, ObjectId } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables')
  process.exit(1)
}

async function migrateToObjectIdReferences() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Connected to MongoDB')
    
    const db = client.db()
    const usersCollection = db.collection('users')
    const albumsCollection = db.collection('albums')
    const photosCollection = db.collection('photos')
    
    // Step 1: Create username to ObjectId mapping
    console.log('📋 Creating username to ObjectId mapping...')
    const users = await usersCollection.find({}).toArray()
    const usernameToIdMap = new Map()
    
    for (const user of users) {
      if (user.username) {
        usernameToIdMap.set(user.username, user._id)
        console.log(`  ${user.username} -> ${user._id}`)
      }
    }
    
    console.log(`✅ Found ${usernameToIdMap.size} users`)
    
    // Step 2: Create system user for orphaned references
    console.log('🔧 Creating system user for orphaned references...')
    let systemUserId = null
    
    const systemUser = await usersCollection.findOne({ username: 'system' })
    if (!systemUser) {
      const systemUserResult = await usersCollection.insertOne({
        name: { en: 'System User' },
        username: 'system',
        passwordHash: '', // No password for system user
        role: 'admin',
        groupAliases: [],
        blocked: false,
        allowedStorageProviders: [],
        createdAt: new Date(),
        updatedAt: new Date()
      })
      systemUserId = systemUserResult.insertedId
      console.log(`✅ Created system user: ${systemUserId}`)
    } else {
      systemUserId = systemUser._id
      console.log(`✅ Found existing system user: ${systemUserId}`)
    }
    
    // Step 3: Migrate albums.createdBy
    console.log('📁 Migrating albums.createdBy...')
    const albums = await albumsCollection.find({}).toArray()
    let albumsUpdated = 0
    let albumsSkipped = 0
    
    for (const album of albums) {
      if (typeof album.createdBy === 'string') {
        const userId = usernameToIdMap.get(album.createdBy) || systemUserId
        
        await albumsCollection.updateOne(
          { _id: album._id },
          { 
            $set: { 
              createdBy: userId,
              updatedAt: new Date()
            } 
          }
        )
        
        console.log(`  Album ${album.alias}: ${album.createdBy} -> ${userId}`)
        albumsUpdated++
      } else {
        albumsSkipped++
      }
    }
    
    console.log(`✅ Albums: ${albumsUpdated} updated, ${albumsSkipped} skipped`)
    
    // Step 4: Migrate photos.uploadedBy
    console.log('📸 Migrating photos.uploadedBy...')
    const photos = await photosCollection.find({}).toArray()
    let photosUpdated = 0
    let photosSkipped = 0
    
    for (const photo of photos) {
      if (typeof photo.uploadedBy === 'string') {
        const userId = usernameToIdMap.get(photo.uploadedBy) || systemUserId
        
        await photosCollection.updateOne(
          { _id: photo._id },
          { 
            $set: { 
              uploadedBy: userId,
              updatedAt: new Date()
            } 
          }
        )
        
        console.log(`  Photo ${photo.filename}: ${photo.uploadedBy} -> ${userId}`)
        photosUpdated++
      } else {
        photosSkipped++
      }
    }
    
    console.log(`✅ Photos: ${photosUpdated} updated, ${photosSkipped} skipped`)
    
    // Step 5: Create indexes for performance
    console.log('🔍 Creating indexes...')
    
    try {
      await albumsCollection.createIndex({ createdBy: 1 })
      console.log('✅ Created index on albums.createdBy')
    } catch (error) {
      console.log('ℹ️  Index on albums.createdBy may already exist')
    }
    
    try {
      await photosCollection.createIndex({ uploadedBy: 1 })
      console.log('✅ Created index on photos.uploadedBy')
    } catch (error) {
      console.log('ℹ️  Index on photos.uploadedBy may already exist')
    }
    
    console.log('🎉 Migration completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`  - Users mapped: ${usernameToIdMap.size}`)
    console.log(`  - Albums updated: ${albumsUpdated}`)
    console.log(`  - Photos updated: ${photosUpdated}`)
    console.log(`  - System user ID: ${systemUserId}`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('✅ Disconnected from MongoDB')
  }
}

// Run migration
migrateToObjectIdReferences()
  .then(() => {
    console.log('✅ Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error)
    process.exit(1)
  })
