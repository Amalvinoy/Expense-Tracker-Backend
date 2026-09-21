import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { categoryService } from './services/category/category.service.js';
import { logger } from './utils/logger.js';

let server: http.Server | null = null;
let isShuttingDown = false;

/**
 * Graceful shutdown handler
 * Closes HTTP listener and disconnects from MongoDB
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn(`Shutdown already in progress. Ignoring signal: ${signal}`);
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}. Commencing graceful server shutdown...`);

  // Force exit if graceful shutdown takes longer than 10 seconds
  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s. Forcing process exit.');
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => {
          if (err) {
            logger.error('Error closing HTTP server:', err);
            return reject(err);
          }
          logger.info('HTTP server closed successfully.');
          resolve();
        });
      });
    }

    await disconnectDatabase();
    logger.info('All connections terminated gracefully. Exiting process.');
    process.exit(0);
  } catch (err) {
    logger.error('Error occurred during graceful shutdown:', err);
    process.exit(1);
  }
}

/**
 * Bootstrap and launch the server
 */
async function bootstrap(): Promise<void> {
  try {
    logger.info(`Initializing Expense Tracker API [${env.NODE_ENV}]...`);
    // 1. Connect to Database before accepting traffic
    await connectDatabase();

    // 2. Ensure default system categories exist in database
    await categoryService.ensureDefaultCategories();

    // 3. Initialize Express application
    const app = createApp();

    // 3. Create HTTP Server
    server = http.createServer(app);

    // 4. Start Listening on all network interfaces (LAN & localhost)
    server.listen(env.PORT, env.HOST, () => {
      logger.info(`🚀 Server running on http://${env.HOST}:${env.PORT}`);
      logger.info(`👉 Health Check: http://localhost:${env.PORT}/api/health`);
    });

    // 5. Attach Process Lifecycle Signal Handlers
    process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Promise Rejection detected:', reason);
      void gracefulShutdown('unhandledRejection');
    });

    process.on('uncaughtException', (err: Error) => {
      logger.error('Uncaught Exception occurred:', err);
      void gracefulShutdown('uncaughtException');
    });
  } catch (err) {
    logger.error('Fatal initialization error. Aborting server launch:', err);
    await disconnectDatabase();
    process.exit(1);
  }
}

void bootstrap();
