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
