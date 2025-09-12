#!/usr/bin/env node

/**
 * Test script to verify album access control functionality
 * This script tests the access control system by creating test data and verifying access
 */

const { MongoClient, ObjectId } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/openshutter'

async function testAccessControl() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db('openshutter')
    
    console.log('🧪 Testing Album Access Control...\n')
    
    // Clean up any existing test data
    await db.collection('users').deleteMany({ username: { $regex: /^test-/ } })
    await db.collection('groups').deleteMany({ alias: { $regex: /^test-/ } })
    await db.collection('albums').deleteMany({ alias: { $regex: /^test-/ } })
    
    // Create test groups
    const group1 = await db.collection('groups').insertOne({
      alias: 'test-group-1',
      name: { en: 'Test Group 1', he: 'קבוצת בדיקה 1' },
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    const group2 = await db.collection('groups').insertOne({
      alias: 'test-group-2', 
      name: { en: 'Test Group 2', he: 'קבוצת בדיקה 2' },
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    console.log('✅ Created test groups')
    
    // Create test users
    const user1 = await db.collection('users').insertOne({
      name: { en: 'Test User 1', he: 'משתמש בדיקה 1' },
      username: 'test-user-1@example.com',
      passwordHash: 'dummy-hash',
      role: 'owner',
      groupAliases: ['test-group-1'],
      blocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    const user2 = await db.collection('users').insertOne({
      name: { en: 'Test User 2', he: 'משתמש בדיקה 2' },
      username: 'test-user-2@example.com', 
      passwordHash: 'dummy-hash',
      role: 'owner',
      groupAliases: ['test-group-2'],
      blocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    const user3 = await db.collection('users').insertOne({
      name: { en: 'Test User 3', he: 'משתמש בדיקה 3' },
      username: 'test-user-3@example.com',
      passwordHash: 'dummy-hash', 
      role: 'owner',
      groupAliases: [],
      blocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    console.log('✅ Created test users')
    
    // Create test albums with different access controls
    const publicAlbum = await db.collection('albums').insertOne({
      name: { en: 'Public Test Album', he: 'אלבום ציבורי לבדיקה' },
      alias: 'test-public-album',
      description: { en: 'This is a public album', he: 'זהו אלבום ציבורי' },
      isPublic: true,
      isFeatured: false,
      storageProvider: 'local',
      storagePath: 'test-public-album',
      parentAlbumId: null,
      parentPath: '',
      level: 0,
      order: 0,
      createdBy: 'admin',
      tags: [],
      allowedGroups: [],
      allowedUsers: [],
      photoCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    const groupRestrictedAlbum = await db.collection('albums').insertOne({
      name: { en: 'Group Restricted Album', he: 'אלבום מוגבל לקבוצה' },
      alias: 'test-group-restricted-album',
      description: { en: 'This album is restricted to test-group-1', he: 'אלבום זה מוגבל לקבוצת בדיקה 1' },
      isPublic: false,
      isFeatured: false,
      storageProvider: 'local',
      storagePath: 'test-group-restricted-album',
      parentAlbumId: null,
      parentPath: '',
      level: 0,
      order: 1,
      createdBy: 'admin',
      tags: [],
      allowedGroups: ['test-group-1'],
      allowedUsers: [],
      photoCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    const userRestrictedAlbum = await db.collection('albums').insertOne({
      name: { en: 'User Restricted Album', he: 'אלבום מוגבל למשתמש' },
      alias: 'test-user-restricted-album',
      description: { en: 'This album is restricted to test-user-2', he: 'אלבום זה מוגבל למשתמש בדיקה 2' },
      isPublic: false,
      isFeatured: false,
      storageProvider: 'local',
      storagePath: 'test-user-restricted-album',
      parentAlbumId: null,
      parentPath: '',
      level: 0,
      order: 2,
      createdBy: 'admin',
      tags: [],
      allowedGroups: [],
      allowedUsers: [user2.insertedId],
      photoCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    const privateAlbum = await db.collection('albums').insertOne({
      name: { en: 'Private Album', he: 'אלבום פרטי' },
      alias: 'test-private-album',
      description: { en: 'This album has no access restrictions', he: 'לאלבום זה אין הגבלות גישה' },
      isPublic: false,
      isFeatured: false,
      storageProvider: 'local',
      storagePath: 'test-private-album',
      parentAlbumId: null,
      parentPath: '',
      level: 0,
      order: 3,
      createdBy: 'admin',
      tags: [],
      allowedGroups: [],
      allowedUsers: [],
      photoCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    console.log('✅ Created test albums')
    
    // Test access control logic
    console.log('\n🔍 Testing Access Control Logic...\n')
    
    // Test 1: Anonymous user should only see public album
    console.log('Test 1: Anonymous user access')
    const anonymousQuery = {
      $or: [
        { isPublic: true },
        { allowedUsers: { $in: [] } },
        { allowedGroups: { $in: [] } }
      ]
    }
    const anonymousAlbums = await db.collection('albums').find(anonymousQuery).toArray()
    console.log(`  - Should see 1 album (public), actually sees ${anonymousAlbums.length}`)
    console.log(`  - Albums: ${anonymousAlbums.map(a => a.alias).join(', ')}`)
    
    // Test 2: User 1 (in test-group-1) should see public + group restricted
    console.log('\nTest 2: User 1 (test-group-1) access')
    const user1Query = {
      $or: [
        { isPublic: true },
        { allowedUsers: user1.insertedId },
        { allowedGroups: { $in: ['test-group-1'] } }
      ]
    }
    const user1Albums = await db.collection('albums').find(user1Query).toArray()
    console.log(`  - Should see 2 albums (public + group restricted), actually sees ${user1Albums.length}`)
    console.log(`  - Albums: ${user1Albums.map(a => a.alias).join(', ')}`)
    
    // Test 3: User 2 (in test-group-2) should see public + user restricted
    console.log('\nTest 3: User 2 (test-group-2) access')
    const user2Query = {
      $or: [
        { isPublic: true },
        { allowedUsers: user2.insertedId },
        { allowedGroups: { $in: ['test-group-2'] } }
      ]
    }
    const user2Albums = await db.collection('albums').find(user2Query).toArray()
    console.log(`  - Should see 2 albums (public + user restricted), actually sees ${user2Albums.length}`)
    console.log(`  - Albums: ${user2Albums.map(a => a.alias).join(', ')}`)
    
    // Test 4: User 3 (no groups) should only see public album
    console.log('\nTest 4: User 3 (no groups) access')
    const user3Query = {
      $or: [
        { isPublic: true },
        { allowedUsers: user3.insertedId },
        { allowedGroups: { $in: [] } }
      ]
    }
    const user3Albums = await db.collection('albums').find(user3Query).toArray()
    console.log(`  - Should see 1 album (public), actually sees ${user3Albums.length}`)
    console.log(`  - Albums: ${user3Albums.map(a => a.alias).join(', ')}`)
    
    // Test 5: Admin should see all albums
    console.log('\nTest 5: Admin access (no query restrictions)')
    const adminAlbums = await db.collection('albums').find({}).toArray()
    console.log(`  - Should see 4 albums (all), actually sees ${adminAlbums.length}`)
    console.log(`  - Albums: ${adminAlbums.map(a => a.alias).join(', ')}`)
    
    console.log('\n✅ Access control tests completed!')
    console.log('\n🧹 Cleaning up test data...')
    
    // Clean up test data
    await db.collection('users').deleteMany({ username: { $regex: /^test-/ } })
    await db.collection('groups').deleteMany({ alias: { $regex: /^test-/ } })
    await db.collection('albums').deleteMany({ alias: { $regex: /^test-/ } })
    
    console.log('✅ Test data cleaned up')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await client.close()
  }
}

// Run the test
testAccessControl()
