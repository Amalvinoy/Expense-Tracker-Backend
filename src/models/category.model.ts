import mongoose, { Schema, Model } from 'mongoose';
import { ICategoryDocument } from '../types/category.types.js';

const categorySchema = new Schema<ICategoryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters long'],
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    icon: {
      type: String,
      required: [true, 'Category icon is required'],
      trim: true,
      minlength: [1, 'Category icon cannot be empty'],
      maxlength: [50, 'Category icon cannot exceed 50 characters'],
    },
    color: {
      type: String,
      required: [true, 'Category color is required'],
      trim: true,
      match: [/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Category color must be a valid hex color code (e.g. #FF5733)'],
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : '';
        ret.userId = ret.userId ? ret.userId.toString() : null;
        if (ret.createdAt instanceof Date) {
          ret.createdAt = ret.createdAt.toISOString();
        }
        if (ret.updatedAt instanceof Date) {
          ret.updatedAt = ret.updatedAt.toISOString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : '';
        ret.userId = ret.userId ? ret.userId.toString() : null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index ensuring uniqueness per user, and uniqueness for system categories (where userId is null)
categorySchema.index({ userId: 1, name: 1 }, { unique: true });

// Compound indexes for fast list queries
categorySchema.index({ userId: 1, isActive: 1 });
categorySchema.index({ isDefault: 1, isActive: 1 });

export const CategoryModel: Model<ICategoryDocument> = mongoose.model<ICategoryDocument>(
  'Category',
  categorySchema
);
