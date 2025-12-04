import { MongoClient, Db } from 'mongodb'
import mongoose from 'mongoose'
import { env } from '$env/dynamic/private'

// In SvelteKit, server-side env vars are available via $env/dynamic/private
// Fallback to process.env for compatibility
const uri = env.MONGODB_URI || process.env.MONGODB_URI

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable in .env file')
}

// Debug logging
const dbName = env.MONGODB_DB || process.env.MONGODB_DB || 'openshutter'
console.debug('  - MONGODB_URI:', uri ? '***' : 'NOT SET')
console.debug('  - MONGODB_DB:', dbName)
console.debug('  - NODE_ENV:', env.NODE_ENV || process.env.NODE_ENV)
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000, // Increased from 5000
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000, // Added connection timeout
  // Removed unsupported options: bufferMaxEntries, bufferCommands
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

const nodeEnv = env.NODE_ENV || process.env.NODE_ENV || 'development'
if (nodeEnv === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  try {
    console.log('🔗 Attempting to connect to MongoDB...')
    console.log('  - Using URI:', uri ? '***' : 'NOT SET')
    console.log('  - Database name:', dbName)
    
    const client = await clientPromise
    const db = client.db(dbName)
    
    console.log('✅ MongoDB client created, testing connection...')
    
    // Test the connection with a timeout
    const pingPromise = db.admin().ping()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Ping timeout')), 5000)
    )
    
    await Promise.race([pingPromise, timeoutPromise])
    
    console.log('✅ MongoDB connection successful!')
    return { client, db }
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error)
    console.error('  - Error details:', error)
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  try {
    const client = await clientPromise
    await client.close()
  } catch (error) {
    console.error('Failed to close MongoDB connection:', error)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabaseConnection()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await closeDatabaseConnection()
  process.exit(0)
})

// Mongoose connection
let mongooseConnection: typeof mongoose | null = null

export async function connectMongoose() {
  if (mongooseConnection && mongoose.connection.readyState === 1) {
    return mongooseConnection
  }

  try {
    console.debug('🔗 Connecting to MongoDB with Mongoose...')
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    })
    
    mongooseConnection = mongoose
    console.debug('✅ Mongoose connected successfully!')
    return mongooseConnection
  } catch (error) {
    console.error('❌ Mongoose connection failed:', error)
    throw error
  }
}

export default clientPromise
