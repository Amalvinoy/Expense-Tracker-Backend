import { Types } from 'mongoose';

export const BUDGET_TYPES = ['TOTAL', 'CATEGORY'] as const;
export type BudgetType = (typeof BUDGET_TYPES)[number];

/**
 * Domain entity representing a Budget
 */
export interface Budget {
  id: string;
  userId: string;
  type: BudgetType;
  categoryId: string | null;
  amount: number;
  year: number;
  month: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Raw Mongoose Document interface for Budget
 */
export interface IBudgetDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: BudgetType;
  categoryId: Types.ObjectId | null;
  amount: number;
  year: number;
  month: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a budget
 */
export interface CreateBudgetInput {
  type: BudgetType;
  categoryId?: string | null;
  amount: number;
  year: number;
  month: number;
}

/**
 * DTO for updating a budget (only amount may be altered)
 */
export interface UpdateBudgetInput {
  amount: number;
}

/**
 * Query filter parameters for listing budgets
 */
export interface BudgetQueryFilters {
  year?: number;
  month?: number;
  type?: BudgetType;
  categoryId?: string;
}

/**
 * Detailed progress information for a single budget
 */
export interface BudgetProgressItem {
  budget: {
    id: string;
    type: BudgetType;
    amount: number;
    categoryId: string | null;
    year: number;
    month: number;
  };
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  spent: number;
  remaining: number;
  amountOverBudget: number;
  percentageUsed: number;
  isOverBudget: boolean;
}

/**
 * Response payload for budget progress endpoint
 */
export interface BudgetProgressResponseData {
  year: number;
  month: number;
  totalBudget: BudgetProgressItem | null;
  categoryBudgets: BudgetProgressItem[];
}

/**
 * Response payload for dashboard current budget summary
 */
export interface CurrentBudgetSummaryResponseData {
  year: number;
  month: number;
  totalBudget: BudgetProgressItem | null;
  categoryBudgets: BudgetProgressItem[];
}

/**
 * Response payload for list of budgets
 */
export interface BudgetListResponseData {
  budgets: Budget[];
}

/**
 * Response payload for a single budget
 */
export interface SingleBudgetResponseData {
  budget: Budget;
}
