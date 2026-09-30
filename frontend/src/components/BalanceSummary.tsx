import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MemberBalance, MemberBalanceBreakdown } from '../types';
import { formatBRL } from '../utils/currency';
import { api } from '../api/client';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
} from 'lucide-react';

interface Props {
  balances: MemberBalance[];
  groupId?: string;
  selectedMonth?: string;
}

export default function BalanceSummary({ balances, groupId, selectedMonth }: Props) {
  const navigate = useNavigate();
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [breakdowns, setBreakdowns] = useState<Record<string, MemberBalanceBreakdown>>({});
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If selectedMonth changes and an item is expanded, fetch new data for it
  useEffect(() => {
    if (expandedMemberId && groupId) {
      loadBreakdown(expandedMemberId, selectedMonth);
    }
  }, [selectedMonth, groupId]);

  const loadBreakdown = async (memberId: string, month?: string) => {
    if (!groupId) return;
    const cacheKey = `${memberId}-${month ?? 'current'}`;
    if (breakdowns[cacheKey]) return;

    setLoadingMemberId(memberId);
    setError(null);
    try {
      const data = await api.getMemberBalanceBreakdown(groupId, memberId, month);
      setBreakdowns((prev) => ({ ...prev, [cacheKey]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes do saldo');
    } finally {
      setLoadingMemberId(null);
    }
  };

  const toggleMember = (memberId: string) => {
    if (expandedMemberId === memberId) {
      setExpandedMemberId(null);
    } else {
      setExpandedMemberId(memberId);
      loadBreakdown(memberId, selectedMonth);
    }
  };

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
        const isExpanded = expandedMemberId === b.memberId;
        const cacheKey = `${b.memberId}-${selectedMonth ?? 'current'}`;
        const breakdown = breakdowns[cacheKey];
        const isLoading = loadingMemberId === b.memberId;

        return (
          <div
            key={b.memberId}
            className="card card-hover"
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderLeft: `4px solid ${isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'var(--border)'}`,
              cursor: 'pointer',
              transition: 'var(--transition)',
              overflow: 'hidden',
            }}
            onClick={() => toggleMember(b.memberId)}
          >
            {/* Header row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: isPositive ? 'var(--success-bg)' : isNegative ? 'var(--danger-bg)' : 'rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {isPositive ? (
                    <TrendingUp size={20} color="var(--success)" />
                  ) : isNegative ? (
                    <TrendingDown size={20} color="var(--danger)" />
                  ) : (
                    <Minus size={20} color="var(--text-muted)" />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{b.memberName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {isPositive ? 'a receber no total' : isNegative ? 'a pagar no total' : 'quitado'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={isPositive ? 'amount-positive' : isNegative ? 'amount-negative' : 'amount-neutral'} style={{ fontSize: '1.05rem' }}>
                  {isNegative ? '-' : ''}{formatBRL(Math.abs(b.balanceCents))}
                </span>
                <div style={{ color: 'var(--text-muted)' }}>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
            </div>

            {/* Expanded Detailed Breakdown */}
            {isExpanded && (
              <div
                className="animate-fade-in"
                style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {isLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: '8px', color: 'var(--text-muted)' }}>
                    <div className="loading-spinner" />
                    <span style={{ fontSize: '0.85rem' }}>Calculando detalhes do saldo...</span>
                  </div>
                ) : error ? (
                  <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                    {error}
                  </div>
                ) : breakdown ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Summary cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '8px',
                    }}>
                      <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px',
                      }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          Pago em compras
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--teal)', marginTop: '2px' }}>
                          {formatBRL(breakdown.totalPaidExpensesCents)}
                        </div>
                      </div>

                      <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px',
                      }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          Sua parte (consumo)
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--danger)', marginTop: '2px' }}>
                          {formatBRL(breakdown.totalOwedSplitsCents)}
                        </div>
                      </div>

                      {(breakdown.totalSettlementsPaidCents > 0 || breakdown.totalSettlementsReceivedCents > 0) && (
                        <div style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px',
                        }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                            Acertos / Pagos
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)', marginTop: '2px' }}>
                            {formatBRL(breakdown.totalSettlementsPaidCents - breakdown.totalSettlementsReceivedCents)}
                          </div>
                        </div>
                      )}

                      <div style={{
                        background: isPositive ? 'var(--success-bg)' : isNegative ? 'var(--danger-bg)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isPositive ? 'rgba(16,185,129,0.3)' : isNegative ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px',
                      }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                          Saldo Líquido
                        </div>
                        <div style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'var(--text-muted)',
                          marginTop: '2px',
                        }}>
                          {breakdown.netBalanceCents < 0 ? '-' : ''}{formatBRL(Math.abs(breakdown.netBalanceCents))}
                        </div>
                      </div>
                    </div>

                    {/* Itemized list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '4px',
                        marginBottom: '4px',
                      }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                          Composição detalhada ({breakdown.items.length})
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Impacto no saldo
                        </span>
                      </div>

                      {breakdown.items.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Nenhuma despesa ou acerto registrado para este membro.
                        </div>
                      ) : (
                        breakdown.items.map((item) => {
                          const itemPositive = item.netImpactCents > 0;
                          const itemNegative = item.netImpactCents < 0;

                          return (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                padding: '10px 12px',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: item.type === 'expense' && groupId ? 'pointer' : 'default',
                                transition: 'var(--transition)',
                              }}
                              onClick={() => {
                                if (item.type === 'expense' && groupId) {
                                  navigate(`/groups/${groupId}/expenses/${item.id}/edit`);
                                }
                              }}
                              title={item.type === 'expense' ? 'Clique para ver ou editar esta despesa' : undefined}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                <div style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 'var(--radius-sm)',
                                  background: item.type === 'settlement' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '16px',
                                  flexShrink: 0,
                                }}>
                                  {item.type === 'settlement' ? '🤝' : item.category?.icon ?? '💰'}
                                </div>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                      {item.description}
                                    </span>
                                    {item.installments && (
                                      <span className="badge badge-neutral" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                        {item.installments.currentCount} de {item.installments.totalCount} parc.
                                      </span>
                                    )}
                                    {item.type === 'expense' && (
                                      <ExternalLink size={12} color="var(--text-muted)" style={{ opacity: 0.6 }} />
                                    )}
                                  </div>

                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    <span>{item.date}</span>
                                    {item.role === 'paid_and_shared' && (
                                      <span> · Pagou {formatBRL(item.paidByMemberCents)} / Sua parte {formatBRL(item.memberShareCents)}</span>
                                    )}
                                    {item.role === 'paid_only' && (
                                      <span> · Pagou {formatBRL(item.paidByMemberCents)} (não participou da divisão)</span>
                                    )}
                                    {item.role === 'shared_only' && (
                                      <span> · Sua parte {formatBRL(item.memberShareCents)}</span>
                                    )}
                                    {item.role === 'settlement_sent' && (
                                      <span> · Pagamento enviado (abate dívida)</span>
                                    )}
                                    {item.role === 'settlement_received' && (
                                      <span> · Pagamento recebido (reduz crédito)</span>
                                    )}
                                    {item.notes && <span> · {item.notes}</span>}
                                  </div>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <span
                                  className={itemPositive ? 'amount-positive' : itemNegative ? 'amount-negative' : 'amount-neutral'}
                                  style={{ fontSize: '0.9rem', fontWeight: 700 }}
                                >
                                  {itemPositive ? '+' : itemNegative ? '-' : ''}
                                  {formatBRL(Math.abs(item.netImpactCents))}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2px' }}>
                      💡 Clique em uma despesa para visualizar ou editar seus detalhes.
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
