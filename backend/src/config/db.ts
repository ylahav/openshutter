import mongoose from 'mongoose';
import { Logger } from '@nestjs/common';

const logger = new Logger('DatabaseConnection');

/**
 * Ensure MongoDB connection is established
 * Note: In NestJS, the database connection is handled by DatabaseModule,
 * but this function can be used by standalone services that need to ensure connection
 */
export const connectDB = async () => {
  // If already connected, return the connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If connecting, wait for it
  if (mongoose.connection.readyState === 2) {
    return new Promise((resolve, reject) => {
      mongoose.connection.once('connected', () => resolve(mongoose.connection));
      mongoose.connection.once('error', reject);
    });
  }

  // Otherwise, connect (this should rarely happen in NestJS context)
  // Use same default as configuration.ts so services that call connectDB() work without .env
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/openshutter';

  try {
    const conn = await mongoose.connect(MONGODB_URI);
    logger.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};
