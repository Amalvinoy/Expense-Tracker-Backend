import { ReminderModel } from '../../models/reminder.model.js';
import { UserModel } from '../../models/user.model.js';
import { NotificationModel } from '../../models/notification.model.js';
import { notificationService } from '../notification/notification.service.js';
import { NotificationType } from '../../types/notification.types.js';

interface LocalTimeComponents {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  time: string; // HH:mm
}

/**
 * Extracts local calendar and clock components in the specified timezone
 */
export function getLocalComponents(date: Date, timeZone: string): LocalTimeComponents {
  const safeTz = timeZone || 'Asia/Kolkata';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  let hour = parseInt(partMap.hour, 10);
  if (hour === 24) hour = 0; // Fix edge cases in some Intl runtimes
  const minute = parseInt(partMap.minute, 10);
  const dayOfWeek = weekdayMap[partMap.weekday] ?? 0;
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return { year, month, day, dayOfWeek, time };
}

/**
 * Calculates number of days in a given year and month (1-12)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export const reminderScheduler = {
  /**
   * Processes all active reminders, evaluates due schedules against the user's timezone,
   * and creates idempotent notifications without duplication.
   */
  async processDueReminders(referenceDate = new Date()): Promise<{
    processedReminders: number;
    createdNotifications: number;
  }> {
    const reminders = await ReminderModel.find({ enabled: true }).lean();
    let createdNotifications = 0;

    // Cache user timezones to avoid redundant DB lookups
    const userTimezoneCache = new Map<string, string>();

    for (const reminder of reminders) {
      if (!reminder.userId) {
        continue;
      }
      const userIdStr = reminder.userId.toString();
      let tz = userTimezoneCache.get(userIdStr);

      if (!tz) {
        const user = await UserModel.findById(reminder.userId).select('timezone').lean();
        tz = user?.timezone || 'Asia/Kolkata';
        userTimezoneCache.set(userIdStr, tz);
      }

      const safeTz = tz || 'Asia/Kolkata';
      const local = getLocalComponents(referenceDate, safeTz);

      // Check if current local time is at or past reminder scheduled time
      if (local.time < reminder.time) {
        continue;
      }

      let isDue = false;
      let scheduledPeriod = '';

      if (reminder.frequency === 'DAILY') {
        isDue = true;
        scheduledPeriod = `${reminder._id}_DAILY_${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
      } else if (reminder.frequency === 'WEEKLY') {
        if (reminder.daysOfWeek && reminder.daysOfWeek.includes(local.dayOfWeek)) {
          isDue = true;
          scheduledPeriod = `${reminder._id}_WEEKLY_${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
        }
      } else if (reminder.frequency === 'MONTHLY') {
        const maxDays = getDaysInMonth(local.year, local.month);
        const targetDay = Math.min(reminder.dayOfMonth || 1, maxDays);
        if (local.day === targetDay) {
          isDue = true;
          scheduledPeriod = `${reminder._id}_MONTHLY_${local.year}-${String(local.month).padStart(2, '0')}`;
        }
      }

      if (!isDue || !scheduledPeriod) {
        continue;
      }

      // Phase 8: Strict Deduplication Check
      const existing = await NotificationModel.findOne({
        userId: reminder.userId,
        'data.scheduledPeriod': scheduledPeriod,
      }).lean();

      if (existing) {
        continue; // Already dispatched for this scheduled period
      }

      // Map reminder type to notification type
      let notifType: NotificationType = 'DAILY_REMINDER';
      if (reminder.type === 'MONTHLY_SUMMARY') {
        notifType = 'MONTHLY_SUMMARY';
      } else if (reminder.type === 'BUDGET_REVIEW') {
        notifType = 'BUDGET_WARNING';
      } else if (reminder.type === 'CUSTOM') {
        notifType = 'GENERAL';
      }

      await notificationService.createNotification(userIdStr, {
        type: notifType,
        title: reminder.title,
        message: reminder.message || 'You have a scheduled expense reminder.',
        data: {
          reminderId: reminder._id.toString(),
          scheduledPeriod,
          frequency: reminder.frequency,
          scheduledTime: reminder.time,
        },
      });

      createdNotifications++;
    }

    return {
      processedReminders: reminders.length,
      createdNotifications,
    };
  },
};
