import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Zod schema for creating or setting monthly income
 */
export const createIncomeSchema = z
  .object({
    year: z
      .number({
        required_error: 'Year is required',
        invalid_type_error: 'Year must be a number',
      })
      .int('Year must be an integer')
      .min(2000, 'Year must be 2000 or later')
      .max(2100, 'Year cannot exceed 2100'),
    month: z
      .number({
        required_error: 'Month is required',
        invalid_type_error: 'Month must be a number',
      })
      .int('Month must be an integer')
      .min(1, 'Month must be between 1 and 12')
      .max(12, 'Month must be between 1 and 12'),
    amount: z
      .number({
        required_error: 'Income amount is required',
        invalid_type_error: 'Income amount must be a number',
      })
      .positive('Income amount must be greater than zero')
      .max(100000000, 'Income amount cannot exceed 100,000,000'),
    source: z
      .string({ invalid_type_error: 'Source must be a string' })
      .trim()
      .max(100, 'Source cannot exceed 100 characters')
      .optional(),
    note: z
      .string({ invalid_type_error: 'Note must be a string' })
      .trim()
      .max(500, 'Note cannot exceed 500 characters')
      .optional(),
  })
  .strip();

/**
 * Zod schema for updating an existing income
 */
export const updateIncomeSchema = z
  .object({
    amount: z
      .number({
        invalid_type_error: 'Income amount must be a number',
      })
      .positive('Income amount must be greater than zero')
      .max(100000000, 'Income amount cannot exceed 100,000,000')
      .optional(),
    source: z
      .string({ invalid_type_error: 'Source must be a string' })
      .trim()
      .max(100, 'Source cannot exceed 100 characters')
      .optional(),
    note: z
      .string({ invalid_type_error: 'Note must be a string' })
      .trim()
      .max(500, 'Note cannot exceed 500 characters')
      .optional(),
  })
  .strip();

/**
 * Zod schema for route param :id
 */
export const incomeIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Income ID is required' })
    .regex(objectIdRegex, 'Invalid income ID format. Must be a 24-character hexadecimal ObjectId'),
});

/**
 * Zod schema for query filtering GET /api/income
 */
export const incomeQuerySchema = z.object({
  year: z.coerce
    .number({ invalid_type_error: 'Year must be a number' })
    .int('Year must be an integer')
    .min(2000, 'Year must be 2000 or later')
    .max(2100, 'Year cannot exceed 2100')
    .optional(),
  month: z.coerce
    .number({ invalid_type_error: 'Month must be a number' })
    .int('Month must be an integer')
    .min(1, 'Month must be between 1 and 12')
    .max(12, 'Month must be between 1 and 12')
    .optional(),
  monthStr: z.string().optional(),
});
