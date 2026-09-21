import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { ApiFieldError } from '../types/api.types.js';

/**
 * Global Express Error Handling Middleware
 * Ensures every error returns the standardized JSON error envelope
 */
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  const requestId = req.id;

  // 1. Operational AppErrors
  if (err instanceof AppError) {
    logger.warn(`Operational error: ${err.message}`, {
      requestId,
      statusCode: err.statusCode,
      errors: err.errors,
      path: req.originalUrl,
      method: req.method,
    });

    return sendError({
      res,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  // 2. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors: ApiFieldError[] = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    logger.warn('Validation error on request parameters or body', {
      requestId,
      errors: formattedErrors,
      path: req.originalUrl,
    });

    return sendError({
      res,
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Validation failed on submitted fields.',
      errors: formattedErrors,
    });
  }

  // 3. Mongoose Invalid ObjectId CastError
  if (err instanceof mongoose.Error.CastError) {
    const fieldError: ApiFieldError = {
      field: err.path,
      message: `Invalid identifier format for '${err.path}': '${err.value}'`,
    };

    return sendError({
      res,
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid resource identifier provided.',
      errors: [fieldError],
    });
  }

  // 4. Mongoose Duplicate Key Error (E11000)
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 11000) {
    const keyPattern = (err as { keyPattern?: Record<string, unknown> }).keyPattern || {};
    const duplicateFields = Object.keys(keyPattern);
    const formattedErrors: ApiFieldError[] = duplicateFields.map((field) => ({
      field,
      message: `A record with this ${field} already exists.`,
    }));

    return sendError({
      res,
      statusCode: HttpStatus.CONFLICT,
      message: 'Duplicate record conflict.',
      errors: formattedErrors,
    });
  }

  // 5. Malformed JSON Body (Express / body-parser SyntaxError)
  if (err instanceof SyntaxError && 'status' in err && (err as { status: unknown }).status === 400 && 'body' in err) {
    return sendError({
      res,
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Malformed JSON payload in request body.',
      errors: [{ message: 'The submitted body could not be parsed as valid JSON.' }],
    });
  }

  // 6. Unhandled Internal Server Errors (500)
  logger.error('Unhandled server exception caught by global error middleware:', err, {
    requestId,
    path: req.originalUrl,
    method: req.method,
  });

  const message = env.NODE_ENV === 'production'
    ? 'An internal server error occurred. Please try again later.'
    : err instanceof Error ? err.message : 'Internal server error';

  return sendError({
    res,
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message,
    errors: [],
  });
}
