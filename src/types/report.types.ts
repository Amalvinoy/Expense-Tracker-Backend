import { PaymentMethod } from './expense.types.js';

/**
 * Summary metrics of expenses in a date range
 */
export interface ReportSummary {
  totalSpent: number;
  transactionCount: number;
  averageExpense: number;
  highestExpense: number;
  lowestExpense: number;
}

/**
 * Breakdown of spending per category
 */
export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

/**
 * Breakdown of spending per payment method
 */
export interface PaymentMethodBreakdownItem {
  paymentMethod: PaymentMethod;
  amount: number;
  percentage: number;
  transactionCount: number;
}

/**
 * Spending trend per month
 */
export interface MonthlyTrendItem {
  year: number;
  month: number;
  label: string;
  amount: number;
  transactionCount: number;
}

/**
 * Spending trend per day
 */
export interface DailyTrendItem {
  date: string; // YYYY-MM-DD
  amount: number;
  transactionCount: number;
}

/**
 * Resolved date boundaries used for reporting
 */
export interface ReportDateRange {
  startDate: string; // ISO 8601 string
  endDate: string; // ISO 8601 string
}

/**
 * Combined reports data payload
 */
export interface ReportResponseData {
  summary: ReportSummary;
  categoryBreakdown: CategoryBreakdownItem[];
  paymentMethodBreakdown: PaymentMethodBreakdownItem[];
  monthlyTrend: MonthlyTrendItem[];
  dailyTrend: DailyTrendItem[];
  dateRange: ReportDateRange;
}

/**
 * Service inputs / filters for report queries
 */
export interface ReportQueryFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
}
