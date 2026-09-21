import { z } from 'zod';
import { NOTIFICATION_TYPES } from '../types/notification.types.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const notificationIdParamSchema = z.object({
  id: z
    .string({ required_error: 'Notification ID is required' })
    .trim()
    .regex(objectIdRegex, 'Invalid notification ID format. Must be a 24-character hexadecimal ObjectId'),
});

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive('Page must be a positive integer').default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Limit cannot exceed 100').default(20),
  isRead: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  type: z
    .enum(NOTIFICATION_TYPES, {
      errorMap: () => ({
        message: `type must be one of: ${NOTIFICATION_TYPES.join(', ')}`,
      }),
    })
    .optional(),
});

export const createNotificationSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES, {
    errorMap: () => ({
      message: `type must be one of: ${NOTIFICATION_TYPES.join(', ')}`,
    }),
  }),
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(120, 'Title cannot exceed 120 characters'),
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message cannot exceed 500 characters'),
  data: z.record(z.any()).optional(),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type CreateNotificationInputValidated = z.infer<typeof createNotificationSchema>;
