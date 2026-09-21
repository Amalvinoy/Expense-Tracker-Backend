/**
 * Standardized API Response Envelopes
 * Strict conformance to docs/API_CONTRACT.md
 */

export interface ApiFieldError {
  field?: string;
  message: string;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors: ApiFieldError[];
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
