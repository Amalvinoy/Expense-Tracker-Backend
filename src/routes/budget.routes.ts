import { Router } from 'express';
import { budgetController } from '../controllers/budget.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  validateBody,
  validateQuery,
  validateParams,
} from '../middleware/validate.middleware.js';
import {
  createBudgetSchema,
  updateBudgetSchema,
  budgetIdParamSchema,
  budgetQuerySchema,
  budgetProgressQuerySchema,
} from '../validators/budget.validators.js';

export const budgetRouter = Router();

// Protect all budget routes with requireAuth
budgetRouter.use(requireAuth);

/**
 * POST /api/budgets
 * Create a new budget
 */
budgetRouter.post(
  '/',
  validateBody(createBudgetSchema),
  budgetController.createBudget
);

/**
 * GET /api/budgets
 * Retrieve list of budgets with optional query filters
 */
budgetRouter.get(
  '/',
  validateQuery(budgetQuerySchema),
  budgetController.getBudgets
);

/**
 * GET /api/budgets/current
 * Retrieve current month's budget summary (registered before /:id)
 */
budgetRouter.get('/current', budgetController.getCurrentBudget);

/**
 * GET /api/budgets/progress
 * Retrieve detailed budget progress with spending metrics (registered before /:id)
 */
budgetRouter.get(
  '/progress',
  validateQuery(budgetProgressQuerySchema),
  budgetController.getBudgetProgress
);

/**
 * GET /api/budgets/:id
 * Retrieve single budget by ID
 */
budgetRouter.get(
  '/:id',
  validateParams(budgetIdParamSchema),
  budgetController.getBudgetById
);

/**
 * PUT /api/budgets/:id
 * Update an existing budget amount
 */
budgetRouter.put(
  '/:id',
  validateParams(budgetIdParamSchema),
  validateBody(updateBudgetSchema),
  budgetController.updateBudget
);

/**
 * DELETE /api/budgets/:id
 * Delete an existing budget
 */
budgetRouter.delete(
  '/:id',
  validateParams(budgetIdParamSchema),
  budgetController.deleteBudget
);
