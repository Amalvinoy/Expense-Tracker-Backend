import { Types } from 'mongoose';

/**
 * Domain entity representing a Category
 */
export interface Category {
  id: string;
  userId: string | null;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Raw Mongoose Document interface for Category
 */
export interface ICategoryDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId | null;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a new custom category (strictly excludes userId, isDefault)
 */
export interface CreateCategoryInput {
  name: string;
  icon: string;
  color: string;
}

/**
 * DTO for updating an existing category
 */
export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
}

/**
 * Response payload for category listings
 */
export interface CategoryListResponseData {
  categories: Category[];
}

/**
 * Response payload for single category
 */
export interface SingleCategoryResponseData {
  category: Category;
}
