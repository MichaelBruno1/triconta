import { useState } from 'react';
import type { SuggestedSettlement } from '../types';
import { formatBRL } from '../utils/currency';
import { ArrowRight, CheckCircle, ChevronDown, ChevronUp, DollarSign, Calendar, FileText } from 'lucide-react';
import { api } from '../api/client';
import CurrencyInput from './CurrencyInput';

interface Props {
  groupId: string;
  settlements: SuggestedSettlement[];
  onSettled: () => void;
}

export default function SuggestedSettlements({ groupId, settlements, onSettled }: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [payType, setPayType] = useState<'total' | 'partial'>('total');
  const [partialAmountCents, setPartialAmountCents] = useState<number>(0);
  const [settlementDate, setSettlementDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<string | null>(null);

  if (settlements.length === 0) {
    return (
      <div className="empty-state">
        <CheckCircle size={40} color="var(--success)" />
        <p style={{ color: 'var(--success)', fontWeight: 600 }}>Tudo certo! Sem dívidas pendentes.</p>
      </div>
    );
  }

  const handleOpenForm = (s: SuggestedSettlement) => {
    const key = `${s.fromMemberId}-${s.toMemberId}`;
    if (activeKey === key) {
      setActiveKey(null);
      return;
    }
    setActiveKey(key);
    setPayType('total');
    setPartialAmountCents(Math.round(s.amountCents / 2)); // sugestão inicial de 50%
    setSettlementDate(new Date().toISOString().slice(0, 10));
    setNotes('');
  };

  const handleSettle = async (s: SuggestedSettlement) => {
    const key = `${s.fromMemberId}-${s.toMemberId}`;
    const amount = payType === 'total' ? s.amountCents : partialAmountCents;

    if (amount <= 0) {
      alert('Informe um valor de pagamento válido (maior que zero).');
      return;
    }

    if (amount > s.amountCents) {
      const confirmExceed = confirm(
        `O valor informado (${formatBRL(amount)}) é maior que a dívida atual (${formatBRL(s.amountCents)}). Deseja continuar?`
      );
      if (!confirmExceed) return;
    }

    setLoading(key);
    try {
      await api.createSettlement(groupId, {
        fromMemberId: s.fromMemberId,
        toMemberId: s.toMemberId,
        amountCents: amount,
        settlementDate: settlementDate || new Date().toISOString().slice(0, 10),
        notes: notes.trim() || (payType === 'partial' ? 'Pagamento parcial' : undefined),
      });
      setActiveKey(null);
      onSettled();
    } catch (err) {
      alert('Erro ao registrar acerto.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {settlements.map((s) => {
        const key = `${s.fromMemberId}-${s.toMemberId}`;
        const isFormOpen = activeKey === key;
        const currentPayAmount = payType === 'total' ? s.amountCents : partialAmountCents;
        const remainingAmount = Math.max(0, s.amountCents - currentPayAmount);

        return (
          <div
            key={key}
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: isFormOpen ? '16px' : '0px',
              border: isFormOpen ? '1px solid var(--accent)' : undefined,
              transition: 'var(--transition)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
                cursor: 'pointer',
              }}
              onClick={() => handleOpenForm(s)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{s.fromMemberName}</span>
                <ArrowRight size={16} color="var(--text-muted)" />
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>{s.toMemberName}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {formatBRL(s.amountCents)}
                </span>
                <button
                  type="button"
                  className={`btn btn-sm ${isFormOpen ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenForm(s);
                  }}
                >
                  {isFormOpen ? (
                    <>
                      <ChevronUp size={14} /> Fechar
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} /> Fazer pagamento
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Painel de acerto com pagamento Total / Parcial */}
            {isFormOpen && (
              <div
                className="animate-slide-up"
                style={{
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius)',
                  padding: '16px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Escolha o tipo de pagamento:
                </div>

                {/* Seleção Tipo de Pagamento */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${payType === 'total' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ justifyContent: 'center', padding: '10px' }}
                    onClick={() => setPayType('total')}
                  >
                    Valor Total ({formatBRL(s.amountCents)})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${payType === 'partial' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ justifyContent: 'center', padding: '10px' }}
                    onClick={() => setPayType('partial')}
                  >
                    Valor Parcial
                  </button>
                </div>

                {/* Campo de valor parcial */}
                {payType === 'partial' && (
                  <div className="form-group animate-fade-in">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Valor a pagar agora:</span>
                      {remainingAmount > 0 && (
                        <span style={{ color: 'var(--warning)', fontWeight: 500 }}>
                          Restante: {formatBRL(remainingAmount)}
                        </span>
                      )}
                    </label>
                    <CurrencyInput
                      value={partialAmountCents}
                      onChange={setPartialAmountCents}
                      placeholder="0,00"
                    />

                    {/* Botões de atalho */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', padding: '2px 8px', border: '1px solid var(--border)' }}
                        onClick={() => setPartialAmountCents(Math.round(s.amountCents * 0.25))}
                      >
                        25% ({formatBRL(Math.round(s.amountCents * 0.25))})
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', padding: '2px 8px', border: '1px solid var(--border)' }}
                        onClick={() => setPartialAmountCents(Math.round(s.amountCents * 0.5))}
                      >
                        50% ({formatBRL(Math.round(s.amountCents * 0.5))})
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', padding: '2px 8px', border: '1px solid var(--border)' }}
                        onClick={() => setPartialAmountCents(Math.round(s.amountCents * 0.75))}
                      >
                        75% ({formatBRL(Math.round(s.amountCents * 0.75))})
                      </button>
                    </div>
                  </div>
                )}

                {/* Campos adicionais: Data e Notas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} /> Data do pagamento:
                    </label>
                    <input
                      type="date"
                      value={settlementDate}
                      onChange={(e) => setSettlementDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={13} /> Observação (opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Pix, dinheiro, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* Botões de Ação */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveKey(null)}
                    disabled={loading === key}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSettle(s)}
                    disabled={loading === key}
                  >
                    {loading === key ? (
                      <div className="loading-spinner" style={{ width: 14, height: 14 }} />
                    ) : (
                      <>
                        <CheckCircle size={14} /> Confirmar {formatBRL(currentPayAmount)}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
