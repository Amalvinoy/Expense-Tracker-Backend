import { Request, Response, NextFunction } from 'express';
import { expenseService } from '../services/expense/expense.service.js';
import { sendSuccess } from '../utils/response.js';
import { HttpStatus } from '../constants/http-status.js';
import { UnauthorizedError } from '../utils/errors.js';

export const expenseController = {
  /**
   * POST /api/expenses
   * Create a new expense record
   */
  async createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const expense = await expenseService.createExpense(req.user.id, req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.CREATED,
        message: 'Expense created successfully',
        data: { expense },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/expenses
   * Retrieve filtered, paginated expenses for current user
   */
  async getExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const result = await expenseService.getExpenses(req.user.id, req.query as any);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Expenses retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/expenses/:id
   * Retrieve a single expense by ID
   */
  async getExpenseById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const expense = await expenseService.getExpenseById(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Expense retrieved successfully',
        data: { expense },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/expenses/:id
   * Update an existing expense
   */
  async updateExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const expense = await expenseService.updateExpense(
        req.user.id,
        req.params.id,
        req.body
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Expense updated successfully',
        data: { expense },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/expenses/:id
   * Delete an existing expense
   */
  async deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      await expenseService.deleteExpense(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Expense deleted successfully',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },
};
