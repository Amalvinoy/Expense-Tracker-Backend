import { Router } from 'express';
import { expenseController } from '../controllers/expense.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  validateBody,
  validateQuery,
  validateParams,
} from '../middleware/validate.middleware.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseQuerySchema,
  expenseIdParamSchema,
} from '../validators/expense.validators.js';

export const expenseRouter = Router();

// Protect all expense routes with requireAuth
expenseRouter.use(requireAuth);

/**
 * POST /api/expenses
 * Create a new expense record
 */
expenseRouter.post(
  '/',
  validateBody(createExpenseSchema),
  expenseController.createExpense
);

/**
 * GET /api/expenses
 * Retrieve paginated, filtered expenses
 */
expenseRouter.get(
  '/',
  validateQuery(expenseQuerySchema),
  expenseController.getExpenses
);

/**
 * GET /api/expenses/:id
 * Retrieve a single expense by ID
 */
expenseRouter.get(
  '/:id',
  validateParams(expenseIdParamSchema),
  expenseController.getExpenseById
);

/**
 * PUT /api/expenses/:id
 * Update an existing expense by ID
 */
expenseRouter.put(
  '/:id',
  validateParams(expenseIdParamSchema),
  validateBody(updateExpenseSchema),
  expenseController.updateExpense
);

/**
 * DELETE /api/expenses/:id
 * Delete an existing expense by ID
 */
expenseRouter.delete(
  '/:id',
  validateParams(expenseIdParamSchema),
  expenseController.deleteExpense
);
