import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateQuery } from '../middleware/validate.middleware.js';
import { reportQuerySchema } from '../validators/report.validators.js';

export const reportRouter = Router();

// Protect all report routes with requireAuth
reportRouter.use(requireAuth);

/**
 * GET /api/reports
 * Combined reports (summary, category breakdown, payment method breakdown, monthly & daily trends)
 */
reportRouter.get(
  '/',
  validateQuery(reportQuerySchema),
  reportController.getReports
);

/**
 * GET /api/reports/summary
 * Overall spending summary metrics
 */
reportRouter.get(
  '/summary',
  validateQuery(reportQuerySchema),
  reportController.getSummary
);

/**
 * GET /api/reports/categories
 * Category spending breakdown
 */
reportRouter.get(
  '/categories',
  validateQuery(reportQuerySchema),
  reportController.getCategoryBreakdown
);

/**
 * GET /api/reports/payment-methods
 * Payment method spending breakdown
 */
reportRouter.get(
  '/payment-methods',
  validateQuery(reportQuerySchema),
  reportController.getPaymentMethodBreakdown
);

/**
 * GET /api/reports/monthly
 * Monthly spending trend
 */
reportRouter.get(
  '/monthly',
  validateQuery(reportQuerySchema),
  reportController.getMonthlyTrend
);

/**
 * GET /api/reports/daily
 * Daily spending trend
 */
reportRouter.get(
  '/daily',
  validateQuery(reportQuerySchema),
  reportController.getDailyTrend
);
