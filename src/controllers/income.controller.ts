import { Request, Response, NextFunction } from 'express';
import { incomeService } from '../services/income/income.service.js';
import { sendSuccess } from '../utils/response.js';
import { HttpStatus } from '../constants/http-status.js';
import { UnauthorizedError } from '../utils/errors.js';

export const incomeController = {
  /**
   * GET /api/income
   * Retrieve income records for authenticated user with optional year/month filters
   */
  async getIncomes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      let year: number | undefined;
      let month: number | undefined;

      if (req.query.year) {
        year = parseInt(req.query.year as string, 10);
      }
      if (req.query.month) {
        month = parseInt(req.query.month as string, 10);
      }
      if (req.query.monthStr && typeof req.query.monthStr === 'string') {
        const parts = (req.query.monthStr as string).split('-');
        if (parts.length === 2) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
        }
      }

      const incomes = await incomeService.getIncomes(req.user.id, { year, month });

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Income records retrieved successfully',
        data: { incomes },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/income/month/:year/:month
   * Retrieve income for a specific month
   */
  async getIncomeByMonth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const year = parseInt(req.params.year, 10);
      const month = parseInt(req.params.month, 10);

      const income = await incomeService.getIncomeByMonth(req.user.id, year, month);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Monthly income retrieved successfully',
        data: { income },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/income/:id
   * Retrieve a single income record by ID
   */
  async getIncomeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const income = await incomeService.getIncomeById(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Income record retrieved successfully',
        data: { income },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/income
   * Create or update monthly income
   */
  async createOrUpdateIncome(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const income = await incomeService.createOrUpdateIncome(req.user.id, req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.CREATED,
        message: 'Monthly income saved successfully',
        data: { income },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/income/:id
   * Update an existing income record
   */
  async updateIncome(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const income = await incomeService.updateIncome(req.user.id, req.params.id, req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Income record updated successfully',
        data: { income },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/income/:id
   * Delete an income record
   */
  async deleteIncome(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      await incomeService.deleteIncome(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Income record deleted successfully',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },
};
