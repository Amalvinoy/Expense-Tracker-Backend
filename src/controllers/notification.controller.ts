import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification/notification.service.js';
import { sendSuccess } from '../utils/response.js';
import { HttpStatus } from '../constants/http-status.js';
import { UnauthorizedError } from '../utils/errors.js';

export const notificationController = {
  /**
   * POST /api/notifications - Create notification
   */
  async createNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const notification = await notificationService.createNotification(req.user.id, req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.CREATED,
        message: 'Notification created successfully',
        data: { notification },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/notifications - List paginated notifications
   */
  async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const result = await notificationService.getNotifications(req.user.id, req.query as any);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Notifications retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/notifications/unread-count - Get total unread count
   */
  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const unreadCount = await notificationService.getUnreadCount(req.user.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Unread count retrieved successfully',
        data: { unreadCount },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/notifications/:id - Get single notification
   */
  async getNotificationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const notification = await notificationService.getNotificationById(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Notification retrieved successfully',
        data: { notification },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/notifications/:id/read - Mark notification as read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const notification = await notificationService.markAsRead(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Notification marked as read',
        data: { notification },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/notifications/read-all - Mark all unread notifications as read
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const result = await notificationService.markAllAsRead(req.user.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'All notifications marked as read',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/notifications/:id - Delete notification
   */
  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      await notificationService.deleteNotification(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Notification deleted successfully',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },
};
