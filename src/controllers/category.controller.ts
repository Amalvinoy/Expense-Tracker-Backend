import { Request, Response, NextFunction } from 'express';
import { categoryService } from '../services/category/category.service.js';
import { sendSuccess } from '../utils/response.js';
import { HttpStatus } from '../constants/http-status.js';
import { UnauthorizedError } from '../utils/errors.js';

export const categoryController = {
  /**
   * GET /api/categories
   * Retrieve all categories accessible to the user
   */
  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const result = await categoryService.getCategories(req.user.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Categories retrieved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/categories/:id
   * Retrieve a single category by ID
   */
  async getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const category = await categoryService.getCategoryById(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Category retrieved successfully',
        data: { category },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/categories
   * Create a new user-owned category
   */
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const category = await categoryService.createCategory(req.user.id, req.body);

      sendSuccess({
        res,
        statusCode: HttpStatus.CREATED,
        message: 'Category created successfully',
        data: { category },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/categories/:id
   * Update an existing user-owned category
   */
  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      const category = await categoryService.updateCategory(
        req.user.id,
        req.params.id,
        req.body
      );

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Category updated successfully',
        data: { category },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/categories/:id
   * Delete an existing user-owned category (soft-delete if unused)
   */
  async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required.');
      }

      await categoryService.deleteCategory(req.user.id, req.params.id);

      sendSuccess({
        res,
        statusCode: HttpStatus.OK,
        message: 'Category deleted successfully',
        data: null,
      });
    } catch (err) {
      next(err);
    }
  },
};
