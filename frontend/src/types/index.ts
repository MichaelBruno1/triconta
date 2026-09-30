export interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  members?: Member[];
}

export interface Member {
  id: string;
  groupId: string;
  name: string;
  createdAt: string;
}

export interface Category {
  id: string;
  groupId?: string;
  name: string;
  icon: string;
  isDefault: boolean;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  memberId: string;
  amountCents: number;
  percentage?: string;
  member?: Member;
}

export interface Expense {
  id: string;
  groupId: string;
  paidById: string;
  description: string;
  amountCents: number;
  expenseDate: string;
  categoryId?: string;
  splitType: 'equal' | 'percentage' | 'exact';
  installments?: number;
  createdAt: string;
  updatedAt: string;
  paidBy?: Member;
  splits?: ExpenseSplit[];
  category?: Category;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
  settlementDate: string;
  notes?: string;
  createdAt: string;
  fromMember?: Member;
  toMember?: Member;
}

export interface MemberBalance {
  memberId: string;
  memberName: string;
  balanceCents: number;
}

export interface SuggestedSettlement {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amountCents: number;
}

export interface MemberBalanceDetailItem {
  id: string;
  type: 'expense' | 'settlement';
  description: string;
  date: string;
  category?: { name: string; icon: string } | null;
  installments?: {
    currentCount: number;
    totalCount: number;
  } | null;
  totalAmountCents: number;
  effectiveAmountCents: number;
  paidByMemberCents: number;
  memberShareCents: number;
  netImpactCents: number;
  role: 'paid_and_shared' | 'paid_only' | 'shared_only' | 'settlement_sent' | 'settlement_received';
  notes?: string | null;
}

export interface MemberBalanceBreakdown {
  memberId: string;
  memberName: string;
  asOfMonth: string;
  previousBalanceCents: number;
  totalPaidExpensesCents: number;
  totalOwedSplitsCents: number;
  totalSettlementsPaidCents: number;
  totalSettlementsReceivedCents: number;
  monthPaidExpensesCents: number;
  monthOwedSplitsCents: number;
  monthSettlementsPaidCents: number;
  monthSettlementsReceivedCents: number;
  monthNetCents: number;
  netBalanceCents: number;
  items: MemberBalanceDetailItem[];
}
