import mongoose, { Schema, Model } from 'mongoose';
import { IBudgetDocument, BUDGET_TYPES } from '../types/budget.types.js';

const budgetSchema = new Schema<IBudgetDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: BUDGET_TYPES,
        message: '{VALUE} is not a valid budget type (must be TOTAL or CATEGORY)',
      },
      required: [true, 'Budget type is required'],
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Budget amount is required'],
      min: [0.01, 'Budget amount must be greater than zero'],
      max: [100000000, 'Budget amount cannot exceed 100,000,000'],
      set: (val: number) => (typeof val === 'number' ? Math.round(val * 100) / 100 : val),
    },
    year: {
      type: Number,
      required: [true, 'Budget year is required'],
      min: [2000, 'Year must be 2000 or later'],
      max: [2100, 'Year cannot exceed 2100'],
      validate: {
        validator: Number.isInteger,
        message: 'Year must be an integer',
      },
      index: true,
    },
    month: {
      type: Number,
      required: [true, 'Budget month is required'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12'],
      validate: {
        validator: Number.isInteger,
        message: 'Month must be an integer',
      },
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
        ret.userId = ret.userId ? ret.userId.toString() : '';
        ret.categoryId = ret.categoryId ? ret.categoryId.toString() : null;
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
        ret.userId = ret.userId ? ret.userId.toString() : '';
        ret.categoryId = ret.categoryId ? ret.categoryId.toString() : null;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index ensuring:
// 1. One TOTAL budget per user per year/month (where categoryId is null)
// 2. One CATEGORY budget per user per category per year/month
budgetSchema.index({ userId: 1, year: 1, month: 1, type: 1, categoryId: 1 }, { unique: true });

// Compound indexes for optimal queries
budgetSchema.index({ userId: 1, year: 1, month: 1, isActive: 1 });
budgetSchema.index({ userId: 1, type: 1, year: 1, month: 1 });

export const BudgetModel: Model<IBudgetDocument> = mongoose.model<IBudgetDocument>(
  'Budget',
  budgetSchema
);
