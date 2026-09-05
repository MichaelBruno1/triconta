import { db } from '../db/connection.js';
import { expenses, expenseSplits, members } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export interface CreateExpenseInput {
  groupId: string;
  paidById: string;
  description: string;
  amountCents: number;
  expenseDate: string;
  categoryId?: string;
  splitType: 'equal' | 'percentage' | 'exact';
  installments?: number | null;
  participantIds?: string[]; // for equal split
  splits?: { memberId: string; amountCents: number; percentage?: number }[]; // for percentage/exact
}

export interface UpdateExpenseInput {
  groupId: string;
  paidById: string;
  description: string;
  amountCents: number;
  expenseDate: string;
  categoryId?: string | null;
  splitType: 'equal' | 'percentage' | 'exact';
  installments?: number | null;
  participantIds?: string[]; // for equal split
  splits?: { memberId: string; amountCents: number; percentage?: number }[]; // for percentage/exact
}

function calculateSplitsToInsert(
  expenseId: string,
  totalAmountCents: number,
  splitType: 'equal' | 'percentage' | 'exact',
  participantIds?: string[],
  splits?: { memberId: string; amountCents: number; percentage?: number }[],
) {
  let splitsToInsert: { expenseId: string; memberId: string; amountCents: number; percentage?: string }[] = [];

  if (splitType === 'equal') {
    const pIds = participantIds ?? [];
    if (pIds.length === 0) throw new ValidationError('participantIds required for equal split');

    const baseAmount = Math.floor(totalAmountCents / pIds.length);
    const remainder = totalAmountCents - baseAmount * pIds.length;

    splitsToInsert = pIds.map((memberId, idx) => ({
      expenseId,
      memberId,
      amountCents: idx === 0 ? baseAmount + remainder : baseAmount,
    }));
  } else {
    const sList = splits ?? [];
    if (sList.length === 0) throw new ValidationError('splits required for percentage/exact split');

    const sum = sList.reduce((acc, s) => acc + s.amountCents, 0);
    if (sum !== totalAmountCents) {
      throw new ValidationError(`Split amounts (${sum}) must equal total (${totalAmountCents})`);
    }

    splitsToInsert = sList.map((s) => ({
      expenseId,
      memberId: s.memberId,
      amountCents: s.amountCents,
      percentage: s.percentage != null ? String(s.percentage) : undefined,
    }));
  }

  return splitsToInsert;
}

export async function createExpenseWithSplits(input: CreateExpenseInput) {
  return await db.transaction(async (tx) => {
    const [expense] = await tx
      .insert(expenses)
      .values({
        groupId: input.groupId,
        paidById: input.paidById,
        description: input.description,
        amountCents: input.amountCents,
        expenseDate: input.expenseDate,
        categoryId: input.categoryId ?? null,
        splitType: input.splitType,
        installments: input.installments ?? null,
      })
      .returning();

    const splitsToInsert = calculateSplitsToInsert(
      expense.id,
      input.amountCents,
      input.splitType,
      input.participantIds,
      input.splits,
    );

    const insertedSplits = await tx.insert(expenseSplits).values(splitsToInsert).returning();

    return { ...expense, splits: insertedSplits };
  });
}

export async function updateExpenseWithSplits(expenseId: string, input: UpdateExpenseInput) {
  return await db.transaction(async (tx) => {
    const [updatedExpense] = await tx
      .update(expenses)
      .set({
        paidById: input.paidById,
        description: input.description,
        amountCents: input.amountCents,
        expenseDate: input.expenseDate,
        categoryId: input.categoryId ?? null,
        splitType: input.splitType,
        installments: input.installments ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(expenses.id, expenseId), eq(expenses.groupId, input.groupId)))
      .returning();

    if (!updatedExpense) {
      throw new NotFoundError('Expense not found');
    }

    // Delete old splits
    await tx.delete(expenseSplits).where(eq(expenseSplits.expenseId, expenseId));

    // Calculate and insert new splits
    const splitsToInsert = calculateSplitsToInsert(
      expenseId,
      input.amountCents,
      input.splitType,
      input.participantIds,
      input.splits,
    );

    const insertedSplits = await tx.insert(expenseSplits).values(splitsToInsert).returning();

    return { ...updatedExpense, splits: insertedSplits };
  });
}
