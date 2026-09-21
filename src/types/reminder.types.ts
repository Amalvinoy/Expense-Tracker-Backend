import { Types } from 'mongoose';

export const REMINDER_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type ReminderFrequency = (typeof REMINDER_FREQUENCIES)[number];

export const REMINDER_TYPES = [
  'DAILY_EXPENSE_REMINDER',
  'BUDGET_REVIEW',
  'MONTHLY_SUMMARY',
  'CUSTOM',
] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number];

/**
 * Domain entity representation of a Reminder
 */
export interface Reminder {
  id: string;
  userId: string;
  type: ReminderType;
  title: string;
  message?: string;
  enabled: boolean;
  time: string; // HH:mm format
  frequency: ReminderFrequency;
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  dayOfMonth?: number; // 1-31
  createdAt: string;
  updatedAt: string;
}

/**
 * Raw Mongoose Document interface
 */
export interface IReminderDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: ReminderType;
  title: string;
  message?: string;
  enabled: boolean;
  time: string;
  frequency: ReminderFrequency;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a reminder
 */
export interface CreateReminderInput {
  type: ReminderType;
  title: string;
  message?: string;
  enabled?: boolean;
  time: string; // HH:mm
  frequency: ReminderFrequency;
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

/**
 * Input for updating a reminder
 */
export interface UpdateReminderInput {
  type?: ReminderType;
  title?: string;
  message?: string;
  enabled?: boolean;
  time?: string;
  frequency?: ReminderFrequency;
  daysOfWeek?: number[];
  dayOfMonth?: number;
}
