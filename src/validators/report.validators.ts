import { z } from 'zod';
import { PAYMENT_METHODS } from '../types/expense.types.js';

// Sensible maximum allowed report query span (731 days = ~2 years)
export const MAX_REPORT_RANGE_DAYS = 731;

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Validates date string in either ISO 8601 or YYYY-MM-DD format
 */
const dateStringSchema = z
  .string({ invalid_type_error: 'Date must be a string' })
  .trim()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format. Must be an ISO-8601 or YYYY-MM-DD date string',
  });

/**
 * Query schema for report endpoints
 */
export const reportQuerySchema = z
  .object({
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    categoryId: z
      .string()
      .trim()
      .regex(objectIdRegex, 'categoryId must be a valid 24-character hexadecimal ObjectId')
      .optional(),
    paymentMethod: z
      .enum(PAYMENT_METHODS, {
        errorMap: () => ({
          message: `paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`,
        }),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);

      if (start > end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startDate'],
          message: 'startDate cannot be later than endDate',
        });
        return;
      }

      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays > MAX_REPORT_RANGE_DAYS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: `Date range cannot exceed ${MAX_REPORT_RANGE_DAYS} days (~2 years)`,
        });
      }
    }
  });

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
