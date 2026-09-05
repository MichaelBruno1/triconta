import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, ArrowLeft, Users, DollarSign, History, Trash2, UserPlus, ChevronLeft, ChevronRight, Calendar, CheckCircle, HandCoins } from 'lucide-react';
import { useGroup } from '../hooks/useGroups';
import { useMembers } from '../hooks/useMembers';
import { useExpenses } from '../hooks/useExpenses';
import { useBalances } from '../hooks/useBalances';
import BalanceSummary from '../components/BalanceSummary';
import SuggestedSettlements from '../components/SuggestedSettlements';
import CurrencyInput from '../components/CurrencyInput';
import { formatBRL } from '../utils/currency';
import { api } from '../api/client';
import type { Expense, Settlement } from '../types';

// A DisplayExpense is either a regular expense or one installment entry of a parcelada expense.
interface DisplayExpense extends Omit<Expense, 'id'> {
  id: string;           // may be 'originalId-i' for installment entries
  originalId: string;   // the real DB expense id (for deletion)
  displayAmountCents: number; // amount to show (full or per-installment)
  installmentNumber?: number; // e.g. 2 (of 6)
}

/**
 * Expands installment expenses into one DisplayExpense entry per month.
 * Non-installment expenses pass through unchanged.
 */
function expandExpenses(expenses: Expense[] = []): DisplayExpense[] {
  const result: DisplayExpense[] = [];
  if (!Array.isArray(expenses)) return result;

  for (const expense of expenses) {
    if (!expense || !expense.expenseDate) continue;
    const n = expense.installments ?? 1;

    if (n <= 1) {
      result.push({
        ...expense,
        originalId: expense.id,
        displayAmountCents: expense.amountCents,
      });
      continue;
    }

    // Divide amount across installments; remainder goes to first
    const baseAmount = Math.floor(expense.amountCents / n);
    const remainder = expense.amountCents - baseAmount * n;
    const [y, m, d] = expense.expenseDate.split('-').map(Number);

    for (let i = 0; i < n; i++) {
      const date = new Date(y, m - 1 + i, d);
      const newDate = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');

      result.push({
        ...expense,
        id: `${expense.id}__${i}`,
        originalId: expense.id,
        expenseDate: newDate,
        displayAmountCents: i === 0 ? baseAmount + remainder : baseAmount,
        installmentNumber: i + 1,
      });
    }
  }

  return result;
}

type Tab = 'expenses' | 'balances' | 'settlements';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function toYearMonth(dateStr: string): string {
  // dateStr is 'YYYY-MM-DD'
  return dateStr.slice(0, 7); // 'YYYY-MM'
}

function formatYearMonth(ym: string): string {
  const [year, month] = ym.split('-');
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function GroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settlementsLoaded, setSettlementsLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth());
  const [selectedBalanceMonth, setSelectedBalanceMonth] = useState<string>(currentYearMonth());

  const { group, loading: gLoading, refetch: refetchGroup } = useGroup(groupId!);
  const { members, refetch: refetchMembers } = useMembers(groupId!);
  const { expenses, loading: eLoading, refetch: refetchExpenses } = useExpenses(groupId!);
  const { balances, suggested, loading: bLoading, refetch: refetchBalances } = useBalances(groupId!, selectedBalanceMonth);

  // Expand installment expenses into one entry per month
  const displayExpenses = useMemo(() => expandExpenses(expenses), [expenses]);

  // Sorted list of months that have at least one display entry (includes all installment months)
  const availableMonths = useMemo(() => {
    const months = new Set(displayExpenses.map((e) => toYearMonth(e.expenseDate)));
    // Always include current month so navigation works even with no expenses yet
    months.add(currentYearMonth());
    return Array.from(months).sort();
  }, [displayExpenses]);

  // Display entries filtered by selected month
  const filteredExpenses = useMemo(
    () => displayExpenses.filter((e) => toYearMonth(e.expenseDate) === selectedMonth),
    [displayExpenses, selectedMonth],
  );

  // Total for current real month — uses per-installment amounts
  const currentMonthTotal = useMemo(
    () =>
      displayExpenses
        .filter((e) => toYearMonth(e.expenseDate) === currentYearMonth())
        .reduce((sum, e) => sum + e.displayAmountCents, 0),
    [displayExpenses],
  );

  const hasPrev = availableMonths.some((m) => m < selectedMonth);
  const hasNext = availableMonths.some((m) => m > selectedMonth);

  const goPrev = () => {
    const prev = [...availableMonths].reverse().find((m) => m < selectedMonth);
    if (prev) setSelectedMonth(prev);
  };

  const goNext = () => {
    const next = availableMonths.find((m) => m > selectedMonth);
    if (next) setSelectedMonth(next);
  };

  const loadSettlements = useCallback(async () => {
    if (!groupId) return;
    const data = await api.getSettlements(groupId);
    setSettlements(data);
    setSettlementsLoaded(true);
  }, [groupId]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'settlements' && !settlementsLoaded) loadSettlements();
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !groupId) return;
    await api.addMember(groupId, { name: newMemberName.trim() });
    setNewMemberName('');
    setShowAddMember(false);
    refetchMembers();
    refetchGroup();
  };

  const handleDeleteExpense = async (originalId: string, installments?: number) => {
    const msg = installments && installments > 1
      ? `Excluir esta despesa parcelada (${installments}x)? Todas as parcelas serão removidas.`
      : 'Excluir esta despesa?';
    if (!groupId || !confirm(msg)) return;
    await api.deleteExpense(groupId, originalId);
    refetchExpenses();
    refetchBalances();
  };

  const handleDeleteSettlement = async (id: string) => {
    if (!groupId || !confirm('Desfazer este acerto?')) return;
    await api.deleteSettlement(groupId, id);
    loadSettlements();
    refetchBalances();
  };

  const [showAddSettlement, setShowAddSettlement] = useState(false);
  const [settlementFrom, setSettlementFrom] = useState('');
  const [settlementTo, setSettlementTo] = useState('');
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [settlementDateInput, setSettlementDateInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [settlementNotesInput, setSettlementNotesInput] = useState('');
  const [settlingManual, setSettlingManual] = useState(false);

  const handleManualSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !settlementFrom || !settlementTo || settlementAmount <= 0) {
      alert('Selecione quem pagou, quem recebeu e um valor maior que zero.');
      return;
    }
    if (settlementFrom === settlementTo) {
      alert('O pagador e o recebedor devem ser membros diferentes.');
      return;
    }
    setSettlingManual(true);
    try {
      await api.createSettlement(groupId, {
        fromMemberId: settlementFrom,
        toMemberId: settlementTo,
        amountCents: settlementAmount,
        settlementDate: settlementDateInput || new Date().toISOString().slice(0, 10),
        notes: settlementNotesInput.trim() || undefined,
      });
      setShowAddSettlement(false);
      setSettlementAmount(0);
      setSettlementNotesInput('');
      handleSettled();
    } catch (err) {
      alert('Erro ao registrar acerto.');
    } finally {
      setSettlingManual(false);
    }
  };

  const handleOpenManualSettlement = (fromId?: string, toId?: string, defaultAmountCents?: number) => {
    if (members.length >= 2) {
      setSettlementFrom(fromId || members[0]?.id || '');
      setSettlementTo(toId || members[1]?.id || '');
    }
    setSettlementAmount(defaultAmountCents || 0);
    setSettlementDateInput(new Date().toISOString().slice(0, 10));
    setSettlementNotesInput('');
    setShowAddSettlement(true);
  };

  const handleSettled = () => {
    loadSettlements();
    refetchBalances();
    setActiveTab('settlements');
    setSettlementsLoaded(false);
    loadSettlements();
  };

  if (gLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="skeleton" style={{ height: 60, borderRadius: 'var(--radius)' }} />
      <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius)' }} />
    </div>
  );

  if (!group) return <div style={{ color: 'var(--danger)', padding: '16px' }}>Grupo não encontrado.</div>;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/')}><ArrowLeft size={20} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '2px' }}>{group.name}</h1>
          {group.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{group.description}</p>}
        </div>
        <Link to={`/groups/${groupId}/expenses/new`} className="btn btn-primary btn-sm">
          <Plus size={16} /> Despesa
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{formatBRL(currentMonthTotal)}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Despesas em {MONTH_NAMES[new Date().getMonth()]}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--teal)' }}>{expenses.length}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Total de despesas</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{members.length}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Membros</div>
        </div>
      </div>

      {/* Members strip */}
      <div className="card" style={{ marginBottom: '20px', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '4px' }}><Users size={14} style={{ verticalAlign: 'middle' }} /></span>
          {members.map((m) => (
            <span key={m.id} className="badge badge-neutral">{m.name}</span>
          ))}
          <button className="btn btn-ghost btn-icon" style={{ marginLeft: 'auto' }} onClick={() => setShowAddMember(true)} title="Adicionar membro">
            <UserPlus size={16} />
          </button>
        </div>

        {showAddMember && (
          <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <input id="new-member-name" type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Nome do membro" autoFocus />
            <button type="submit" className="btn btn-primary btn-sm">Adicionar</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddMember(false)}>Cancelar</button>
          </form>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '1px' }}>
        {([['expenses', <DollarSign size={15} />, 'Despesas'], ['balances', <Users size={15} />, 'Saldos'], ['settlements', <History size={15} />, 'Acertos']] as const).map(([tab, icon, label]) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab as Tab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: 'none',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--accent)' : 'transparent'}`,
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab ? 600 : 400,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'var(--transition)',
              borderRadius: '0',
            }}
          >{icon}{label}</button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'expenses' && (
        <div className="animate-fade-in">
          {/* Month Navigator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '10px 16px',
          }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={goPrev}
              disabled={!hasPrev}
              style={{ opacity: hasPrev ? 1 : 0.3 }}
            >
              <ChevronLeft size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <Calendar size={15} color="var(--accent)" />
              <span>{formatYearMonth(selectedMonth)}</span>
              {selectedMonth === currentYearMonth() && (
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Atual</span>
              )}
            </div>

            <button
              className="btn btn-ghost btn-icon"
              onClick={goNext}
              disabled={!hasNext}
              style={{ opacity: hasNext ? 1 : 0.3 }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Month summary */}
          {!eLoading && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              padding: '0 4px',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {filteredExpenses.length} despesa{filteredExpenses.length !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatBRL(filteredExpenses.reduce((s, e) => s + e.amountCents, 0))}
              </span>
            </div>
          )}

          {eLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="empty-state card">
              <DollarSign size={40} />
              <p>Nenhuma despesa em {formatYearMonth(selectedMonth)}.</p>
              <Link to={`/groups/${groupId}/expenses/new`} className="btn btn-primary btn-sm">
                <Plus size={14} /> Adicionar despesa
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="card card-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                  onClick={() => navigate(`/groups/${groupId}/expenses/${expense.originalId}/edit`)}
                >
                  <div style={{
                    width: 42, height: 42, flexShrink: 0,
                    background: 'rgba(59,130,246,0.12)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                  }}>{expense.category?.icon ?? '💰'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{expense.description}</span>
                        {expense.installments && expense.installments > 1 && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                            Parcela {expense.installmentNumber} de {expense.installments}
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
                        {formatBRL(expense.displayAmountCents)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Pago por <strong style={{ color: 'var(--text-secondary)' }}>{expense.paidBy?.name}</strong> · {expense.expenseDate}
                      {expense.installments && expense.installments > 1 && (
                        <span style={{ color: 'var(--warning)' }}> · total {formatBRL(expense.amountCents)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteExpense(expense.originalId, expense.installments ?? undefined);
                    }}
                    title="Excluir despesa"
                  >
                    <Trash2 size={15} color="var(--danger)" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="animate-fade-in">
          {/* Month Navigator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '10px 16px',
          }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => {
                const [y, m] = selectedBalanceMonth.split('-').map(Number);
                const d = new Date(y, m - 2, 1);
                setSelectedBalanceMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <Calendar size={15} color="var(--accent)" />
              <span>{formatYearMonth(selectedBalanceMonth)}</span>
              {selectedBalanceMonth === currentYearMonth() && (
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Atual</span>
              )}
              {selectedBalanceMonth > currentYearMonth() && (
                <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>Projeção</span>
              )}
            </div>

            <button
              className="btn btn-ghost btn-icon"
              onClick={() => {
                const [y, m] = selectedBalanceMonth.split('-').map(Number);
                const d = new Date(y, m, 1);
                setSelectedBalanceMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Manual Settlement Modal / Card */}
          {showAddSettlement && (
            <div className="card animate-slide-up" style={{ marginBottom: '20px', border: '1px solid var(--accent)', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HandCoins size={18} color="var(--accent)" /> Registrar Pagamento / Acerto
                </span>
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowAddSettlement(false)}>✕</button>
              </div>

              <form onSubmit={handleManualSettlement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Quem pagou:</label>
                    <select value={settlementFrom} onChange={(e) => setSettlementFrom(e.target.value)} required>
                      {members.map((m) => (
                        <option key={m.id} value={m.id} disabled={m.id === settlementTo}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Para quem:</label>
                    <select value={settlementTo} onChange={(e) => setSettlementTo(e.target.value)} required>
                      {members.map((m) => (
                        <option key={m.id} value={m.id} disabled={m.id === settlementFrom}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Valor pago:</label>
                    <CurrencyInput value={settlementAmount} onChange={setSettlementAmount} placeholder="0,00" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Data:</label>
                    <input type="date" value={settlementDateInput} onChange={(e) => setSettlementDateInput(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observação (opcional):</label>
                  <input type="text" placeholder="Ex: Pix, adiantamento, parcial..." value={settlementNotesInput} onChange={(e) => setSettlementNotesInput(e.target.value)} maxLength={100} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddSettlement(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={settlingManual || settlementAmount <= 0}>
                    {settlingManual ? <div className="loading-spinner" style={{ width: 14, height: 14 }} /> : <><CheckCircle size={14} /> Salvar Pagamento</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {bLoading ? <div className="skeleton" style={{ height: 200 }} /> : (
            <>
              <p className="section-title" style={{ marginBottom: '14px' }}>Saldos individuais</p>
              <BalanceSummary balances={balances} />
              <div className="divider" style={{ margin: '20px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <p className="section-title" style={{ margin: 0 }}>Acertos sugeridos</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  onClick={() => handleOpenManualSettlement()}
                >
                  <Plus size={13} /> Outro acerto
                </button>
              </div>
              <SuggestedSettlements groupId={groupId!} settlements={suggested} onSettled={handleSettled} />
            </>
          )}
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenManualSettlement()}
            >
              <Plus size={15} /> Registrar Acerto
            </button>
          </div>

          {/* Manual Settlement Modal / Card under settlements tab */}
          {showAddSettlement && (
            <div className="card animate-slide-up" style={{ marginBottom: '20px', border: '1px solid var(--accent)', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HandCoins size={18} color="var(--accent)" /> Registrar Pagamento / Acerto
                </span>
                <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowAddSettlement(false)}>✕</button>
              </div>

              <form onSubmit={handleManualSettlement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Quem pagou:</label>
                    <select value={settlementFrom} onChange={(e) => setSettlementFrom(e.target.value)} required>
                      {members.map((m) => (
                        <option key={m.id} value={m.id} disabled={m.id === settlementTo}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Para quem:</label>
                    <select value={settlementTo} onChange={(e) => setSettlementTo(e.target.value)} required>
                      {members.map((m) => (
                        <option key={m.id} value={m.id} disabled={m.id === settlementFrom}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Valor pago:</label>
                    <CurrencyInput value={settlementAmount} onChange={setSettlementAmount} placeholder="0,00" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Data:</label>
                    <input type="date" value={settlementDateInput} onChange={(e) => setSettlementDateInput(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Observação (opcional):</label>
                  <input type="text" placeholder="Ex: Pix, adiantamento, parcial..." value={settlementNotesInput} onChange={(e) => setSettlementNotesInput(e.target.value)} maxLength={100} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddSettlement(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={settlingManual || settlementAmount <= 0}>
                    {settlingManual ? <div className="loading-spinner" style={{ width: 14, height: 14 }} /> : <><CheckCircle size={14} /> Salvar Pagamento</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {!settlementsLoaded ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loading-spinner" /></div>
          ) : settlements.length === 0 ? (
            <div className="empty-state card"><History size={40} /><p>Nenhum acerto registrado ainda.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {settlements.map((s) => (
                <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{s.fromMember?.name}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>pagou</span>
                    <span style={{ fontWeight: 600 }}>{formatBRL(s.amountCents)}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>para</span>
                    <span style={{ fontWeight: 600 }}>{s.toMember?.name}</span>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>{s.settlementDate}{s.notes && ` · ${s.notes}`}</div>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={() => handleDeleteSettlement(s.id)}>
                    <Trash2 size={15} color="var(--danger)" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
