const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Groups
  getGroups: () => request<import('../types').Group[]>('/groups'),
  getGroup: (id: string) => request<import('../types').Group>(`/groups/${id}`),
  createGroup: (data: { name: string; description?: string }) =>
    request<import('../types').Group>('/groups', { method: 'POST', body: JSON.stringify(data) }),
  updateGroup: (id: string, data: { name: string; description?: string }) =>
    request<import('../types').Group>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id: string) =>
    request<void>(`/groups/${id}`, { method: 'DELETE' }),

  // Members
  getMembers: (groupId: string) =>
    request<import('../types').Member[]>(`/groups/${groupId}/members`),
  addMember: (groupId: string, data: { name: string }) =>
    request<import('../types').Member>(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (groupId: string, id: string, data: { name: string }) =>
    request<import('../types').Member>(`/groups/${groupId}/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (groupId: string, id: string) =>
    request<void>(`/groups/${groupId}/members/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: (groupId: string) =>
    request<import('../types').Category[]>(`/groups/${groupId}/categories`),

  // Expenses
  getExpenses: (groupId: string) =>
    request<import('../types').Expense[]>(`/groups/${groupId}/expenses`),
  getExpense: (groupId: string, id: string) =>
    request<import('../types').Expense>(`/groups/${groupId}/expenses/${id}`),
  createExpense: (groupId: string, data: unknown) =>
    request<import('../types').Expense>(`/groups/${groupId}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (groupId: string, id: string, data: unknown) =>
    request<import('../types').Expense>(`/groups/${groupId}/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (groupId: string, id: string) =>
    request<void>(`/groups/${groupId}/expenses/${id}`, { method: 'DELETE' }),

  // Balances
  getBalances: (groupId: string) =>
    request<import('../types').MemberBalance[]>(`/groups/${groupId}/balances`),
  getSuggestedSettlements: (groupId: string) =>
    request<import('../types').SuggestedSettlement[]>(`/groups/${groupId}/balances/settlements`),

  // Settlements
  getSettlements: (groupId: string) =>
    request<import('../types').Settlement[]>(`/groups/${groupId}/settlements`),
  createSettlement: (groupId: string, data: unknown) =>
    request<import('../types').Settlement>(`/groups/${groupId}/settlements`, { method: 'POST', body: JSON.stringify(data) }),
  deleteSettlement: (groupId: string, id: string) =>
    request<void>(`/groups/${groupId}/settlements/${id}`, { method: 'DELETE' }),
};
