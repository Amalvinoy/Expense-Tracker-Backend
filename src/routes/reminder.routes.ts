import { Router } from 'express';
import { reminderController } from '../controllers/reminder.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  validateBody,
  validateParams,
} from '../middleware/validate.middleware.js';
import {
  createReminderSchema,
  updateReminderSchema,
  toggleReminderSchema,
  reminderIdParamSchema,
} from '../validators/reminder.validators.js';

export const reminderRouter = Router();

// Protect all reminder routes with requireAuth
reminderRouter.use(requireAuth);

/**
 * GET /api/reminders - List user reminders
 */
reminderRouter.get(
  '/',
  reminderController.getReminders
);

/**
 * POST /api/reminders - Create reminder schedule
 */
reminderRouter.post(
  '/',
  validateBody(createReminderSchema),
  reminderController.createReminder
);

/**
 * POST /api/reminders/process - Trigger processing of due reminders
 */
reminderRouter.post(
  '/process',
  reminderController.processReminders
);

/**
 * GET /api/reminders/:id - Get single reminder
 */
reminderRouter.get(
  '/:id',
  validateParams(reminderIdParamSchema),
  reminderController.getReminderById
);

/**
 * PUT /api/reminders/:id - Update reminder schedule
 */
reminderRouter.put(
  '/:id',
  validateParams(reminderIdParamSchema),
  validateBody(updateReminderSchema),
  reminderController.updateReminder
);

/**
 * PATCH /api/reminders/:id/toggle - Toggle reminder enabled status
 */
reminderRouter.patch(
  '/:id/toggle',
  validateParams(reminderIdParamSchema),
  validateBody(toggleReminderSchema),
  reminderController.toggleReminder
);

/**
 * DELETE /api/reminders/:id - Delete reminder
 */
reminderRouter.delete(
  '/:id',
  validateParams(reminderIdParamSchema),
  reminderController.deleteReminder
);
