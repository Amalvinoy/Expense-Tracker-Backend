import { Types } from 'mongoose';

/**
 * Supported payment methods
 */
export const PAYMENT_METHODS = [
  'CASH',
  'UPI',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'OTHER',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Safe domain representation of an Expense returned across service & API layers
 */
export interface Expense {
  id: string;
  userId: string;
  amount: number;
  categoryId: string;
  categoryNameSnapshot?: string;
  paymentMethod: PaymentMethod;
  note?: string;
  date: string; // ISO 8601 string
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

/**
 * Raw Mongoose Document interface
 */
export interface IExpenseDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  categoryId: Types.ObjectId;
  categoryNameSnapshot?: string;
  paymentMethod: PaymentMethod;
  note?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input DTO for creating an expense (strictly excludes userId)
 */
export interface CreateExpenseInput {
  amount: number;
  categoryId: string;
  categoryNameSnapshot?: string;
  paymentMethod: PaymentMethod;
  note?: string;
  date: string | Date;
}

/**
 * Input DTO for updating an expense (strictly excludes userId, _id, createdAt)
 */
export interface UpdateExpenseInput {
  amount?: number;
  categoryId?: string;
  categoryNameSnapshot?: string;
  paymentMethod?: PaymentMethod;
  note?: string;
  date?: string | Date;
}

/**
 * Query filter parameters for listing expenses
 */
export interface ExpenseQueryFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: 'date' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination metadata
 */
export interface ExpensePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standard list response data for expenses
 */
export interface ExpenseListResponseData {
  expenses: Expense[];
  pagination: ExpensePagination;
}

/**
 * Single expense response data
 */
export interface SingleExpenseResponseData {
  expense: Expense;
}
