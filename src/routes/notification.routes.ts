import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  validateBody,
  validateQuery,
  validateParams,
} from '../middleware/validate.middleware.js';
import {
  notificationQuerySchema,
  notificationIdParamSchema,
  createNotificationSchema,
} from '../validators/notification.validators.js';

export const notificationRouter = Router();

// Protect all notification routes with requireAuth
notificationRouter.use(requireAuth);

/**
 * GET /api/notifications - List paginated notifications
 */
notificationRouter.get(
  '/',
  validateQuery(notificationQuerySchema),
  notificationController.getNotifications
);

/**
 * POST /api/notifications - Create notification
 */
notificationRouter.post(
  '/',
  validateBody(createNotificationSchema),
  notificationController.createNotification
);

/**
 * GET /api/notifications/unread-count - Get unread count (registered before /:id)
 */
notificationRouter.get(
  '/unread-count',
  notificationController.getUnreadCount
);

/**
 * PATCH /api/notifications/read-all - Mark all unread as read (registered before /:id)
 */
notificationRouter.patch(
  '/read-all',
  notificationController.markAllAsRead
);

/**
 * GET /api/notifications/:id - Get single notification
 */
notificationRouter.get(
  '/:id',
  validateParams(notificationIdParamSchema),
  notificationController.getNotificationById
);

/**
 * PATCH /api/notifications/:id/read - Mark notification as read
 */
notificationRouter.patch(
  '/:id/read',
  validateParams(notificationIdParamSchema),
  notificationController.markAsRead
);

/**
 * DELETE /api/notifications/:id - Delete notification
 */
notificationRouter.delete(
  '/:id',
  validateParams(notificationIdParamSchema),
  notificationController.deleteNotification
);
