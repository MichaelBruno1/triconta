import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Trash2, ChevronRight } from 'lucide-react';
import { useGroups } from '../hooks/useGroups';
import { api } from '../api/client';

export default function HomePage() {
  const { groups, loading, error, refetch } = useGroups();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setSaving(true);
    try {
      const group = await api.createGroup({ name: newGroupName.trim(), description: newGroupDesc.trim() || undefined });
      setShowModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      navigate(`/groups/${group.id}`);
    } catch {
      alert('Erro ao criar grupo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Excluir grupo e todas as despesas?')) return;
    await api.deleteGroup(id);
    refetch();
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }} className="gradient-text">Meus Grupos</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>Gerencie despesas compartilhadas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Novo Grupo
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 88 }} />)}
        </div>
      )}

      {error && <div style={{ padding: '16px', background: 'var(--danger-bg)', borderRadius: 'var(--radius)', color: 'var(--danger)' }}>{error}</div>}

      {!loading && groups.length === 0 && (
        <div className="empty-state card" style={{ padding: '64px 24px' }}>
          <Users size={48} style={{ opacity: 0.3 }} />
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Nenhum grupo criado</p>
            <p style={{ fontSize: '0.85rem' }}>Crie seu primeiro grupo para começar a dividir despesas!</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Criar primeiro grupo
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {groups.map((group) => (
          <div
            key={group.id}
            className="card card-hover"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
            onClick={() => navigate(`/groups/${group.id}`)}
          >
            <div style={{
              width: 48,
              height: 48,
              background: 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(59,130,246,0.2))',
              border: '1px solid rgba(20,184,166,0.3)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0,
            }}>👥</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '2px' }}>{group.name}</div>
              {group.description && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.description}</div>}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span className="badge badge-neutral"><Users size={11} /> {group.members?.length ?? 0} membros</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button className="btn btn-ghost btn-icon" onClick={(e) => handleDelete(e, group.id)} title="Excluir">
                <Trash2 size={16} color="var(--danger)" />
              </button>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }} onClick={() => setShowModal(false)}>
          <div className="card animate-slide-up" style={{ width: '100%', maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontWeight: 700, marginBottom: '20px' }}>Novo Grupo</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nome do grupo *</label>
                <input id="group-name" type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Ex: Viagem, Apartamento..." autoFocus required />
              </div>
              <div className="form-group">
                <label className="form-label">Descrição (opcional)</label>
                <input id="group-desc" type="text" value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Descrição breve..." />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="loading-spinner" /> : <><Plus size={16} /> Criar Grupo</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
