import { Types, FilterQuery } from 'mongoose';
import { ExpenseModel } from '../../models/expense.model.js';
import { CategoryModel } from '../../models/category.model.js';
import {
  Expense,
  IExpenseDocument,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseQueryFilters,
  ExpenseListResponseData,
} from '../../types/expense.types.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { budgetService } from '../budget/budget.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Maps a Mongoose document or lean record to the safe domain Expense interface
 */
function toExpense(doc: any): Expense {
  return {
    id: doc._id ? doc._id.toString() : doc.id || '',
    userId: doc.userId ? doc.userId.toString() : '',
    amount: doc.amount,
    categoryId: doc.categoryId ? doc.categoryId.toString() : '',
    categoryNameSnapshot: doc.categoryNameSnapshot || undefined,
    paymentMethod: doc.paymentMethod,
    note: doc.note || undefined,
    date: doc.date instanceof Date ? doc.date.toISOString() : new Date(doc.date).toISOString(),
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

export const expenseService = {
  /**
   * Creates a new expense strictly assigned to the authenticated user
   */
  async createExpense(userId: string, input: CreateExpenseInput): Promise<Expense> {
    // Verify category existence, active status, and accessibility to authenticated user
    const category = await CategoryModel.findOne({
      _id: new Types.ObjectId(input.categoryId),
      isActive: true,
      $or: [
        { userId: null },
        { userId: new Types.ObjectId(userId) },
      ],
    }).lean();

    if (!category) {
      throw new BadRequestError('Invalid or inaccessible category ID.');
    }

    const created = await ExpenseModel.create({
      userId: new Types.ObjectId(userId),
      amount: input.amount,
      categoryId: category._id,
      categoryNameSnapshot: category.name, // Populated strictly from database category
      paymentMethod: input.paymentMethod,
      note: input.note,
      date: new Date(input.date),
    });

    const result = toExpense(created);

    // Automatically trigger budget alert evaluation
    try {
      await budgetService.evaluateBudgetAlerts(userId, created.date, created.categoryId);
    } catch (alertErr) {
      logger.warn('Failed to evaluate budget alerts on expense creation:', {
        error: String(alertErr),
      });
    }

    return result;
  },

  /**
   * Retrieves a paginated and filtered list of expenses strictly belonging to the authenticated user
   */
  async getExpenses(
    userId: string,
    filters: ExpenseQueryFilters
  ): Promise<ExpenseListResponseData> {
    const query: FilterQuery<IExpenseDocument> = {
      userId: new Types.ObjectId(userId),
    };

    // Date range filters
    if (filters.startDate || filters.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (filters.startDate) {
        dateFilter.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        dateFilter.$lte = new Date(filters.endDate);
      }
      query.date = dateFilter;
    }

    // Category filter
    if (filters.categoryId) {
      query.categoryId = new Types.ObjectId(filters.categoryId);
    }

    // Payment method filter
    if (filters.paymentMethod) {
      query.paymentMethod = filters.paymentMethod;
    }

    // Amount range filters
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      const amountFilter: Record<string, number> = {};
      if (filters.minAmount !== undefined) {
        amountFilter.$gte = filters.minAmount;
      }
      if (filters.maxAmount !== undefined) {
        amountFilter.$lte = filters.maxAmount;
      }
      query.amount = amountFilter;
    }

    // Text search in note or categoryNameSnapshot (regex escaped to prevent injection)
    if (filters.search) {
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { note: { $regex: escaped, $options: 'i' } },
        { categoryNameSnapshot: { $regex: escaped, $options: 'i' } },
      ];
    }

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const sortBy = filters.sortBy || 'date';
    const sortDirection: 1 | -1 = filters.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortDirection, _id: -1 };

    const [docs, total] = await Promise.all([
      ExpenseModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
      ExpenseModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      expenses: docs.map(toExpense),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  /**
   * Retrieves a single expense by ID, strictly verifying user ownership
   */
  async getExpenseById(userId: string, expenseId: string): Promise<Expense> {
    const doc = await ExpenseModel.findOne({
      _id: new Types.ObjectId(expenseId),
      userId: new Types.ObjectId(userId),
    }).lean();

    if (!doc) {
      throw new NotFoundError('Expense not found.');
    }

    return toExpense(doc);
  },

  /**
   * Updates an existing expense, ensuring ownership and prohibiting modification of userId/_id/createdAt
   */
  async updateExpense(
    userId: string,
    expenseId: string,
    input: UpdateExpenseInput
  ): Promise<Expense> {
    const updateData: Record<string, any> = {};

    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.categoryId !== undefined) {
      const category = await CategoryModel.findOne({
        _id: new Types.ObjectId(input.categoryId),
        isActive: true,
        $or: [
          { userId: null },
          { userId: new Types.ObjectId(userId) },
        ],
      }).lean();

      if (!category) {
        throw new BadRequestError('Invalid or inaccessible category ID.');
      }

      updateData.categoryId = category._id;
      updateData.categoryNameSnapshot = category.name;
    }
    if (input.paymentMethod !== undefined) updateData.paymentMethod = input.paymentMethod;
    if (input.note !== undefined) updateData.note = input.note;
    if (input.date !== undefined) updateData.date = new Date(input.date);

    const updated = await ExpenseModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(expenseId),
        userId: new Types.ObjectId(userId),
      },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      throw new NotFoundError('Expense not found.');
    }

    const result = toExpense(updated);

    // Automatically trigger budget alert evaluation
    try {
      await budgetService.evaluateBudgetAlerts(userId, updated.date, updated.categoryId);
    } catch (alertErr) {
      logger.warn('Failed to evaluate budget alerts on expense update:', {
        error: String(alertErr),
      });
    }

    return result;
  },

  /**
   * Deletes an existing expense, strictly scoped to the authenticated user
   */
  async deleteExpense(userId: string, expenseId: string): Promise<void> {
    const result = await ExpenseModel.deleteOne({
      _id: new Types.ObjectId(expenseId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundError('Expense not found.');
    }
  },
};
