import { MongoClient, Db } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

const uri = process.env.MONGODB_URI
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000, // Increased from 5000
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000, // Added connection timeout
  // Removed unsupported options: bufferMaxEntries, bufferCommands
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
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
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || 'openshutter')
    
    // Test the connection with a timeout
    const pingPromise = db.admin().ping()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Ping timeout')), 5000)
    )
    
    await Promise.race([pingPromise, timeoutPromise])
    
    return { client, db }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
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

export default clientPromise
