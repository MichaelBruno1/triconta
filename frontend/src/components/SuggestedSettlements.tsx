import { useState } from 'react';
import type { SuggestedSettlement } from '../types';
import { formatBRL } from '../utils/currency';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { api } from '../api/client';

interface Props {
  groupId: string;
  settlements: SuggestedSettlement[];
  onSettled: () => void;
}

export default function SuggestedSettlements({ groupId, settlements, onSettled }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  if (settlements.length === 0) {
    return (
      <div className="empty-state">
        <CheckCircle size={40} color="var(--success)" />
        <p style={{ color: 'var(--success)', fontWeight: 600 }}>Tudo certo! Sem dívidas pendentes.</p>
      </div>
    );
  }

  const handleSettle = async (s: SuggestedSettlement) => {
    const key = `${s.fromMemberId}-${s.toMemberId}`;
    setLoading(key);
    try {
      await api.createSettlement(groupId, {
        fromMemberId: s.fromMemberId,
        toMemberId: s.toMemberId,
        amountCents: s.amountCents,
        settlementDate: new Date().toISOString().slice(0, 10),
      });
      onSettled();
    } catch (err) {
      alert('Erro ao registrar acerto');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {settlements.map((s) => {
        const key = `${s.fromMemberId}-${s.toMemberId}`;
        return (
          <div key={key} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{s.fromMemberName}</span>
              <ArrowRight size={16} color="var(--text-muted)" />
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>{s.toMemberName}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '1rem' }}>{formatBRL(s.amountCents)}</span>
            </div>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleSettle(s)}
              disabled={loading === key}
            >
              {loading === key ? <div className="loading-spinner" style={{ width: 14, height: 14 }} /> : <><CheckCircle size={14} /> Marcar como pago</>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
