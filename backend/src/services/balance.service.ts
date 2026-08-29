import { db } from '../db/connection.js';
import { expenses, expenseSplits, members, settlements } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

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
 * Returns the fraction (0..1) of installments that are due up to and including
 * asOfYearMonth (YYYY-MM). Defaults to the current month.
 */
function installmentRatio(
  expenseDate: string,
  installments: number | null,
  asOfYearMonth?: string,
): number {
  if (!installments || installments <= 1) return 1;

  let cutoffAbsMonth: number;
  if (asOfYearMonth) {
    const [cy, cm] = asOfYearMonth.split('-').map(Number);
    cutoffAbsMonth = cy * 12 + (cm - 1);
  } else {
    const today = new Date();
    cutoffAbsMonth = today.getFullYear() * 12 + today.getMonth();
  }

  const [y, m] = expenseDate.split('-').map(Number);
  const startAbsMonth = y * 12 + (m - 1);

  const passed = Math.min(
    Math.max(0, cutoffAbsMonth - startAbsMonth + 1),
    installments,
  );

  return passed / installments;
}

export async function calculateBalances(
  groupId: string,
  asOfMonth?: string,
): Promise<MemberBalance[]> {
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

  // Add payments (payer gets credit) and deduct splits
  for (const expense of groupExpenses) {
    const ratio = installmentRatio(expense.expenseDate, expense.installments, asOfMonth);

    const effectiveTotal = Math.round(expense.amountCents * ratio);

    const current = balanceMap.get(expense.paidById) ?? 0;
    balanceMap.set(expense.paidById, current + effectiveTotal);

    for (const split of expense.splits) {
      const effectiveSplit = Math.round(split.amountCents * ratio);
      const curr = balanceMap.get(split.memberId) ?? 0;
      balanceMap.set(split.memberId, curr - effectiveSplit);
    }
  }

  // Apply settlements
  for (const settlement of groupSettlements) {
    const fromCurrent = balanceMap.get(settlement.fromMemberId) ?? 0;
    balanceMap.set(settlement.fromMemberId, fromCurrent - settlement.amountCents);

    const toCurrent = balanceMap.get(settlement.toMemberId) ?? 0;
    balanceMap.set(settlement.toMemberId, toCurrent + settlement.amountCents);
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

  // Sort descending
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
