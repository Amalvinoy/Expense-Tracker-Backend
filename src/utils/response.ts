import { Response } from 'express';
import { HttpStatus, HttpStatusCode } from '../constants/http-status.js';
import { ApiFieldError, ApiSuccessResponse, ApiErrorResponse } from '../types/api.types.js';

interface SendSuccessOptions<T> {
  res: Response;
  message?: string;
  data: T;
  statusCode?: HttpStatusCode;
}

interface SendErrorOptions {
  res: Response;
  message: string;
  errors?: ApiFieldError[];
  statusCode?: HttpStatusCode;
}

/**
 * Send standard successful response envelope
 */
export function sendSuccess<T>({
  res,
  message = 'Operation completed successfully.',
  data,
  statusCode = HttpStatus.OK,
}: SendSuccessOptions<T>): Response {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(payload);
}

/**
 * Send standard error response envelope
 */
export function sendError({
  res,
  message,
  errors = [],
  statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
}: SendErrorOptions): Response {
  const payload: ApiErrorResponse = {
    success: false,
    message,
    errors,
  };
  return res.status(statusCode).json(payload);
}
