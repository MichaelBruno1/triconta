import { db } from '../db/connection.js';
import { expenses, expenseSplits, members, settlements } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface MemberBalance {
  memberId: string;
  memberName: string;
  balanceCents: number; // positive = to receive, negative = owes
}

export interface SuggestedSettlement {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amountCents: number;
}

/**
 * Converts a YYYY-MM string to an absolute month number (year*12 + 0-based month).
 * Used for month comparisons.
 */
function toAbsMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
}

/**
 * Returns the current month as YYYY-MM.
 */
function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * For a given expense, returns the fraction (0..1) of its amount that is
 * "due" up to and including asOfYearMonth.
 *
 * - Non-installment expenses: 1 if expenseDate <= asOfYearMonth, else 0.
 * - Installment expenses: (passed installments / total installments).
 *   Example: R$600 in 6x starting July, asOf = September → 3/6.
 */
function installmentRatio(
  expenseDate: string,
  installments: number | null,
  asOfYearMonth: string,
): number {
  const expenseYM = expenseDate.slice(0, 7); // 'YYYY-MM'
  const cutoff = toAbsMonth(asOfYearMonth);

  // Non-installment: only count if the expense is on or before the cutoff month
  if (!installments || installments <= 1) {
    return toAbsMonth(expenseYM) <= cutoff ? 1 : 0;
  }

  // Installment: count how many installments have passed by the cutoff month
  const startAbsMonth = toAbsMonth(expenseYM);
  const passed = Math.min(Math.max(0, cutoff - startAbsMonth + 1), installments);
  return passed / installments;
}

export async function calculateBalances(
  groupId: string,
  asOfMonth?: string,
): Promise<MemberBalance[]> {
  const cutoffMonth = asOfMonth ?? currentYearMonth();

  const groupMembers = await db.query.members.findMany({
    where: eq(members.groupId, groupId),
  });

  const groupExpenses = await db.query.expenses.findMany({
    where: eq(expenses.groupId, groupId),
    with: { splits: true },
  });

  const groupSettlements = await db.query.settlements.findMany({
    where: eq(settlements.groupId, groupId),
  });

  const balanceMap = new Map<string, number>();
  for (const member of groupMembers) {
    balanceMap.set(member.id, 0);
  }

  // Credit payer and debit each participant for their effective share up to cutoffMonth.
  // For installments: only the installments due up to cutoffMonth are counted.
  // Unpaid installments from previous months carry forward naturally since we sum
  // all installments up to the cutoff and subtract only settled amounts.
  for (const expense of groupExpenses) {
    const ratio = installmentRatio(expense.expenseDate, expense.installments, cutoffMonth);
    if (ratio === 0) continue;

    const effectiveTotal = Math.round(expense.amountCents * ratio);

    balanceMap.set(expense.paidById, (balanceMap.get(expense.paidById) ?? 0) + effectiveTotal);

    for (const split of expense.splits) {
      const effectiveSplit = Math.round(split.amountCents * ratio);
      balanceMap.set(split.memberId, (balanceMap.get(split.memberId) ?? 0) - effectiveSplit);
    }
  }

  // Apply only settlements that were registered on or before the cutoff month.
  // This ensures future settlements don't affect past-month balances, and that
  // unpaid debts correctly carry forward into subsequent months.
  for (const settlement of groupSettlements) {
    const settlementYM = settlement.settlementDate.slice(0, 7);
    if (settlementYM > cutoffMonth) continue; // future settlement — ignore

    balanceMap.set(
      settlement.fromMemberId,
      (balanceMap.get(settlement.fromMemberId) ?? 0) - settlement.amountCents,
    );
    balanceMap.set(
      settlement.toMemberId,
      (balanceMap.get(settlement.toMemberId) ?? 0) + settlement.amountCents,
    );
  }

  return groupMembers.map((member) => ({
    memberId: member.id,
    memberName: member.name,
    balanceCents: balanceMap.get(member.id) ?? 0,
  }));
}

export function simplifyDebts(balances: MemberBalance[]): SuggestedSettlement[] {
  const creditors: { id: string; name: string; amount: number }[] = [];
  const debtors: { id: string; name: string; amount: number }[] = [];

  for (const b of balances) {
    if (b.balanceCents > 0) {
      creditors.push({ id: b.memberId, name: b.memberName, amount: b.balanceCents });
    } else if (b.balanceCents < 0) {
      debtors.push({ id: b.memberId, name: b.memberName, amount: -b.balanceCents });
    }
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const suggestions: SuggestedSettlement[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const transferAmount = Math.min(creditor.amount, debtor.amount);

    if (transferAmount > 0) {
      suggestions.push({
        fromMemberId: debtor.id,
        fromMemberName: debtor.name,
        toMemberId: creditor.id,
        toMemberName: creditor.name,
        amountCents: transferAmount,
      });
    }

    creditor.amount -= transferAmount;
    debtor.amount -= transferAmount;

    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }

  return suggestions;
}
