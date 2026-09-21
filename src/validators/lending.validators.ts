import { z } from 'zod';
import { LENDING_STATUSES } from '../types/lending.types.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const dateSchema = z
  .string({
    invalid_type_error: 'Date must be a valid date string',
  })
  .refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format. Must be an ISO-8601 date string',
  });

/**
 * Validation schema for creating a new lending record
 */
export const createLendingSchema = z.object({
  personName: z
    .string({
      required_error: 'Person name is required',
      invalid_type_error: 'Person name must be a string',
    })
    .trim()
    .min(1, 'Person name cannot be empty')
    .max(100, 'Person name cannot exceed 100 characters'),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be greater than zero')
    .max(100000000, 'Amount cannot exceed 100,000,000'),
  date: dateSchema.optional(),
  note: z
    .string({
      invalid_type_error: 'Note must be a string',
    })
    .trim()
    .max(500, 'Note cannot exceed 500 characters')
    .optional(),
});

/**
 * Validation schema for updating a lending record
 */
export const updateLendingSchema = z
  .object({
    personName: z
      .string()
      .trim()
      .min(1, 'Person name cannot be empty')
      .max(100, 'Person name cannot exceed 100 characters')
      .optional(),
    amount: z
      .number()
      .positive('Amount must be greater than zero')
      .max(100000000, 'Amount cannot exceed 100,000,000')
      .optional(),
    date: dateSchema.optional(),
    note: z
      .string()
      .trim()
      .max(500, 'Note cannot exceed 500 characters')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * Validation schema for recording a repayment
 */
export const recordRepaymentSchema = z.object({
  amount: z
    .number({
      required_error: 'Repayment amount is required',
      invalid_type_error: 'Repayment amount must be a number',
    })
    .positive('Repayment amount must be greater than zero')
    .max(100000000, 'Repayment amount cannot exceed 100,000,000'),
  date: dateSchema.optional(),
  note: z
    .string({
      invalid_type_error: 'Repayment note must be a string',
    })
    .trim()
    .max(500, 'Repayment note cannot exceed 500 characters')
    .optional(),
});

/**
 * Validation schema for lending ID route parameter
 */
export const lendingIdParamSchema = z.object({
  id: z
    .string({
      required_error: 'Lending ID is required',
    })
    .regex(objectIdRegex, 'Invalid lending ID format. Must be a 24-character hexadecimal ObjectId'),
});

/**
 * Query filter schema
 */
export const lendingQuerySchema = z.object({
  status: z.enum(LENDING_STATUSES).optional(),
  search: z.string().trim().optional(),
});
