import { Types } from 'mongoose';
import { LendingModel } from '../../models/lending.model.js';
import {
  CreateLendingInput,
  UpdateLendingInput,
  RecordRepaymentInput,
  LendingDTO,
  LendingSummary,
} from '../../types/lending.types.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

function toLendingDTO(doc: any): LendingDTO {
  return {
    id: doc._id ? doc._id.toString() : doc.id ? doc.id.toString() : '',
    userId: doc.userId ? doc.userId.toString() : '',
    personName: doc.personName,
    amount: doc.amount,
    amountReturned: doc.amountReturned ?? 0,
    remainingAmount:
      typeof doc.remainingAmount === 'number'
        ? doc.remainingAmount
        : Math.max(0, Math.round(((doc.amount || 0) - (doc.amountReturned || 0)) * 100) / 100),
    date: doc.date ? new Date(doc.date).toISOString() : new Date().toISOString(),
    note: doc.note || undefined,
    status: doc.status || 'PENDING',
    repayments: (doc.repayments || []).map((r: any) => ({
      id: r._id ? r._id.toString() : r.id ? r.id.toString() : '',
      amount: r.amount,
      date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
      note: r.note || undefined,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    })),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export const lendingService = {
  /**
   * Retrieves all lending records for the authenticated user, ordered by date descending
   */
  async getLendings(
    userId: string,
    filters?: { status?: string; search?: string }
  ): Promise<{ lendings: LendingDTO[]; summary: LendingSummary }> {
    const query: Record<string, any> = {
      userId: new Types.ObjectId(userId),
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.search && filters.search.trim()) {
      const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.personName = { $regex: new RegExp(escaped, 'i') };
    }

    const docs = await LendingModel.find(query).sort({ date: -1, createdAt: -1 });
    const lendings = docs.map(toLendingDTO);

    // Calculate summary
    const allUserDocs = await LendingModel.find({ userId: new Types.ObjectId(userId) });
    let totalLent = 0;
    let totalReturned = 0;
    let pendingCount = 0;
    let partiallyPaidCount = 0;
    let fullyPaidCount = 0;

    for (const d of allUserDocs) {
      totalLent += d.amount || 0;
      totalReturned += d.amountReturned || 0;
      if (d.status === 'PENDING') pendingCount++;
      else if (d.status === 'PARTIALLY_PAID') partiallyPaidCount++;
      else if (d.status === 'FULLY_PAID') fullyPaidCount++;
    }

    totalLent = Math.round(totalLent * 100) / 100;
    totalReturned = Math.round(totalReturned * 100) / 100;
    const totalOutstanding = Math.max(0, Math.round((totalLent - totalReturned) * 100) / 100);

    const summary: LendingSummary = {
      totalLent,
      totalReturned,
      totalOutstanding,
      pendingCount,
      partiallyPaidCount,
      fullyPaidCount,
    };

    return { lendings, summary };
  },

  /**
   * Retrieves single lending record by ID scoped to user
   */
  async getLendingById(userId: string, id: string): Promise<LendingDTO> {
    const doc = await LendingModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!doc) {
      throw new NotFoundError('Lending record not found.');
    }

    return toLendingDTO(doc);
  },

  /**
   * Creates a new lending record
   */
  async createLending(userId: string, input: CreateLendingInput): Promise<LendingDTO> {
    const amount = Math.round(input.amount * 100) / 100;
    const date = input.date ? new Date(input.date) : new Date();

    const created = await LendingModel.create({
      userId: new Types.ObjectId(userId),
      personName: input.personName.trim(),
      amount,
      amountReturned: 0,
      remainingAmount: amount,
      date,
      note: input.note ? input.note.trim() : undefined,
      status: 'PENDING',
      repayments: [],
    });

    return toLendingDTO(created);
  },

  /**
   * Updates an existing lending record
   */
  async updateLending(
    userId: string,
    id: string,
    input: UpdateLendingInput
  ): Promise<LendingDTO> {
    const doc = await LendingModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!doc) {
      throw new NotFoundError('Lending record not found.');
    }

    if (input.personName !== undefined) {
      doc.personName = input.personName.trim();
    }

    if (input.amount !== undefined) {
      const newAmount = Math.round(input.amount * 100) / 100;
      if (newAmount < doc.amountReturned) {
        throw new BadRequestError(
          `New amount (₹${newAmount}) cannot be less than already returned amount (₹${doc.amountReturned}).`
        );
      }
      doc.amount = newAmount;
    }

    if (input.date !== undefined) {
      doc.date = new Date(input.date);
    }

    if (input.note !== undefined) {
      doc.note = input.note ? input.note.trim() : undefined;
    }

    await doc.save();
    return toLendingDTO(doc);
  },

  /**
   * Deletes a lending record
   */
  async deleteLending(userId: string, id: string): Promise<void> {
    const deleted = await LendingModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!deleted) {
      throw new NotFoundError('Lending record not found.');
    }
  },

  /**
   * Records a repayment against a lending record
   */
  async recordRepayment(
    userId: string,
    id: string,
    input: RecordRepaymentInput
  ): Promise<LendingDTO> {
    const doc = await LendingModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!doc) {
      throw new NotFoundError('Lending record not found.');
    }

    const repaymentAmount = Math.round(input.amount * 100) / 100;
    const remaining = Math.max(0, Math.round((doc.amount - doc.amountReturned) * 100) / 100);

    if (repaymentAmount <= 0) {
      throw new BadRequestError('Repayment amount must be greater than zero.');
    }

    if (repaymentAmount > remaining) {
      throw new BadRequestError(
        `Repayment amount (₹${repaymentAmount}) cannot exceed remaining amount (₹${remaining}).`
      );
    }

    const repaymentDate = input.date ? new Date(input.date) : new Date();

    doc.repayments.push({
      amount: repaymentAmount,
      date: repaymentDate,
      note: input.note ? input.note.trim() : undefined,
      createdAt: new Date(),
    });

    doc.amountReturned = Math.round((doc.amountReturned + repaymentAmount) * 100) / 100;

    await doc.save();
    return toLendingDTO(doc);
  },

  /**
   * Calculates lending summary metrics for authenticated user
   */
  async getSummary(userId: string): Promise<LendingSummary> {
    const docs = await LendingModel.find({ userId: new Types.ObjectId(userId) });
    let totalLent = 0;
    let totalReturned = 0;
    let pendingCount = 0;
    let partiallyPaidCount = 0;
    let fullyPaidCount = 0;

    for (const d of docs) {
      totalLent += d.amount || 0;
      totalReturned += d.amountReturned || 0;
      if (d.status === 'PENDING') pendingCount++;
      else if (d.status === 'PARTIALLY_PAID') partiallyPaidCount++;
      else if (d.status === 'FULLY_PAID') fullyPaidCount++;
    }

    totalLent = Math.round(totalLent * 100) / 100;
    totalReturned = Math.round(totalReturned * 100) / 100;
    const totalOutstanding = Math.max(0, Math.round((totalLent - totalReturned) * 100) / 100);

    return {
      totalLent,
      totalReturned,
      totalOutstanding,
      pendingCount,
      partiallyPaidCount,
      fullyPaidCount,
    };
  },
};
