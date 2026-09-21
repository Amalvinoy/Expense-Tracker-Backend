import { Document, Types } from 'mongoose';

export const LENDING_STATUSES = ['PENDING', 'PARTIALLY_PAID', 'FULLY_PAID'] as const;
export type LendingStatus = typeof LENDING_STATUSES[number];

export interface IRepayment {
  _id?: Types.ObjectId;
  amount: number;
  date: Date;
  note?: string;
  createdAt: Date;
}

export interface ILendingDocument extends Document {
  userId: Types.ObjectId;
  personName: string;
  amount: number;
  amountReturned: number;
  remainingAmount: number;
  date: Date;
  note?: string;
  status: LendingStatus;
  repayments: IRepayment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RepaymentDTO {
  id: string;
  amount: number;
  date: string;
  note?: string;
  createdAt: string;
}

export interface LendingDTO {
  id: string;
  userId: string;
  personName: string;
  amount: number;
  amountReturned: number;
  remainingAmount: number;
  date: string;
  note?: string;
  status: LendingStatus;
  repayments: RepaymentDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLendingInput {
  personName: string;
  amount: number;
  date?: string | Date;
  note?: string;
}

export interface UpdateLendingInput {
  personName?: string;
  amount?: number;
  date?: string | Date;
  note?: string;
}

export interface RecordRepaymentInput {
  amount: number;
  date?: string | Date;
  note?: string;
}

export interface LendingSummary {
  totalLent: number;
  totalReturned: number;
  totalOutstanding: number;
  pendingCount: number;
  partiallyPaidCount: number;
  fullyPaidCount: number;
}
