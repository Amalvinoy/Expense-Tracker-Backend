import mongoose, { Schema, Model } from 'mongoose';
import { IExpenseDocument, PAYMENT_METHODS } from '../types/expense.types.js';

const expenseSchema = new Schema<IExpenseDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
      max: [100000000, 'Amount cannot exceed 100,000,000'],
      set: (val: number) => (typeof val === 'number' ? Math.round(val * 100) / 100 : val),
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Category ID is required'],
      index: true,
    },
    categoryNameSnapshot: {
      type: String,
      trim: true,
      maxlength: [100, 'Category name snapshot cannot exceed 100 characters'],
      default: undefined,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: '{VALUE} is not a supported payment method',
      },
      required: [true, 'Payment method is required'],
      index: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
      default: undefined,
    },
    date: {
      type: Date,
      required: [true, 'Expense date is required'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : '';
        if (ret.userId && typeof ret.userId === 'object') {
          ret.userId = ret.userId.toString();
        }
        if (ret.categoryId && typeof ret.categoryId === 'object') {
          ret.categoryId = ret.categoryId.toString();
        }
        if (ret.date instanceof Date) {
          ret.date = ret.date.toISOString();
        }
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
        if (ret.userId && typeof ret.userId === 'object') {
          ret.userId = ret.userId.toString();
        }
        if (ret.categoryId && typeof ret.categoryId === 'object') {
          ret.categoryId = ret.categoryId.toString();
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for optimal timeline querying and category aggregation
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, categoryId: 1, date: -1 });

export const ExpenseModel: Model<IExpenseDocument> = mongoose.model<IExpenseDocument>(
  'Expense',
  expenseSchema
);
