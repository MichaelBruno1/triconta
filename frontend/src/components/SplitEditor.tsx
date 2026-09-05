import { useEffect, useState } from 'react';
import type { Member } from '../types';
import { formatBRL } from '../utils/currency';

type SplitType = 'equal' | 'percentage' | 'exact';

export interface SplitData {
  splitType: SplitType;
  participantIds?: string[];
  splits?: { memberId: string; amountCents: number; percentage?: number }[];
}

interface Props {
  members: Member[];
  totalCents: number;
  initialSplitData?: SplitData;
  onChange: (data: SplitData) => void;
}

export default function SplitEditor({ members, totalCents, initialSplitData, onChange }: Props) {
  const [splitType, setSplitType] = useState<SplitType>(() => initialSplitData?.splitType ?? 'equal');
  const [selected, setSelected] = useState<string[]>(() => initialSplitData?.participantIds ?? members.map((m) => m.id));
  const [exactAmounts, setExactAmounts] = useState<Record<string, number>>(() => {
    if (initialSplitData?.splitType === 'exact' && initialSplitData.splits) {
      const map: Record<string, number> = {};
      for (const s of initialSplitData.splits) map[s.memberId] = s.amountCents;
      return map;
    }
    return {};
  });
  const [percentages, setPercentages] = useState<Record<string, number>>(() => {
    if (initialSplitData?.splitType === 'percentage' && initialSplitData.splits) {
      const map: Record<string, number> = {};
      for (const s of initialSplitData.splits) map[s.memberId] = s.percentage ?? 0;
      return map;
    }
    return {};
  });

  useEffect(() => {
    if (!initialSplitData) {
      setSelected(members.map((m) => m.id));
    }
  }, [members, initialSplitData]);

  useEffect(() => {
    if (!initialSplitData) return;
    setSplitType(initialSplitData.splitType);
    if (initialSplitData.splitType === 'equal' && initialSplitData.participantIds) {
      setSelected(initialSplitData.participantIds);
    } else if (initialSplitData.splitType === 'exact' && initialSplitData.splits) {
      const exactMap: Record<string, number> = {};
      for (const s of initialSplitData.splits) {
        exactMap[s.memberId] = s.amountCents;
      }
      setExactAmounts(exactMap);
    } else if (initialSplitData.splitType === 'percentage' && initialSplitData.splits) {
      const percentMap: Record<string, number> = {};
      for (const s of initialSplitData.splits) {
        percentMap[s.memberId] = s.percentage ?? 0;
      }
      setPercentages(percentMap);
    }
  }, [initialSplitData]);

  useEffect(() => {
    if (splitType === 'equal') {
      onChange({ splitType: 'equal', participantIds: selected });
    } else if (splitType === 'exact') {
      const splits = members
        .filter((m) => exactAmounts[m.id])
        .map((m) => ({ memberId: m.id, amountCents: exactAmounts[m.id] ?? 0 }));
      onChange({ splitType: 'exact', splits });
    } else {
      const splits = members
        .filter((m) => percentages[m.id])
        .map((m) => ({
          memberId: m.id,
          percentage: percentages[m.id] ?? 0,
          amountCents: Math.round((totalCents * (percentages[m.id] ?? 0)) / 100),
        }));
      onChange({ splitType: 'percentage', splits });
    }
  }, [splitType, selected, exactAmounts, percentages, totalCents]);

  const toggleMember = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const exactSum = Object.values(exactAmounts).reduce((a, b) => a + b, 0);
  const percentSum = Object.values(percentages).reduce((a, b) => a + b, 0);
  const exactValid = exactSum === totalCents;
  const percentValid = Math.abs(percentSum - 100) < 0.01;

  const tabs = [
    { id: 'equal', label: '⚖️ Igual' },
    { id: 'percentage', label: '% Percentual' },
    { id: 'exact', label: '# Valor exato' },
  ] as const;

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`btn btn-sm ${splitType === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSplitType(tab.id)}
          >{tab.label}</button>
        ))}
      </div>

      {splitType === 'equal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {members.map((m) => (
            <label key={m.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: selected.includes(m.id) ? 'rgba(59,130,246,0.1)' : 'var(--bg-input)',
              border: `1px solid ${selected.includes(m.id) ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}>
              <input
                type="checkbox"
                checked={selected.includes(m.id)}
                onChange={() => toggleMember(m.id)}
                style={{ width: 'auto', accentColor: 'var(--accent)' }}
              />
              <span style={{ flex: 1 }}>{m.name}</span>
              {selected.length > 0 && selected.includes(m.id) && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {formatBRL(Math.floor(totalCents / selected.length))}
                </span>
              )}
            </label>
          ))}
        </div>
      )}

      {splitType === 'percentage' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ flex: 1, fontSize: '0.9rem' }}>{m.name}</span>
                <div style={{ position: 'relative', width: '100px' }}>
                  <input
                    type="number"
                    min="0" max="100" step="0.01"
                    value={percentages[m.id] ?? ''}
                    onChange={(e) => setPercentages((p) => ({ ...p, [m.id]: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    style={{ paddingRight: '28px', textAlign: 'right' }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>%</span>
                </div>
                <span style={{ width: '80px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {formatBRL(Math.round((totalCents * (percentages[m.id] ?? 0)) / 100))}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: percentValid ? 'var(--success)' : 'var(--danger)' }}>
            Total: {percentSum.toFixed(1)}% {!percentValid && '(deve ser 100%)'}
          </div>
        </div>
      )}

      {splitType === 'exact' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ flex: 1, fontSize: '0.9rem' }}>{m.name}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={(exactAmounts[m.id] ?? 0) / 100 || ''}
                  onChange={(e) => setExactAmounts((p) => ({ ...p, [m.id]: Math.round(parseFloat(e.target.value || '0') * 100) }))}
                  placeholder="0,00"
                  style={{ width: '120px', textAlign: 'right' }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: exactValid ? 'var(--success)' : 'var(--danger)' }}>
            {exactValid ? '✓ Valores conferem' : `Faltam: ${formatBRL(totalCents - exactSum)}`}
          </div>
        </div>
      )}
    </div>
  );
}
