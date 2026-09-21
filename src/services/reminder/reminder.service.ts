import { Types } from 'mongoose';
import { ReminderModel } from '../../models/reminder.model.js';
import {
  Reminder,
  CreateReminderInput,
  UpdateReminderInput,
} from '../../types/reminder.types.js';
import { NotFoundError } from '../../utils/errors.js';

function toReminder(doc: any): Reminder {
  return {
    id: doc._id ? doc._id.toString() : doc.id || '',
    userId: doc.userId ? doc.userId.toString() : '',
    type: doc.type,
    title: doc.title,
    message: doc.message,
    enabled: doc.enabled ?? true,
    time: doc.time,
    frequency: doc.frequency,
    daysOfWeek: doc.daysOfWeek,
    dayOfMonth: doc.dayOfMonth,
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

export const reminderService = {
  /**
   * Creates a new reminder schedule for the authenticated user
   */
  async createReminder(
    userId: string,
    input: CreateReminderInput
  ): Promise<Reminder> {
    const doc = await ReminderModel.create({
      userId: new Types.ObjectId(userId),
      type: input.type,
      title: input.title,
      message: input.message,
      enabled: input.enabled ?? true,
      time: input.time,
      frequency: input.frequency,
      daysOfWeek: input.frequency === 'WEEKLY' ? input.daysOfWeek : undefined,
      dayOfMonth: input.frequency === 'MONTHLY' ? input.dayOfMonth : undefined,
    });

    return toReminder(doc);
  },

  /**
   * Retrieves all reminders for the authenticated user
   */
  async getReminders(userId: string): Promise<Reminder[]> {
    const docs = await ReminderModel.find({
      userId: new Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .lean();

    return docs.map(toReminder);
  },

  /**
   * Retrieves a single reminder by ID
   */
  async getReminderById(userId: string, reminderId: string): Promise<Reminder> {
    const doc = await ReminderModel.findOne({
      _id: new Types.ObjectId(reminderId),
      userId: new Types.ObjectId(userId),
    }).lean();

    if (!doc) {
      throw new NotFoundError('Reminder not found.');
    }

    return toReminder(doc);
  },

  /**
   * Updates an existing reminder
   */
  async updateReminder(
    userId: string,
    reminderId: string,
    input: UpdateReminderInput
  ): Promise<Reminder> {
    const updateData: Record<string, any> = {};

    if (input.type !== undefined) updateData.type = input.type;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.message !== undefined) updateData.message = input.message;
    if (input.enabled !== undefined) updateData.enabled = input.enabled;
    if (input.time !== undefined) updateData.time = input.time;
    if (input.frequency !== undefined) updateData.frequency = input.frequency;
    if (input.daysOfWeek !== undefined) updateData.daysOfWeek = input.daysOfWeek;
    if (input.dayOfMonth !== undefined) updateData.dayOfMonth = input.dayOfMonth;

    const doc = await ReminderModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(reminderId),
        userId: new Types.ObjectId(userId),
      },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!doc) {
      throw new NotFoundError('Reminder not found.');
    }

    return toReminder(doc);
  },

  /**
   * Toggles the enabled state of a reminder
   */
  async toggleReminder(
    userId: string,
    reminderId: string,
    enabled: boolean
  ): Promise<Reminder> {
    const doc = await ReminderModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(reminderId),
        userId: new Types.ObjectId(userId),
      },
      { $set: { enabled } },
      { new: true }
    ).lean();

    if (!doc) {
      throw new NotFoundError('Reminder not found.');
    }

    return toReminder(doc);
  },

  /**
   * Deletes a reminder by ID
   */
  async deleteReminder(userId: string, reminderId: string): Promise<void> {
    const result = await ReminderModel.deleteOne({
      _id: new Types.ObjectId(reminderId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundError('Reminder not found.');
    }
  },
};
