import { Types } from 'mongoose';

/**
 * Controlled, extensible notification types
 */
export const NOTIFICATION_TYPES = [
  'BUDGET_WARNING',
  'BUDGET_EXCEEDED',
  'DAILY_REMINDER',
  'MONTHLY_SUMMARY',
  'GENERAL',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Domain entity representation of a Notification
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Raw Mongoose Document interface
 */
export interface INotificationDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a notification
 */
export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * Query filter parameters for notifications
 */
export interface NotificationQueryFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
}

/**
 * Paginated response structure
 */
export interface NotificationListResponseData {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
