import { z } from 'zod';

const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Zod schema for creating a new custom category
 */
export const createCategorySchema = z
  .object({
    name: z
      .string({
        required_error: 'Category name is required',
        invalid_type_error: 'Category name must be a string',
      })
      .trim()
      .min(2, 'Category name must be at least 2 characters long')
      .max(50, 'Category name cannot exceed 50 characters'),
    icon: z
      .string({
        required_error: 'Category icon is required',
        invalid_type_error: 'Category icon must be a string',
      })
      .trim()
      .min(1, 'Category icon cannot be empty')
      .max(50, 'Category icon cannot exceed 50 characters'),
    color: z
      .string({
        required_error: 'Category color is required',
        invalid_type_error: 'Category color must be a string',
      })
      .trim()
      .regex(hexColorRegex, 'Category color must be a valid hex color code (e.g. #FF5733)'),
  })
  .strip(); // Strips unknown fields such as client-supplied userId or isDefault

/**
 * Zod schema for updating an existing category
 */
export const updateCategorySchema = z
  .object({
    name: z
      .string({ invalid_type_error: 'Category name must be a string' })
      .trim()
      .min(2, 'Category name must be at least 2 characters long')
      .max(50, 'Category name cannot exceed 50 characters')
      .optional(),
    icon: z
      .string({ invalid_type_error: 'Category icon must be a string' })
      .trim()
      .min(1, 'Category icon cannot be empty')
      .max(50, 'Category icon cannot exceed 50 characters')
      .optional(),
    color: z
      .string({ invalid_type_error: 'Category color must be a string' })
      .trim()
      .regex(hexColorRegex, 'Category color must be a valid hex color code (e.g. #FF5733)')
      .optional(),
    isActive: z
      .boolean({ invalid_type_error: 'isActive must be a boolean' })
      .optional(),
  })
  .strip()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided to update' }
  );

/**
 * Zod schema for category ID parameter validation
 */
export const categoryIdParamSchema = z.object({
  id: z
    .string({
      required_error: 'Category ID is required',
    })
    .regex(objectIdRegex, 'Invalid category ID format. Must be a 24-character hexadecimal ObjectId'),
});
