import mongoose, { Schema, Model } from 'mongoose';
import {
  ILendingDocument,
  IRepayment,
  LENDING_STATUSES,
} from '../types/lending.types.js';

const repaymentSchema = new Schema<IRepayment>(
  {
    amount: {
      type: Number,
      required: [true, 'Repayment amount is required'],
      min: [0.01, 'Repayment amount must be greater than zero'],
      set: (val: number) => (typeof val === 'number' ? Math.round(val * 100) / 100 : val),
    },
    date: {
      type: Date,
      required: [true, 'Repayment date is required'],
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Repayment note cannot exceed 500 characters'],
      default: undefined,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const lendingSchema = new Schema<ILendingDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    personName: {
      type: String,
      required: [true, 'Person name is required'],
      trim: true,
      minlength: [1, 'Person name cannot be empty'],
      maxlength: [100, 'Person name cannot exceed 100 characters'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Lent amount is required'],
      min: [0.01, 'Lent amount must be greater than zero'],
      max: [100000000, 'Lent amount cannot exceed 100,000,000'],
      set: (val: number) => (typeof val === 'number' ? Math.round(val * 100) / 100 : val),
    },
    amountReturned: {
      type: Number,
      default: 0,
      min: [0, 'Amount returned cannot be negative'],
      set: (val: number) => (typeof val === 'number' ? Math.round(val * 100) / 100 : val),
    },
    remainingAmount: {
      type: Number,
      min: [0, 'Remaining amount cannot be negative'],
      set: (val: number) => (typeof val === 'number' ? Math.round(val * 100) / 100 : val),
    },
    date: {
      type: Date,
      required: [true, 'Lending date is required'],
      default: Date.now,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
      default: undefined,
    },
    status: {
      type: String,
      enum: {
        values: LENDING_STATUSES,
        message: '{VALUE} is not a valid lending status',
      },
      default: 'PENDING',
      index: true,
    },
    repayments: {
      type: [repaymentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id ? ret._id.toString() : '';
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Pre-validate hook to calculate remainingAmount and status deterministically
lendingSchema.pre('validate', function (next) {
  const amount = typeof this.amount === 'number' ? Math.round(this.amount * 100) / 100 : 0;
  const amountReturned =
    typeof this.amountReturned === 'number' ? Math.round(this.amountReturned * 100) / 100 : 0;

  const rawRemaining = Math.max(0, Math.round((amount - amountReturned) * 100) / 100);
  this.remainingAmount = rawRemaining;

  if (amountReturned <= 0) {
    this.status = 'PENDING';
  } else if (rawRemaining <= 0 || amountReturned >= amount) {
    this.status = 'FULLY_PAID';
    this.remainingAmount = 0;
  } else {
    this.status = 'PARTIALLY_PAID';
  }

  next();
});

// Compound indexes for user query efficiency
lendingSchema.index({ userId: 1, date: -1 });
lendingSchema.index({ userId: 1, status: 1 });

export const LendingModel: Model<ILendingDocument> =
  mongoose.models.Lending || mongoose.model<ILendingDocument>('Lending', lendingSchema);
