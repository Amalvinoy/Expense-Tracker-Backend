import { Types } from 'mongoose';
import { CategoryModel } from '../../models/category.model.js';
import { ExpenseModel } from '../../models/expense.model.js';
import { DEFAULT_CATEGORIES } from '../../constants/default-categories.js';
import {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryListResponseData,
} from '../../types/category.types.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

/**
 * Maps a Mongoose document or lean record to the safe domain Category interface
 */
function toCategory(doc: any): Category {
  return {
    id: doc._id ? doc._id.toString() : doc.id || '',
    userId: doc.userId ? doc.userId.toString() : null,
    name: doc.name,
    icon: doc.icon,
    color: doc.color,
    isDefault: doc.isDefault ?? false,
    isActive: doc.isActive ?? true,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : new Date(doc.updatedAt).toISOString(),
  };
}

export const categoryService = {
  /**
   * Ensures that system default categories exist in MongoDB upon application startup
   */
  async ensureDefaultCategories(): Promise<void> {
    try {
      let seededCount = 0;
      for (const def of DEFAULT_CATEGORIES) {
        const existing = await CategoryModel.findOne({
          userId: null,
          name: def.name,
        });

        if (!existing) {
          await CategoryModel.create({
            userId: null,
            name: def.name,
            icon: def.icon,
            color: def.color,
            isDefault: true,
            isActive: true,
          });
          seededCount++;
        }
      }

      if (seededCount > 0) {
        logger.info(`Seeded ${seededCount} system default categories into MongoDB.`);
      }
    } catch (error) {
      logger.error('Failed to ensure default categories in MongoDB:', { error });
    }
  },

  /**
   * Retrieves all active categories accessible to the user (all default + user's own)
   * Ordered by system default categories first, then user categories alphabetically.
   */
  async getCategories(userId: string): Promise<CategoryListResponseData> {
    const docs = await CategoryModel.find({
      $or: [
        { userId: null, isActive: true },
        { userId: new Types.ObjectId(userId), isActive: true },
      ],
    })
      .sort({ isDefault: -1, name: 1 })
      .lean();

    return {
      categories: docs.map(toCategory),
    };
  },

  /**
   * Retrieves a single category by ID, verifying it is either system-owned or owned by user
   */
  async getCategoryById(userId: string, categoryId: string): Promise<Category> {
    const doc = await CategoryModel.findById(categoryId).lean();

    if (!doc || !doc.isActive) {
      throw new NotFoundError('Category not found.');
    }

    // If it is a custom category, check user ownership
    if (doc.userId !== null && doc.userId.toString() !== userId) {
      throw new NotFoundError('Category not found.');
    }

    return toCategory(doc);
  },

  /**
   * Creates a new custom category for the authenticated user
   */
  async createCategory(
    userId: string,
    input: CreateCategoryInput
  ): Promise<Category> {
    const normalizedName = input.name.trim();
    const escaped = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Case-insensitive duplicate check among system categories and this user's active categories
    const existing = await CategoryModel.findOne({
      $or: [{ userId: null }, { userId: new Types.ObjectId(userId) }],
      name: { $regex: new RegExp(`^${escaped}$`, 'i') },
      isActive: true,
    });

    if (existing) {
      throw new ConflictError('A category with this name already exists.');
    }

    const created = await CategoryModel.create({
      userId: new Types.ObjectId(userId),
      name: normalizedName,
      icon: input.icon.trim(),
      color: input.color.trim(),
      isDefault: false,
      isActive: true,
    });

    return toCategory(created);
  },

  /**
   * Updates an existing user-owned category (default categories cannot be updated)
   */
  async updateCategory(
    userId: string,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<Category> {
    const category = await CategoryModel.findById(categoryId);

    if (!category || !category.isActive) {
      throw new NotFoundError('Category not found.');
    }

    // Default categories cannot be modified by users
    if (category.isDefault || category.userId === null) {
      throw new BadRequestError('System default categories cannot be modified.');
    }

    // Enforce ownership
    if (category.userId.toString() !== userId) {
      throw new NotFoundError('Category not found.');
    }

    // Check duplicate name if name is changing
    if (input.name && input.name.trim().toLowerCase() !== category.name.toLowerCase()) {
      const normalizedName = input.name.trim();
      const escaped = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const duplicate = await CategoryModel.findOne({
        _id: { $ne: category._id },
        $or: [{ userId: null }, { userId: new Types.ObjectId(userId) }],
        name: { $regex: new RegExp(`^${escaped}$`, 'i') },
        isActive: true,
      });

      if (duplicate) {
        throw new ConflictError('A category with this name already exists.');
      }

      category.name = normalizedName;
    }

    if (input.icon !== undefined) {
      category.icon = input.icon.trim();
    }
    if (input.color !== undefined) {
      category.color = input.color.trim();
    }
    if (input.isActive !== undefined) {
      category.isActive = input.isActive;
    }

    await category.save();

    return toCategory(category);
  },

  /**
   * Deletes a category:
   * - System categories cannot be deleted
   * - Categories referenced by any expenses cannot be deleted (409 Conflict)
   * - Unused user categories are soft-deleted (isActive = false)
   */
  async deleteCategory(userId: string, categoryId: string): Promise<void> {
    const category = await CategoryModel.findById(categoryId);

    if (!category || !category.isActive) {
      throw new NotFoundError('Category not found.');
    }

    // System default categories cannot be deleted
    if (category.isDefault || category.userId === null) {
      throw new BadRequestError('System default categories cannot be deleted.');
    }

    // Enforce ownership
    if (category.userId.toString() !== userId) {
      throw new NotFoundError('Category not found.');
    }

    // Check whether the category is referenced by any expenses
    const expenseCount = await ExpenseModel.countDocuments({
      categoryId: category._id,
    });

    if (expenseCount > 0) {
      throw new ConflictError(
        'Category cannot be deleted because it is used by existing expenses.'
      );
    }

    // Soft-delete strategy: set isActive to false to preserve historical integrity
    category.isActive = false;
    await category.save();
  },
};
