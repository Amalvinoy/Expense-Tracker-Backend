import mongoose, { Schema, Model } from 'mongoose';
import {
  IReminderDocument,
  REMINDER_FREQUENCIES,
  REMINDER_TYPES,
} from '../types/reminder.types.js';

const reminderSchema = new Schema<IReminderDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: REMINDER_TYPES,
        message: '{VALUE} is not a supported reminder type',
      },
      required: [true, 'Reminder type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title cannot be empty'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    message: {
      type: String,
      trim: true,
      maxlength: [300, 'Message cannot exceed 300 characters'],
      default: undefined,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    time: {
      type: String,
      required: [true, 'Time is required (HH:mm)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in 24-hour HH:mm format (e.g. 20:00)'],
    },
    frequency: {
      type: String,
      enum: {
        values: REMINDER_FREQUENCIES,
        message: '{VALUE} is not a supported reminder frequency',
      },
      required: [true, 'Frequency is required'],
    },
    daysOfWeek: {
      type: [Number],
      default: undefined,
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : '';
        if (ret.userId && typeof ret.userId === 'object') {
          ret.userId = ret.userId.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

reminderSchema.index({ userId: 1, enabled: 1 });
reminderSchema.index({ userId: 1, type: 1 });

export const ReminderModel: Model<IReminderDocument> =
  mongoose.models.Reminder ||
  mongoose.model<IReminderDocument>('Reminder', reminderSchema);
