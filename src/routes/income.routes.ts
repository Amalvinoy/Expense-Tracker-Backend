import { Router } from 'express';
import { incomeController } from '../controllers/income.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  validateBody,
  validateQuery,
  validateParams,
} from '../middleware/validate.middleware.js';
import {
  createIncomeSchema,
  updateIncomeSchema,
  incomeIdParamSchema,
  incomeQuerySchema,
} from '../validators/income.validators.js';

export const incomeRouter = Router();

// Require authentication for all income routes
incomeRouter.use(requireAuth);

/**
 * GET /api/income
 * List monthly income records with optional year/month query params
 */
incomeRouter.get(
  '/',
  validateQuery(incomeQuerySchema),
  incomeController.getIncomes
);

/**
 * POST /api/income
 * Create or save monthly income
 */
incomeRouter.post(
  '/',
  validateBody(createIncomeSchema),
  incomeController.createOrUpdateIncome
);

/**
 * GET /api/income/month/:year/:month
 * Get income for specific month (before /:id)
 */
incomeRouter.get(
  '/month/:year/:month',
  incomeController.getIncomeByMonth
);

/**
 * GET /api/income/:id
 * Retrieve single income record
 */
incomeRouter.get(
  '/:id',
  validateParams(incomeIdParamSchema),
  incomeController.getIncomeById
);

/**
 * PUT /api/income/:id
 * Update existing income record
 */
incomeRouter.put(
  '/:id',
  validateParams(incomeIdParamSchema),
  validateBody(updateIncomeSchema),
  incomeController.updateIncome
);

/**
 * DELETE /api/income/:id
 * Delete income record
 */
incomeRouter.delete(
  '/:id',
  validateParams(incomeIdParamSchema),
  incomeController.deleteIncome
);
