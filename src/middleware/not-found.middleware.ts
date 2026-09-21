import { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { sendError } from '../utils/response.js';

/**
 * 404 Not Found Middleware
 * Intercepts requests that do not match any registered routes
 */
export function notFoundMiddleware(req: Request, res: Response): Response {
  return sendError({
    res,
    statusCode: HttpStatus.NOT_FOUND,
    message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found.`,
    errors: [],
  });
}
