import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth/auth.service.js';
import { sendSuccess } from '../utils/response.js';
import { HttpStatus } from '../constants/http-status.js';
import { UnauthorizedError } from '../utils/errors.js';

export const authController = {
  /**
   * POST /api/auth/register
   * Create a new user account
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.CREATED,
        message: 'Registration successful',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/login
   * Authenticate user credentials
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Login successful',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/auth/me
   * Get current authenticated user details
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const user = await authService.getMe(req.user.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'User retrieved successfully',
        data: {
          user,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/logout
   * Stateless token logout confirmation
   */
  logout(_req: Request, res: Response): void {
    sendSuccess({
      res,
      statusCode: HttpStatus.OK,
      message: 'Logout successful',
      data: null,
    });
  },
};
