import { z } from 'zod';
import { BUDGET_TYPES } from '../types/budget.types.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Zod schema for creating a new budget
 */
export const createBudgetSchema = z
  .object({
    type: z.enum(BUDGET_TYPES, {
      errorMap: () => ({ message: 'Budget type must be either TOTAL or CATEGORY' }),
    }),
    categoryId: z
      .string({ invalid_type_error: 'Category ID must be a string' })
      .regex(objectIdRegex, 'Invalid category ID format. Must be a 24-character hexadecimal ObjectId')
      .nullable()
      .optional(),
    amount: z
      .number({
        required_error: 'Budget amount is required',
        invalid_type_error: 'Budget amount must be a number',
      })
      .positive('Budget amount must be greater than zero')
      .max(100000000, 'Budget amount cannot exceed 100,000,000'),
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
  })
  .strip()
  .refine(
    (data) => {
      if (data.type === 'TOTAL') {
        return !data.categoryId;
      }
      if (data.type === 'CATEGORY') {
        return !!data.categoryId;
      }
      return true;
    },
    {
      message: 'Category ID must be omitted for TOTAL budget and is required for CATEGORY budget',
      path: ['categoryId'],
    }
  );

/**
 * Zod schema for updating a budget (only amount is modifiable)
 */
export const updateBudgetSchema = z
  .object({
    amount: z
      .number({
        required_error: 'Budget amount is required',
        invalid_type_error: 'Budget amount must be a number',
      })
      .positive('Budget amount must be greater than zero')
      .max(100000000, 'Budget amount cannot exceed 100,000,000'),
  })
  .strip();

/**
 * Zod schema for route param :id
 */
export const budgetIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Budget ID is required' })
    .regex(objectIdRegex, 'Invalid budget ID format. Must be a 24-character hexadecimal ObjectId'),
});

/**
 * Zod schema for query filtering GET /api/budgets
 */
export const budgetQuerySchema = z.object({
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
  type: z.enum(BUDGET_TYPES).optional(),
  categoryId: z.string().regex(objectIdRegex, 'Invalid categoryId filter format').optional(),
});

/**
 * Zod schema for query filtering GET /api/budgets/progress
 */
export const budgetProgressQuerySchema = z.object({
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
});
