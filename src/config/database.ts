import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Configure Mongoose event listeners
 */
mongoose.connection.on('connected', () => {
  logger.info('MongoDB connection established successfully.');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB runtime connection error occurred:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected.');
});

/**
 * Connect to MongoDB with timeout & pool configurations
 */
export async function connectDatabase(): Promise<typeof mongoose> {
  try {
    logger.info('Connecting to MongoDB...', { uri: env.MONGODB_URI.replace(/\/\/.*@/, '//***@') });

    const connection = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      autoIndex: env.NODE_ENV !== 'production',
      maxPoolSize: 10,
    });

    return connection;
  } catch (err) {
    logger.error('Failed to connect to MongoDB during server initialization:', err);
    throw err;
  }
}

/**
 * Disconnect cleanly from MongoDB on graceful shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    try {
      logger.info('Closing MongoDB connection...');
      await mongoose.disconnect();
      logger.info('MongoDB connection closed.');
    } catch (err) {
      logger.error('Error closing MongoDB connection:', err);
    }
  }
}
