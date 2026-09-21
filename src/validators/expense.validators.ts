import { z } from 'zod';
import { PAYMENT_METHODS } from '../types/expense.types.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const paymentMethodSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    return val.trim().toUpperCase().replace(/\s+/g, '_');
  }
  return val;
}, z.enum(PAYMENT_METHODS, {
  errorMap: () => ({ message: 'Invalid payment method. Must be CASH, UPI, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, or OTHER' }),
}));

const dateSchema = z.string({
  required_error: 'Expense date is required',
  invalid_type_error: 'Date must be a valid date string',
}).refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date format. Must be an ISO-8601 date string (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)' }
);

/**
 * Validation schema for creating a new expense
 */
export const createExpenseSchema = z.object({
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be greater than zero')
    .max(100000000, 'Amount cannot exceed 100,000,000'),
  categoryId: z
    .string({
      required_error: 'Category ID is required',
      invalid_type_error: 'Category ID must be a string',
    })
    .regex(objectIdRegex, 'Invalid category ID format. Must be a 24-character hexadecimal ObjectId'),
  categoryNameSnapshot: z
    .string()
    .trim()
    .max(100, 'Category name snapshot cannot exceed 100 characters')
    .optional(),
  paymentMethod: paymentMethodSchema,
  note: z
    .string()
    .trim()
    .max(500, 'Note cannot exceed 500 characters')
    .optional(),
  date: dateSchema,
}).strip(); // Strips unknown fields (such as client-submitted userId)

/**
 * Validation schema for updating an existing expense
 */
export const updateExpenseSchema = z
  .object({
    amount: z
      .number({ invalid_type_error: 'Amount must be a number' })
      .positive('Amount must be greater than zero')
      .max(100000000, 'Amount cannot exceed 100,000,000')
      .optional(),
    categoryId: z
      .string({ invalid_type_error: 'Category ID must be a string' })
      .regex(objectIdRegex, 'Invalid category ID format. Must be a 24-character hexadecimal ObjectId')
      .optional(),
    categoryNameSnapshot: z
      .string()
      .trim()
      .max(100, 'Category name snapshot cannot exceed 100 characters')
      .optional(),
    paymentMethod: paymentMethodSchema.optional(),
    note: z
      .string()
      .trim()
      .max(500, 'Note cannot exceed 500 characters')
      .optional(),
    date: dateSchema.optional(),
  })
  .strip()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided to update' }
  );

/**
 * Validation schema for expense query parameters
 */
export const expenseQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: 'Page must be a number' })
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'Limit must be a number' })
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid startDate format',
    })
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid endDate format',
    })
    .optional(),
  categoryId: z
    .string()
    .regex(objectIdRegex, 'Invalid categoryId filter format')
    .optional(),
  paymentMethod: paymentMethodSchema.optional(),
  minAmount: z.coerce
    .number({ invalid_type_error: 'minAmount must be a number' })
    .min(0, 'minAmount must be non-negative')
    .optional(),
  maxAmount: z.coerce
    .number({ invalid_type_error: 'maxAmount must be a number' })
    .min(0, 'maxAmount must be non-negative')
    .optional(),
  search: z
    .string()
    .trim()
    .max(100, 'Search query cannot exceed 100 characters')
    .optional(),
  sortBy: z
    .enum(['date', 'amount', 'createdAt'], {
      errorMap: () => ({ message: 'sortBy must be one of: date, amount, createdAt' }),
    })
    .default('date'),
  sortOrder: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: 'sortOrder must be either "asc" or "desc"' }),
    })
    .default('desc'),
});

/**
 * Validation schema for route parameters with :id
 */
export const expenseIdParamSchema = z.object({
  id: z
    .string({
      required_error: 'Expense ID is required',
    })
    .regex(objectIdRegex, 'Invalid expense ID format. Must be a 24-character hexadecimal ObjectId'),
});
