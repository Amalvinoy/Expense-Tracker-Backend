import { Request, Response, NextFunction } from 'express';
import { budgetService } from '../services/budget/budget.service.js';
import { sendSuccess } from '../utils/response.js';
import { HttpStatus } from '../constants/http-status.js';
import { UnauthorizedError } from '../utils/errors.js';

export const budgetController = {
  /**
   * POST /api/budgets
   * Create a new monthly budget (TOTAL or CATEGORY)
   */
  async createBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const budget = await budgetService.createBudget(req.user.id, req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.CREATED,
        message: 'Budget created successfully',
        data: { budget },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/budgets
   * Retrieve list of budgets for the authenticated user
   */
  async getBudgets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const result = await budgetService.getBudgets(req.user.id, req.query as any);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Budgets retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/budgets/current
   * Retrieve current month's budget summary
   */
  async getCurrentBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const result = await budgetService.getCurrentBudget(req.user.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Current budget retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/budgets/progress
   * Retrieve detailed budget progress with dynamic spending aggregation
   */
  async getBudgetProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const { year, month } = req.query as any;
      const result = await budgetService.getBudgetProgress(req.user.id, year, month);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Budget progress retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/budgets/:id
   * Retrieve single budget by ID
   */
  async getBudgetById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const budget = await budgetService.getBudgetById(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Budget retrieved successfully',
        data: { budget },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/budgets/:id
   * Update an existing budget amount
   */
  async updateBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const budget = await budgetService.updateBudget(req.user.id, req.params.id, req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Budget updated successfully',
        data: { budget },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/budgets/:id
   * Delete an existing budget
   */
  async deleteBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      await budgetService.deleteBudget(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Budget deleted successfully',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },
};
