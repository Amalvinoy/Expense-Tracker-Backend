import { Request, Response, NextFunction } from 'express';
import { lendingService } from '../services/lending/lending.service.js';
import { sendSuccess } from '../utils/response.js';
import { HttpStatus } from '../constants/http-status.js';
import { UnauthorizedError } from '../utils/errors.js';

export const lendingController = {
  /**
   * GET /api/lendings
   * Retrieve list of lendings and summary for authenticated user
   */
  async getLendings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const { lendings, summary } = await lendingService.getLendings(
        req.user.id,
        req.query as { status?: string; search?: string }
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Lending records retrieved successfully',
        data: { lendings, summary },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/lendings/summary
   * Retrieve lending summary metrics
   */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const summary = await lendingService.getSummary(req.user.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Lending summary retrieved successfully',
        data: { summary },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/lendings/:id
   * Retrieve single lending record by ID
   */
  async getLendingById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const lending = await lendingService.getLendingById(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Lending record retrieved successfully',
        data: { lending },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/lendings
   * Create a new lending record
   */
  async createLending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const lending = await lendingService.createLending(req.user.id, req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.CREATED,
        message: 'Lending record created successfully',
        data: { lending },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/lendings/:id
   * Update an existing lending record
   */
  async updateLending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const lending = await lendingService.updateLending(req.user.id, req.params.id, req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Lending record updated successfully',
        data: { lending },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/lendings/:id
   * Delete a lending record
   */
  async deleteLending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      await lendingService.deleteLending(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Lending record deleted successfully',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/lendings/:id/repayment
   * Record a repayment against a lending record
   */
  async recordRepayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const lending = await lendingService.recordRepayment(req.user.id, req.params.id, req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Repayment recorded successfully',
        data: { lending },
      });
    } catch (err) {
      next(err);
    }
  },
};
