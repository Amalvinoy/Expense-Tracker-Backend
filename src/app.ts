import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { apiRouter } from './routes/index.js';
import { logger } from './utils/logger.js';

export function createApp(): Express {
  const app: Express = express();

  // 1. Trust proxy in production if behind reverse proxy (e.g. NGINX, Cloudflare)
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // 2. Security Headers with Helmet
  app.use(helmet());

  // 3. CORS Configuration
  const allowedOrigins = env.CORS_ORIGIN === '*'
    ? '*'
    : env.CORS_ORIGIN.split(',').map((origin) => origin.trim());

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  // 4. Request Body Parsers with limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 5. Distributed Request ID Assignment
  app.use(requestIdMiddleware);

  // 6. Request Logging Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = req.id;

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${durationMs}ms)`, {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      });
    });

    next();
  });

  // 7. Mount Primary API Router (both /api and /api/v1 supported)
  app.use('/api', apiRouter);
  app.use('/api/v1', apiRouter);

  // 8. Root Welcome Route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Expense Tracker REST API',
      version: '1.0.0',
      documentation: '/docs/API_CONTRACT.md',
      health: '/api/health',
    });
  });

  // 9. 404 Catch-All Handler
  app.use(notFoundMiddleware);

  // 10. Centralized Error Handling Middleware
  app.use(errorMiddleware);

  return app;
}
