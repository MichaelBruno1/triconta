import { db } from '../db/connection.js';
import { expenses, expenseSplits, members } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { ValidationError } from '../utils/errors.js';

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

    let splitsToInsert: { expenseId: string; memberId: string; amountCents: number; percentage?: string }[] = [];

    if (input.splitType === 'equal') {
      const participantIds = input.participantIds ?? [];
      if (participantIds.length === 0) throw new ValidationError('participantIds required for equal split');

      const baseAmount = Math.floor(input.amountCents / participantIds.length);
      const remainder = input.amountCents - baseAmount * participantIds.length;

      splitsToInsert = participantIds.map((memberId, idx) => ({
        expenseId: expense.id,
        memberId,
        amountCents: idx === 0 ? baseAmount + remainder : baseAmount,
      }));
    } else {
      const splits = input.splits ?? [];
      if (splits.length === 0) throw new ValidationError('splits required for percentage/exact split');

      const sum = splits.reduce((acc, s) => acc + s.amountCents, 0);
      if (sum !== input.amountCents) {
        throw new ValidationError(`Split amounts (${sum}) must equal total (${input.amountCents})`);
      }

      splitsToInsert = splits.map((s) => ({
        expenseId: expense.id,
        memberId: s.memberId,
        amountCents: s.amountCents,
        percentage: s.percentage != null ? String(s.percentage) : undefined,
      }));
    }

    const insertedSplits = await tx.insert(expenseSplits).values(splitsToInsert).returning();

    return { ...expense, splits: insertedSplits };
  });
}
