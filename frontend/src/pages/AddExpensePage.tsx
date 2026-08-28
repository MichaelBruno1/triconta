import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import CurrencyInput from '../components/CurrencyInput';
import SplitEditor, { type SplitData } from '../components/SplitEditor';
import { useMembers } from '../hooks/useMembers';
import { api } from '../api/client';
import type { Category } from '../types';

export default function AddExpensePage() {
  const { groupId, expenseId } = useParams<{ groupId: string; expenseId?: string }>();
  const navigate = useNavigate();
  const { members } = useMembers(groupId!);
  const [categories, setCategories] = useState<Category[]>([]);

  const [description, setDescription] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [paidById, setPaidById] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [installments, setInstallments] = useState<number | undefined>();
  const [splitData, setSplitData] = useState<SplitData>({ splitType: 'equal', participantIds: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (groupId) api.getCategories(groupId).then(setCategories);
  }, [groupId]);

  useEffect(() => {
    if (members.length > 0 && !paidById) setPaidById(members[0].id);
  }, [members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (amountCents <= 0) { setError('Informe o valor da despesa'); return; }
    if (!paidById) { setError('Selecione quem pagou'); return; }
    if (splitData.splitType === 'equal' && (!splitData.participantIds || splitData.participantIds.length === 0)) {
      setError('Selecione pelo menos um participante'); return;
    }

    setSaving(true);
    try {
      const payload = {
        description,
        amountCents,
        paidById,
        expenseDate,
        categoryId: categoryId || undefined,
        splitType: splitData.splitType,
        installments: installments || null,
        ...(splitData.splitType === 'equal' ? { participantIds: splitData.participantIds } : { splits: splitData.splits }),
      };
      await api.createExpense(groupId!, payload);
      navigate(`/groups/${groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar despesa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
        <h1 style={{ fontWeight: 800, fontSize: '1.4rem' }}>Nova Despesa</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)' }}>Detalhes</h2>

          <div className="form-group">
            <label className="form-label" htmlFor="desc">Descrição *</label>
            <input id="desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Supermercado, Jantar..." required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="amount">Valor *</label>
            <CurrencyInput id="amount" value={amountCents} onChange={setAmountCents} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="paid-by">Pago por *</label>
              <select id="paid-by" value={paidById} onChange={(e) => setPaidById(e.target.value)} required>
                <option value="">Selecionar...</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="exp-date">Data</label>
              <input id="exp-date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="category">Categoria</label>
              <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="installments">Parcelado em</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="installments"
                  type="number" min="2" max="360"
                  value={installments ?? ''}
                  onChange={(e) => setInstallments(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="1 (à vista)"
                />
                {installments && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.82rem', pointerEvents: 'none' }}>x</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)' }}>Divisão</h2>
          <SplitEditor members={members} totalCents={amountCents} onChange={setSplitData} />
        </div>

        {error && <div style={{ padding: '12px 16px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <div className="loading-spinner" /> : <><Save size={16} /> Salvar Despesa</>}
          </button>
        </div>
      </form>
    </div>
  );
}
