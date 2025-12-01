#!/usr/bin/env node

/**
 * Database Index Initialization Script
 * 
 * This script creates optimized indexes for the OpenShutter database
 * to improve query performance and eliminate N+1 query problems.
 * 
 * Run with: node src/scripts/init-database-indexes.js
 */

const { DatabaseOptimizer } = require('../services/database-optimizer.ts')

async function initializeDatabaseIndexes() {
  console.log('🚀 Initializing OpenShutter Database Indexes...')
  console.log('================================================')
  
  try {
    // Create optimized indexes
    await DatabaseOptimizer.createOptimizedIndexes()
    
    // Get performance statistics
    const stats = await DatabaseOptimizer.getPerformanceStats()
    
    console.log('\n📊 Database Performance Statistics:')
    console.log('====================================')
    console.log(`Database: ${stats.database.name}`)
    console.log(`Collections: ${stats.database.collections}`)
    console.log(`Data Size: ${(stats.database.dataSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Index Size: ${(stats.database.indexSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`Total Size: ${(stats.database.totalSize / 1024 / 1024).toFixed(2)} MB`)
    
    console.log('\n📁 Collection Details:')
    console.log('======================')
    stats.collections.forEach(collection => {
      console.log(`\n${collection.name}:`)
      console.log(`  Documents: ${collection.count.toLocaleString()}`)
      console.log(`  Size: ${(collection.size / 1024 / 1024).toFixed(2)} MB`)
      console.log(`  Avg Object Size: ${(collection.avgObjSize / 1024).toFixed(2)} KB`)
      console.log(`  Indexes: ${collection.indexes}`)
      console.log(`  Index Size: ${(collection.totalIndexSize / 1024 / 1024).toFixed(2)} MB`)
    })
    
    console.log('\n✅ Database indexes initialized successfully!')
    console.log('🎯 Performance optimizations are now active.')
    
  } catch (error) {
    console.error('❌ Failed to initialize database indexes:', error)
    process.exit(1)
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabaseIndexes()
    .then(() => {
      console.log('\n🏁 Database initialization complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Database initialization failed:', error)
      process.exit(1)
    })
}

module.exports = { initializeDatabaseIndexes }
