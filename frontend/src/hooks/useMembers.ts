import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Member } from '../types';

export function useMembers(groupId: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const data = await api.getMembers(groupId);
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  return { members, loading, error, refetch: fetchMembers };
}
