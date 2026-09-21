import { z } from 'zod';
import {
  REMINDER_FREQUENCIES,
  REMINDER_TYPES,
} from '../types/reminder.types.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const reminderIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Reminder ID is required' })
    .trim()
    .regex(objectIdRegex, 'Invalid reminder ID format. Must be a 24-character hexadecimal ObjectId'),
});

export const createReminderSchema = z
  .object({
    type: z.enum(REMINDER_TYPES, {
      errorMap: () => ({
        message: `type must be one of: ${REMINDER_TYPES.join(', ')}`,
      }),
    }),
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title cannot exceed 100 characters'),
    message: z
      .string()
      .trim()
      .max(300, 'Message cannot exceed 300 characters')
      .optional(),
    enabled: z.boolean().default(true),
    time: z
      .string({ required_error: 'Time is required' })
      .trim()
      .regex(timeRegex, 'Time must be in 24-hour HH:mm format (e.g. 20:00)'),
    frequency: z.enum(REMINDER_FREQUENCIES, {
      errorMap: () => ({
        message: `frequency must be one of: ${REMINDER_FREQUENCIES.join(', ')}`,
      }),
    }),
    daysOfWeek: z
      .array(z.number().int().min(0, 'Day of week must be between 0 (Sunday) and 6 (Saturday)').max(6))
      .optional(),
    dayOfMonth: z
      .number()
      .int()
      .min(1, 'Day of month must be between 1 and 31')
      .max(31, 'Day of month must be between 1 and 31')
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === 'WEEKLY') {
      if (!data.daysOfWeek || data.daysOfWeek.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['daysOfWeek'],
          message: 'daysOfWeek is required for WEEKLY reminder and must contain at least one day (0-6)',
        });
      }
    }

    if (data.frequency === 'MONTHLY') {
      if (data.dayOfMonth === undefined || data.dayOfMonth === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dayOfMonth'],
          message: 'dayOfMonth is required for MONTHLY reminder and must be between 1 and 31',
        });
      }
    }
  });

export const updateReminderSchema = z
  .object({
    type: z
      .enum(REMINDER_TYPES, {
        errorMap: () => ({
          message: `type must be one of: ${REMINDER_TYPES.join(', ')}`,
        }),
      })
      .optional(),
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(100, 'Title cannot exceed 100 characters')
      .optional(),
    message: z
      .string()
      .trim()
      .max(300, 'Message cannot exceed 300 characters')
      .optional(),
    enabled: z.boolean().optional(),
    time: z
      .string()
      .trim()
      .regex(timeRegex, 'Time must be in 24-hour HH:mm format (e.g. 20:00)')
      .optional(),
    frequency: z
      .enum(REMINDER_FREQUENCIES, {
        errorMap: () => ({
          message: `frequency must be one of: ${REMINDER_FREQUENCIES.join(', ')}`,
        }),
      })
      .optional(),
    daysOfWeek: z
      .array(z.number().int().min(0).max(6))
      .optional(),
    dayOfMonth: z
      .number()
      .int()
      .min(1)
      .max(31)
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided to update' }
  )
  .superRefine((data, ctx) => {
    if (data.frequency === 'WEEKLY' && (!data.daysOfWeek || data.daysOfWeek.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['daysOfWeek'],
        message: 'daysOfWeek is required when setting frequency to WEEKLY',
      });
    }

    if (data.frequency === 'MONTHLY' && data.dayOfMonth === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dayOfMonth'],
        message: 'dayOfMonth is required when setting frequency to MONTHLY',
      });
    }
  });

export const toggleReminderSchema = z.object({
  enabled: z.boolean({ required_error: 'enabled boolean is required' }),
});

export type CreateReminderInputValidated = z.infer<typeof createReminderSchema>;
export type UpdateReminderInputValidated = z.infer<typeof updateReminderSchema>;
export type ToggleReminderInputValidated = z.infer<typeof toggleReminderSchema>;
