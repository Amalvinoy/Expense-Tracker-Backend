import { Router } from 'express';
import { categoryController } from '../controllers/category.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  validateBody,
  validateParams,
} from '../middleware/validate.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from '../validators/category.validators.js';

export const categoryRouter = Router();

// Require authentication for all category endpoints
categoryRouter.use(requireAuth);

/**
 * GET /api/categories
 * Retrieve all accessible categories
 */
categoryRouter.get('/', categoryController.getCategories);

/**
 * GET /api/categories/:id
 * Retrieve a single category by ID
 */
categoryRouter.get(
  '/:id',
  validateParams(categoryIdParamSchema),
  categoryController.getCategoryById
);

/**
 * POST /api/categories
 * Create a new user-owned category
 */
categoryRouter.post(
  '/',
  validateBody(createCategorySchema),
  categoryController.createCategory
);

/**
 * PUT /api/categories/:id
 * Update an existing user-owned category
 */
categoryRouter.put(
  '/:id',
  validateParams(categoryIdParamSchema),
  validateBody(updateCategorySchema),
  categoryController.updateCategory
);

/**
 * DELETE /api/categories/:id
 * Delete an existing user-owned category
 */
categoryRouter.delete(
  '/:id',
  validateParams(categoryIdParamSchema),
  categoryController.deleteCategory
);
