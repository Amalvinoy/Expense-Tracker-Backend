import { Types } from 'mongoose';
import { NotificationModel } from '../../models/notification.model.js';
import {
  Notification,
  CreateNotificationInput,
  NotificationQueryFilters,
  NotificationListResponseData,
} from '../../types/notification.types.js';
import { NotFoundError } from '../../utils/errors.js';

function toNotification(doc: any): Notification {
  return {
    id: doc._id ? doc._id.toString() : doc.id || '',
    userId: doc.userId ? doc.userId.toString() : '',
    type: doc.type,
    title: doc.title,
    message: doc.message,
    data: doc.data,
    isRead: doc.isRead ?? false,
    readAt:
      doc.readAt instanceof Date
        ? doc.readAt.toISOString()
        : doc.readAt
        ? new Date(doc.readAt).toISOString()
        : null,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : new Date(doc.updatedAt).toISOString(),
  };
}

export const notificationService = {
  /**
   * Creates a notification for the authenticated user
   */
  async createNotification(
    userId: string,
    input: CreateNotificationInput
  ): Promise<Notification> {
    const doc = await NotificationModel.create({
      userId: new Types.ObjectId(userId),
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
      isRead: false,
    });

    return toNotification(doc);
  },

  /**
   * Retrieves paginated list of notifications for the user
   */
  async getNotifications(
    userId: string,
    filters: NotificationQueryFilters = {}
  ): Promise<NotificationListResponseData> {
    const query: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    };

    if (filters.isRead !== undefined) {
      query.isRead = filters.isRead;
    }

    if (filters.type) {
      query.type = filters.type;
    }

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const [docs, total, unreadCount] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments(query),
      NotificationModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      notifications: docs.map(toNotification),
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  /**
   * Returns count of unread notifications for the user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
  },

  /**
   * Retrieves a single notification by ID
   */
  async getNotificationById(
    userId: string,
    notificationId: string
  ): Promise<Notification> {
    const doc = await NotificationModel.findOne({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    }).lean();

    if (!doc) {
      throw new NotFoundError('Notification not found.');
    }

    return toNotification(doc);
  },

  /**
   * Marks a single notification as read
   */
  async markAsRead(
    userId: string,
    notificationId: string
  ): Promise<Notification> {
    const doc = await NotificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!doc) {
      throw new NotFoundError('Notification not found.');
    }

    return toNotification(doc);
  },

  /**
   * Marks all unread notifications of the user as read
   */
  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await NotificationModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return { updatedCount: result.modifiedCount };
  },

  /**
   * Deletes a notification by ID
   */
  async deleteNotification(
    userId: string,
    notificationId: string
  ): Promise<void> {
    const result = await NotificationModel.deleteOne({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundError('Notification not found.');
    }
  },

  /**
   * Helper to create budget alert notification with granular threshold deduplication check
   */
  async createBudgetAlertIfEligible(
    userId: string,
    alert: {
      budgetId: string;
      categoryName?: string;
      percentageUsed: number;
      amount: number;
      spent: number;
      year: number;
      month: number;
      threshold?: 80 | 90 | 100;
    }
  ): Promise<Notification | null> {
    const isExceeded = alert.threshold === 100 || alert.spent > alert.amount;
    const threshold = alert.threshold || (isExceeded ? 100 : 80);
    const type = isExceeded ? 'BUDGET_EXCEEDED' : 'BUDGET_WARNING';

    // Deduplication check: check if an alert for this budget, year, month, and threshold already exists
    const existing = await NotificationModel.findOne({
      userId: new Types.ObjectId(userId),
      type,
      'data.budgetId': alert.budgetId,
      'data.year': alert.year,
      'data.month': alert.month,
      'data.threshold': threshold,
    }).lean();

    if (existing) {
      return null;
    }

    const title = isExceeded
      ? `Budget Exceeded: ${alert.categoryName || 'Total Budget'}`
      : `Budget Warning (${threshold}%): ${alert.categoryName || 'Total Budget'}`;

    const message = isExceeded
      ? `You have spent ₹${alert.spent.toLocaleString()}, exceeding your budget of ₹${alert.amount.toLocaleString()}.`
      : `You have reached ${alert.percentageUsed}% of your ₹${alert.amount.toLocaleString()} budget.`;

    return this.createNotification(userId, {
      type,
      title,
      message,
      data: {
        budgetId: alert.budgetId,
        categoryName: alert.categoryName,
        percentageUsed: alert.percentageUsed,
        amount: alert.amount,
        spent: alert.spent,
        year: alert.year,
        month: alert.month,
        threshold,
      },
    });
  },
};
