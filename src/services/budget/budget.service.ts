import { Types, FilterQuery } from 'mongoose';
import { BudgetModel } from '../../models/budget.model.js';
import { CategoryModel } from '../../models/category.model.js';
import { ExpenseModel } from '../../models/expense.model.js';
import {
  Budget,
  IBudgetDocument,
  CreateBudgetInput,
  UpdateBudgetInput,
  BudgetQueryFilters,
  BudgetListResponseData,
  BudgetProgressResponseData,
  BudgetProgressItem,
} from '../../types/budget.types.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../utils/errors.js';
import { notificationService } from '../notification/notification.service.js';

/**
 * Maps a Mongoose document or lean record to the safe domain Budget interface
 */
function toBudget(doc: any): Budget {
  return {
    id: doc._id ? doc._id.toString() : doc.id || '',
    userId: doc.userId ? doc.userId.toString() : '',
    type: doc.type,
    categoryId: doc.categoryId ? doc.categoryId.toString() : null,
    amount: doc.amount,
    year: doc.year,
    month: doc.month,
    isActive: doc.isActive ?? true,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : new Date(doc.updatedAt).toISOString(),
  };
}

export const budgetService = {
  /**
   * Creates a new monthly TOTAL or CATEGORY budget
   */
  async createBudget(userId: string, input: CreateBudgetInput): Promise<Budget> {
    let resolvedCategoryId: Types.ObjectId | null = null;

    if (input.type === 'CATEGORY') {
      if (!input.categoryId) {
        throw new BadRequestError('Category ID is required for CATEGORY budget.');
      }

      // Verify category existence, active state, and user accessibility
      const category = await CategoryModel.findOne({
        _id: new Types.ObjectId(input.categoryId),
        isActive: true,
        $or: [{ userId: null }, { userId: new Types.ObjectId(userId) }],
      }).lean();

      if (!category) {
        throw new BadRequestError('Invalid or inaccessible category ID.');
      }

      resolvedCategoryId = category._id;
    } else {
      if (input.categoryId) {
        throw new BadRequestError('Category ID must not be provided for TOTAL budget.');
      }
    }

    // Check for existing active budget of the same type and period
    const existing = await BudgetModel.findOne({
      userId: new Types.ObjectId(userId),
      year: input.year,
      month: input.month,
      type: input.type,
      categoryId: resolvedCategoryId,
      isActive: true,
    });

    if (existing) {
      throw new ConflictError(
        `A ${input.type} budget already exists for ${input.year}-${input.month.toString().padStart(2, '0')}.`
      );
    }

    const created = await BudgetModel.create({
      userId: new Types.ObjectId(userId),
      type: input.type,
      categoryId: resolvedCategoryId,
      amount: input.amount,
      year: input.year,
      month: input.month,
      isActive: true,
    });

    return toBudget(created);
  },

  /**
   * Retrieves a list of budgets belonging to the authenticated user with optional filters
   */
  async getBudgets(userId: string, filters: BudgetQueryFilters): Promise<BudgetListResponseData> {
    const query: FilterQuery<IBudgetDocument> = {
      userId: new Types.ObjectId(userId),
      isActive: true,
    };

    if (filters.year) query.year = filters.year;
    if (filters.month) query.month = filters.month;
    if (filters.type) query.type = filters.type;
    if (filters.categoryId) query.categoryId = new Types.ObjectId(filters.categoryId);

    const docs = await BudgetModel.find(query)
      .sort({ year: -1, month: -1, type: 1 })
      .lean();

    return {
      budgets: docs.map(toBudget),
    };
  },

  /**
   * Retrieves a single budget by ID, verifying user ownership
   */
  async getBudgetById(userId: string, budgetId: string): Promise<Budget> {
    const doc = await BudgetModel.findOne({
      _id: new Types.ObjectId(budgetId),
      userId: new Types.ObjectId(userId),
      isActive: true,
    }).lean();

    if (!doc) {
      throw new NotFoundError('Budget not found.');
    }

    return toBudget(doc);
  },

  /**
   * Updates an existing budget's amount
   */
  async updateBudget(
    userId: string,
    budgetId: string,
    input: UpdateBudgetInput
  ): Promise<Budget> {
    const budget = await BudgetModel.findOne({
      _id: new Types.ObjectId(budgetId),
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    if (!budget) {
      throw new NotFoundError('Budget not found.');
    }

    budget.amount = input.amount;
    await budget.save();

    return toBudget(budget);
  },

  /**
   * Deletes an existing budget owned by the authenticated user
   */
  async deleteBudget(userId: string, budgetId: string): Promise<void> {
    const result = await BudgetModel.deleteOne({
      _id: new Types.ObjectId(budgetId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundError('Budget not found.');
    }
  },

  /**
   * Calculates dynamic budget progress and spending metrics using MongoDB aggregation
   */
  async getBudgetProgress(
    userId: string,
    targetYear?: number,
    targetMonth?: number
  ): Promise<BudgetProgressResponseData> {
    const now = new Date();
    const year = targetYear && targetYear >= 2000 ? targetYear : now.getUTCFullYear();
    const month = targetMonth && targetMonth >= 1 && targetMonth <= 12 ? targetMonth : now.getUTCMonth() + 1;

    // Construct half-open UTC date boundaries [startDate, nextMonthStart)
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    // 1. Fetch all active budgets configured for this month/year
    const budgets = await BudgetModel.find({
      userId: new Types.ObjectId(userId),
      year,
      month,
      isActive: true,
    }).lean();

    // 2. Perform MongoDB aggregation to calculate total spending per category in this month
    const spendingAggregation = await ExpenseModel.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: startDate, $lt: nextMonthStart },
        },
      },
      {
        $group: {
          _id: '$categoryId',
          totalSpent: { $sum: '$amount' },
        },
      },
    ]);

    let totalSpentOverall = 0;
    const categorySpendingMap = new Map<string, number>();

    for (const item of spendingAggregation) {
      const rounded = Math.round(item.totalSpent * 100) / 100;
      totalSpentOverall += rounded;
      if (item._id) {
        categorySpendingMap.set(item._id.toString(), rounded);
      }
    }
    totalSpentOverall = Math.round(totalSpentOverall * 100) / 100;

    // 3. Calculate TOTAL budget progress if defined
    let totalProgress: BudgetProgressItem | null = null;
    const totalBudgetDoc = budgets.find((b) => b.type === 'TOTAL');

    if (totalBudgetDoc) {
      const spent = totalSpentOverall;
      const remaining = Math.max(Math.round((totalBudgetDoc.amount - spent) * 100) / 100, 0);
      const amountOverBudget = Math.max(Math.round((spent - totalBudgetDoc.amount) * 100) / 100, 0);
      const percentageUsed =
        totalBudgetDoc.amount > 0
          ? Math.round((spent / totalBudgetDoc.amount) * 10000) / 100
          : 0;

      totalProgress = {
        budget: {
          id: totalBudgetDoc._id.toString(),
          type: 'TOTAL',
          amount: totalBudgetDoc.amount,
          categoryId: null,
          year,
          month,
        },
        spent,
        remaining,
        amountOverBudget,
        percentageUsed,
        isOverBudget: spent > totalBudgetDoc.amount,
      };
    }

    // 4. Calculate CATEGORY budget progress
    const categoryBudgetsDocs = budgets.filter((b) => b.type === 'CATEGORY');
    const categoryBudgets: BudgetProgressItem[] = [];

    if (categoryBudgetsDocs.length > 0) {
      const categoryIds = categoryBudgetsDocs
        .map((b) => b.categoryId)
        .filter((id): id is Types.ObjectId => id !== null);

      const categories = await CategoryModel.find({ _id: { $in: categoryIds } }).lean();
      const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

      for (const catBudgetDoc of categoryBudgetsDocs) {
        const catIdStr = catBudgetDoc.categoryId ? catBudgetDoc.categoryId.toString() : '';
        const spent = categorySpendingMap.get(catIdStr) || 0;
        const remaining = Math.max(Math.round((catBudgetDoc.amount - spent) * 100) / 100, 0);
        const amountOverBudget = Math.max(Math.round((spent - catBudgetDoc.amount) * 100) / 100, 0);
        const percentageUsed =
          catBudgetDoc.amount > 0
            ? Math.round((spent / catBudgetDoc.amount) * 10000) / 100
            : 0;

        const catData = categoryMap.get(catIdStr);

        categoryBudgets.push({
          budget: {
            id: catBudgetDoc._id.toString(),
            type: 'CATEGORY',
            amount: catBudgetDoc.amount,
            categoryId: catIdStr,
            year,
            month,
          },
          category: catData
            ? {
                id: catData._id.toString(),
                name: catData.name,
                icon: catData.icon,
                color: catData.color,
              }
            : null,
          spent,
          remaining,
          amountOverBudget,
          percentageUsed,
          isOverBudget: spent > catBudgetDoc.amount,
        });
      }
    }

    return {
      year,
      month,
      totalBudget: totalProgress,
      categoryBudgets,
    };
  },

  /**
   * Retrieves the current month's budget summary
   */
  async getCurrentBudget(userId: string): Promise<BudgetProgressResponseData> {
    return this.getBudgetProgress(userId);
  },

  /**
   * Evaluates budget threshold crossing (80%, 90%, 100%) and triggers automated notifications
   */
  async evaluateBudgetAlerts(
    userId: string,
    expenseDate: Date,
    categoryId?: Types.ObjectId | string
  ): Promise<void> {
    const year = expenseDate.getUTCFullYear();
    const month = expenseDate.getUTCMonth() + 1;

    const progress = await this.getBudgetProgress(userId, year, month);

    const checkItem = async (item: BudgetProgressItem, categoryName?: string) => {
      if (item.isOverBudget) {
        await notificationService.createBudgetAlertIfEligible(userId, {
          budgetId: item.budget.id,
          categoryName,
          percentageUsed: item.percentageUsed,
          amount: item.budget.amount,
          spent: item.spent,
          year,
          month,
          threshold: 100,
        });
      } else if (item.percentageUsed >= 90) {
        await notificationService.createBudgetAlertIfEligible(userId, {
          budgetId: item.budget.id,
          categoryName,
          percentageUsed: item.percentageUsed,
          amount: item.budget.amount,
          spent: item.spent,
          year,
          month,
          threshold: 90,
        });
      } else if (item.percentageUsed >= 80) {
        await notificationService.createBudgetAlertIfEligible(userId, {
          budgetId: item.budget.id,
          categoryName,
          percentageUsed: item.percentageUsed,
          amount: item.budget.amount,
          spent: item.spent,
          year,
          month,
          threshold: 80,
        });
      }
    };

    // 1. Evaluate Total Budget
    if (progress.totalBudget) {
      await checkItem(progress.totalBudget, 'Total Monthly Budget');
    }

    // 2. Evaluate Category Budget
    if (progress.categoryBudgets && progress.categoryBudgets.length > 0) {
      for (const catItem of progress.categoryBudgets) {
        if (!categoryId || catItem.budget.categoryId === categoryId.toString()) {
          await checkItem(catItem, catItem.category?.name || 'Category Budget');
        }
      }
    }
  },
};
