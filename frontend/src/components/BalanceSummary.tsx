import type { MemberBalance } from '../types';
import { formatBRL } from '../utils/currency';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  balances: MemberBalance[];
}

export default function BalanceSummary({ balances }: Props) {
  if (balances.length === 0) {
    return (
      <div className="empty-state">
        <TrendingUp size={40} />
        <p>Nenhum saldo calculado ainda.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {balances.map((b) => {
        const isPositive = b.balanceCents > 0;
        const isNegative = b.balanceCents < 0;
        return (
          <div key={b.memberId} className="card" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: `3px solid ${isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'var(--border)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: isPositive ? 'var(--success-bg)' : isNegative ? 'var(--danger-bg)' : 'rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {isPositive ? <TrendingUp size={18} color="var(--success)" /> : isNegative ? <TrendingDown size={18} color="var(--danger)" /> : <Minus size={18} color="var(--text-muted)" />}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{b.memberName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {isPositive ? 'a receber' : isNegative ? 'a pagar' : 'quitado'}
                </div>
              </div>
            </div>
            <span className={isPositive ? 'amount-positive' : isNegative ? 'amount-negative' : 'amount-neutral'}>
              {isNegative ? '-' : ''}{formatBRL(Math.abs(b.balanceCents))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
