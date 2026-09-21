import { Request, Response, NextFunction } from 'express';
import { reminderService } from '../services/reminder/reminder.service.js';
import { reminderScheduler } from '../services/reminder/reminder.scheduler.js';
import { sendSuccess } from '../utils/response.js';
import { HttpStatus } from '../constants/http-status.js';
import { UnauthorizedError } from '../utils/errors.js';

export const reminderController = {
  /**
   * POST /api/reminders - Create reminder schedule
   */
  async createReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const reminder = await reminderService.createReminder(req.user.id, req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.CREATED,
        message: 'Reminder created successfully',
        data: { reminder },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/reminders - List user reminders
   */
  async getReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const reminders = await reminderService.getReminders(req.user.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Reminders retrieved successfully',
        data: { reminders },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/reminders/:id - Get single reminder
   */
  async getReminderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const reminder = await reminderService.getReminderById(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Reminder retrieved successfully',
        data: { reminder },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/reminders/:id - Update reminder schedule
   */
  async updateReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const reminder = await reminderService.updateReminder(req.user.id, req.params.id, req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Reminder updated successfully',
        data: { reminder },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/reminders/:id/toggle - Toggle reminder enabled state
   */
  async toggleReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const reminder = await reminderService.toggleReminder(
        req.user.id,
        req.params.id,
        req.body.enabled
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Reminder status updated successfully',
        data: { reminder },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/reminders/:id - Delete reminder
   */
  async deleteReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      await reminderService.deleteReminder(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Reminder deleted successfully',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/reminders/process - Trigger processing of due reminders
   */
  async processReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const refDate = req.body?.referenceDate ? new Date(req.body.referenceDate) : new Date();
      const result = await reminderScheduler.processDueReminders(refDate);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Due reminders processed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
};
