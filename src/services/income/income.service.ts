import { Types } from 'mongoose';
import { IncomeModel } from '../../models/income.model.js';
import {
  Income,
  CreateIncomeInput,
  UpdateIncomeInput,
  IncomeQueryFilters,
} from '../../types/income.types.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

function toIncomeDTO(doc: any): Income {
  return {
    id: doc._id ? doc._id.toString() : doc.id ? doc.id.toString() : '',
    userId: doc.userId ? doc.userId.toString() : '',
    year: doc.year,
    month: doc.month,
    amount: doc.amount,
    source: doc.source || undefined,
    note: doc.note || undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export const incomeService = {
  /**
   * List monthly income records for a user with optional year/month filters
   */
  async getIncomes(userId: string, filters?: IncomeQueryFilters): Promise<Income[]> {
    const query: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    };

    if (filters?.year !== undefined) {
      query.year = filters.year;
    }

    if (filters?.month !== undefined) {
      query.month = filters.month;
    }

    const docs = await IncomeModel.find(query).sort({ year: -1, month: -1 });
    return docs.map(toIncomeDTO);
  },

  /**
   * Get an income record for a specific year and month
   */
  async getIncomeByMonth(userId: string, year: number, month: number): Promise<Income | null> {
    const doc = await IncomeModel.findOne({
      userId: new Types.ObjectId(userId),
      year,
      month,
    });

    return doc ? toIncomeDTO(doc) : null;
  },

  /**
   * Get an income record by ID
   */
  async getIncomeById(userId: string, id: string): Promise<Income> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid income ID format');
    }

    const doc = await IncomeModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!doc) {
      throw new NotFoundError('Income record not found');
    }

    return toIncomeDTO(doc);
  },

  /**
   * Create or update monthly income (upsert semantics per year/month)
   */
  async createOrUpdateIncome(userId: string, input: CreateIncomeInput): Promise<Income> {
    const userObjectId = new Types.ObjectId(userId);

    const doc = await IncomeModel.findOneAndUpdate(
      {
        userId: userObjectId,
        year: input.year,
        month: input.month,
      },
      {
        $set: {
          amount: input.amount,
          ...(input.source !== undefined ? { source: input.source } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return toIncomeDTO(doc);
  },

  /**
   * Update an existing monthly income record by ID
   */
  async updateIncome(userId: string, id: string, input: UpdateIncomeInput): Promise<Income> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid income ID format');
    }

    const updateFields: Record<string, any> = {};
    if (input.amount !== undefined) updateFields.amount = input.amount;
    if (input.source !== undefined) updateFields.source = input.source;
    if (input.note !== undefined) updateFields.note = input.note;

    const doc = await IncomeModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!doc) {
      throw new NotFoundError('Income record not found');
    }

    return toIncomeDTO(doc);
  },

  /**
   * Delete a monthly income record by ID
   */
  async deleteIncome(userId: string, id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid income ID format');
    }

    const result = await IncomeModel.deleteOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundError('Income record not found');
    }
  },
};
