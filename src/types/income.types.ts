import { Document, Types } from 'mongoose';

/**
 * Safe domain representation of a Monthly Income record
 */
export interface Income {
  id: string;
  userId: string;
  year: number;
  month: number; // 1 - 12
  amount: number;
  source?: string;
  note?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Mongoose document interface for Monthly Income
 */
export interface IIncomeDocument extends Document {
  userId: Types.ObjectId;
  year: number;
  month: number;
  amount: number;
  source?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating or recording monthly income
 */
export interface CreateIncomeInput {
  year: number;
  month: number;
  amount: number;
  source?: string;
  note?: string;
}

/**
 * DTO for updating an existing monthly income record
 */
export interface UpdateIncomeInput {
  amount?: number;
  source?: string;
  note?: string;
}

/**
 * Query filter parameters for income list
 */
export interface IncomeQueryFilters {
  year?: number;
  month?: number;
}
