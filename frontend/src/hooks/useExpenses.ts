import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Expense } from '../types';

export function useExpenses(groupId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const data = await api.getExpenses(groupId);
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      setExpenses([]);
      setError(err instanceof Error ? err.message : 'Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  return { expenses, loading, error, refetch: fetchExpenses };
}
