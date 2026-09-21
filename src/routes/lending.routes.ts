import { Router } from 'express';
import { lendingController } from '../controllers/lending.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  validateBody,
  validateQuery,
  validateParams,
} from '../middleware/validate.middleware.js';
import {
  createLendingSchema,
  updateLendingSchema,
  recordRepaymentSchema,
  lendingIdParamSchema,
  lendingQuerySchema,
} from '../validators/lending.validators.js';

export const lendingRouter = Router();

// Protect all lending routes with requireAuth
lendingRouter.use(requireAuth);

/**
 * GET /api/lendings
 * List all lending records for user with optional status/search filters
 */
lendingRouter.get(
  '/',
  validateQuery(lendingQuerySchema),
  lendingController.getLendings
);

/**
 * GET /api/lendings/summary
 * Summary metrics (total lent, returned, outstanding) - registered before /:id
 */
lendingRouter.get('/summary', lendingController.getSummary);

/**
 * POST /api/lendings
 * Create a new lending record
 */
lendingRouter.post(
  '/',
  validateBody(createLendingSchema),
  lendingController.createLending
);

/**
 * GET /api/lendings/:id
 * Retrieve single lending record
 */
lendingRouter.get(
  '/:id',
  validateParams(lendingIdParamSchema),
  lendingController.getLendingById
);

/**
 * PUT /api/lendings/:id
 * Update lending details
 */
lendingRouter.put(
  '/:id',
  validateParams(lendingIdParamSchema),
  validateBody(updateLendingSchema),
  lendingController.updateLending
);

/**
 * DELETE /api/lendings/:id
 * Delete lending record
 */
lendingRouter.delete(
  '/:id',
  validateParams(lendingIdParamSchema),
  lendingController.deleteLending
);

/**
 * POST /api/lendings/:id/repayment
 * Record a partial or full repayment
 */
lendingRouter.post(
  '/:id/repayment',
  validateParams(lendingIdParamSchema),
  validateBody(recordRepaymentSchema),
  lendingController.recordRepayment
);
