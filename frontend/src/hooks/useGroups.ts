import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Group } from '../types';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getGroups();
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  return { groups, loading, error, refetch: fetchGroups };
}

export function useGroup(id: string) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroup = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getGroup(id);
      setGroup(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar grupo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  return { group, loading, error, refetch: fetchGroup };
}
