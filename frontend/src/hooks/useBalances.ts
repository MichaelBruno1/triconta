import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { MemberBalance, SuggestedSettlement } from '../types';

export function useBalances(groupId: string) {
  const [balances, setBalances] = useState<MemberBalance[]>([]);
  const [suggested, setSuggested] = useState<SuggestedSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const [b, s] = await Promise.all([
        api.getBalances(groupId),
        api.getSuggestedSettlements(groupId),
      ]);
      setBalances(b);
      setSuggested(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao calcular saldos');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  return { balances, suggested, loading, error, refetch: fetchBalances };
}
