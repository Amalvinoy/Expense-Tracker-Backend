import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report/report.service.js';
import { ReportQueryInput } from '../validators/report.validators.js';
import { sendSuccess } from '../utils/response.js';
import { HttpStatus } from '../constants/http-status.js';
import { UnauthorizedError } from '../utils/errors.js';

export const reportController = {
  /**
   * GET /api/reports - Combined reports
   */
  async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }
      const userId = req.user.id;
      const filters = req.query as unknown as ReportQueryInput;

      const data = await reportService.getReports(userId, filters);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Reports retrieved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/reports/summary - Spending summary metrics
   */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }
      const userId = req.user.id;
      const filters = req.query as unknown as ReportQueryInput;

      const data = await reportService.getSummary(userId, filters);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Report summary retrieved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/reports/categories - Category spending breakdown
   */
  async getCategoryBreakdown(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }
      const userId = req.user.id;
      const filters = req.query as unknown as ReportQueryInput;

      const data = await reportService.getCategoryBreakdown(userId, filters);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Category breakdown retrieved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/reports/payment-methods - Payment method spending breakdown
   */
  async getPaymentMethodBreakdown(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }
      const userId = req.user.id;
      const filters = req.query as unknown as ReportQueryInput;

      const data = await reportService.getPaymentMethodBreakdown(userId, filters);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Payment method breakdown retrieved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/reports/monthly - Monthly spending trend
   */
  async getMonthlyTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }
      const userId = req.user.id;
      const filters = req.query as unknown as ReportQueryInput;

      const data = await reportService.getMonthlyTrend(userId, filters);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Monthly spending trend retrieved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/reports/daily - Daily spending trend
   */
  async getDailyTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }
      const userId = req.user.id;
      const filters = req.query as unknown as ReportQueryInput;

      const data = await reportService.getDailyTrend(userId, filters);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Daily spending trend retrieved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },
};
