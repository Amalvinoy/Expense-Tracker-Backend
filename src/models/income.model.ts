import mongoose, { Schema, Model } from 'mongoose';
import { IIncomeDocument } from '../types/income.types.js';

const incomeSchema = new Schema<IIncomeDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    year: {
      type: Number,
      required: [true, 'Income year is required'],
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
      required: [true, 'Income month is required'],
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12'],
      validate: {
        validator: Number.isInteger,
        message: 'Month must be an integer',
      },
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Income amount is required'],
      min: [0.01, 'Income amount must be greater than zero'],
      max: [100000000, 'Income amount cannot exceed 100,000,000'],
      set: (val: number) => (typeof val === 'number' ? Math.round(val * 100) / 100 : val),
    },
    source: {
      type: String,
      trim: true,
      maxlength: [100, 'Income source cannot exceed 100 characters'],
      default: undefined,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id ? ret._id.toString() : '';
        ret.userId = ret.userId ? ret.userId.toString() : '';
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
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index ensuring one monthly income record per user per month
incomeSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

export const IncomeModel: Model<IIncomeDocument> = mongoose.model<IIncomeDocument>(
  'Income',
  incomeSchema
);
