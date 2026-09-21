import { Types } from 'mongoose';
import { ExpenseModel } from '../../models/expense.model.js';
import { CategoryModel } from '../../models/category.model.js';
import { NotFoundError } from '../../utils/errors.js';
import {
  ReportSummary,
  CategoryBreakdownItem,
  PaymentMethodBreakdownItem,
  MonthlyTrendItem,
  DailyTrendItem,
  ReportResponseData,
  ReportQueryFilters,
  ReportDateRange,
} from '../../types/report.types.js';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Resolves query strings or defaults into half-open interval [startDate, endDate)
 * Standardized on UTC timestamps to maintain consistency across Expenses, Budgets, and Reports.
 */
export function resolveDateBoundaries(
  startDateStr?: string,
  endDateStr?: string
): { startDate: Date; endDate: Date } {
  const now = new Date();

  // Default: start of current month in UTC
  let startDate: Date;
  if (startDateStr) {
    startDate = new Date(startDateStr);
  } else {
    startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  }

  // Default: start of next month in UTC
  let endDate: Date;
  if (endDateStr) {
    const parsedEnd = new Date(endDateStr);
    // If date-only strings are identical (e.g. startDate=2026-09-19&endDate=2026-09-19),
    // extend endDate to start of next day so the single day is fully included
    if (
      startDateStr &&
      endDateStr === startDateStr &&
      !endDateStr.includes('T')
    ) {
      endDate = new Date(parsedEnd.getTime() + 24 * 60 * 60 * 1000);
    } else {
      endDate = parsedEnd;
    }
  } else {
    endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  }

  return { startDate, endDate };
}

/**
 * Builds the base MongoDB $match stage for the authenticated user and filters
 */
async function buildMatchStage(
  userId: string,
  filters: ReportQueryFilters,
  startDate: Date,
  endDate: Date
): Promise<Record<string, any>> {
  const matchStage: Record<string, any> = {
    userId: new Types.ObjectId(userId),
    date: { $gte: startDate, $lt: endDate },
  };

  // Category filter with accessibility guard
  if (filters.categoryId) {
    const category = await CategoryModel.findOne({
      _id: new Types.ObjectId(filters.categoryId),
      isActive: true,
      $or: [{ isDefault: true }, { userId: new Types.ObjectId(userId) }],
    }).lean();

    if (!category) {
      throw new NotFoundError('Category not found or not accessible.');
    }

    matchStage.categoryId = new Types.ObjectId(filters.categoryId);
  }

  // Payment method filter
  if (filters.paymentMethod) {
    matchStage.paymentMethod = filters.paymentMethod;
  }

  return matchStage;
}

export const reportService = {
  /**
   * Calculates overall summary metrics (totalSpent, transactionCount, average, highest, lowest)
   */
  async getSummary(
    userId: string,
    filters: ReportQueryFilters = {}
  ): Promise<{ summary: ReportSummary; dateRange: ReportDateRange }> {
    const { startDate, endDate } = resolveDateBoundaries(filters.startDate, filters.endDate);
    const matchStage = await buildMatchStage(userId, filters, startDate, endDate);

    const result = await ExpenseModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          averageExpense: { $avg: '$amount' },
          highestExpense: { $max: '$amount' },
          lowestExpense: { $min: '$amount' },
        },
      },
    ]);

    if (!result || result.length === 0) {
      return {
        summary: {
          totalSpent: 0,
          transactionCount: 0,
          averageExpense: 0,
          highestExpense: 0,
          lowestExpense: 0,
        },
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      };
    }

    const row = result[0];
    return {
      summary: {
        totalSpent: Math.round(row.totalSpent * 100) / 100,
        transactionCount: row.transactionCount,
        averageExpense: Math.round((row.averageExpense || 0) * 100) / 100,
        highestExpense: Math.round((row.highestExpense || 0) * 100) / 100,
        lowestExpense: Math.round((row.lowestExpense || 0) * 100) / 100,
      },
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  },

  /**
   * Calculates category breakdown sorted by spending descending
   */
  async getCategoryBreakdown(
    userId: string,
    filters: ReportQueryFilters = {},
    totalSpentHint?: number
  ): Promise<{ categoryBreakdown: CategoryBreakdownItem[]; dateRange: ReportDateRange }> {
    const { startDate, endDate } = resolveDateBoundaries(filters.startDate, filters.endDate);
    const matchStage = await buildMatchStage(userId, filters, startDate, endDate);

    let totalSpent = totalSpentHint;
    if (totalSpent === undefined) {
      const summaryResult = await this.getSummary(userId, filters);
      totalSpent = summaryResult.summary.totalSpent;
    }

    const rows = await ExpenseModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            categoryId: '$categoryId',
            categoryName: '$categoryNameSnapshot',
          },
          amount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { amount: -1, '_id.categoryId': 1 } },
    ]);

    const categoryBreakdown: CategoryBreakdownItem[] = rows.map((row) => {
      const amount = Math.round(row.amount * 100) / 100;
      const percentage =
        totalSpent && totalSpent > 0
          ? Math.round((amount / totalSpent) * 10000) / 100
          : 0;

      return {
        categoryId: row._id.categoryId ? row._id.categoryId.toString() : '',
        categoryName: row._id.categoryName || 'Uncategorized',
        amount,
        percentage,
        transactionCount: row.transactionCount,
      };
    });

    return {
      categoryBreakdown,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  },

  /**
   * Calculates payment method breakdown sorted by spending descending
   */
  async getPaymentMethodBreakdown(
    userId: string,
    filters: ReportQueryFilters = {},
    totalSpentHint?: number
  ): Promise<{ paymentMethodBreakdown: PaymentMethodBreakdownItem[]; dateRange: ReportDateRange }> {
    const { startDate, endDate } = resolveDateBoundaries(filters.startDate, filters.endDate);
    const matchStage = await buildMatchStage(userId, filters, startDate, endDate);

    let totalSpent = totalSpentHint;
    if (totalSpent === undefined) {
      const summaryResult = await this.getSummary(userId, filters);
      totalSpent = summaryResult.summary.totalSpent;
    }

    const rows = await ExpenseModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentMethod',
          amount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { amount: -1, _id: 1 } },
    ]);

    const paymentMethodBreakdown: PaymentMethodBreakdownItem[] = rows.map((row) => {
      const amount = Math.round(row.amount * 100) / 100;
      const percentage =
        totalSpent && totalSpent > 0
          ? Math.round((amount / totalSpent) * 10000) / 100
          : 0;

      return {
        paymentMethod: row._id,
        amount,
        percentage,
        transactionCount: row.transactionCount,
      };
    });

    return {
      paymentMethodBreakdown,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  },

  /**
   * Calculates monthly spending trends sorted chronologically ascending
   */
  async getMonthlyTrend(
    userId: string,
    filters: ReportQueryFilters = {}
  ): Promise<{ monthlyTrend: MonthlyTrendItem[]; dateRange: ReportDateRange }> {
    const { startDate, endDate } = resolveDateBoundaries(filters.startDate, filters.endDate);
    const matchStage = await buildMatchStage(userId, filters, startDate, endDate);

    const rows = await ExpenseModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: { date: '$date', timezone: 'UTC' } },
            month: { $month: { date: '$date', timezone: 'UTC' } },
          },
          amount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthlyTrend: MonthlyTrendItem[] = rows.map((row) => {
      const year = row._id.year;
      const month = row._id.month;
      const monthLabel = MONTH_NAMES[month - 1] || `${month}`;

      return {
        year,
        month,
        label: `${monthLabel} ${year}`,
        amount: Math.round(row.amount * 100) / 100,
        transactionCount: row.transactionCount,
      };
    });

    return {
      monthlyTrend,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  },

  /**
   * Calculates daily spending trends sorted chronologically ascending
   */
  async getDailyTrend(
    userId: string,
    filters: ReportQueryFilters = {}
  ): Promise<{ dailyTrend: DailyTrendItem[]; dateRange: ReportDateRange }> {
    const { startDate, endDate } = resolveDateBoundaries(filters.startDate, filters.endDate);
    const matchStage = await buildMatchStage(userId, filters, startDate, endDate);

    const rows = await ExpenseModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date',
              timezone: 'UTC',
            },
          },
          amount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyTrend: DailyTrendItem[] = rows.map((row) => ({
      date: row._id,
      amount: Math.round(row.amount * 100) / 100,
      transactionCount: row.transactionCount,
    }));

    return {
      dailyTrend,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  },

  /**
   * Combined report fetching summary, breakdowns, and trends efficiently
   */
  async getReports(
    userId: string,
    filters: ReportQueryFilters = {}
  ): Promise<ReportResponseData> {
    const summaryData = await this.getSummary(userId, filters);
    const totalSpent = summaryData.summary.totalSpent;

    const [categoryData, paymentMethodData, monthlyData, dailyData] = await Promise.all([
      this.getCategoryBreakdown(userId, filters, totalSpent),
      this.getPaymentMethodBreakdown(userId, filters, totalSpent),
      this.getMonthlyTrend(userId, filters),
      this.getDailyTrend(userId, filters),
    ]);

    return {
      summary: summaryData.summary,
      categoryBreakdown: categoryData.categoryBreakdown,
      paymentMethodBreakdown: paymentMethodData.paymentMethodBreakdown,
      monthlyTrend: monthlyData.monthlyTrend,
      dailyTrend: dailyData.dailyTrend,
      dateRange: summaryData.dateRange,
    };
  },
};
