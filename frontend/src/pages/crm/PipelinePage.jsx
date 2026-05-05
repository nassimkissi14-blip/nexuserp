import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersAPI } from '../../api/client.js';
import { Plus, Phone, Mail, ArrowRight, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';

const STAGES = [
  { key: 'LEAD',     label: 'Leads',     color: '#f59e0b', icon: '🎯', next: 'PROSPECT', nextLabel: '→ Qualifier' },
  { key: 'PROSPECT', label: 'Prospects', color: '#6366f1', icon: '👀', next: 'ACTIVE',   nextLabel: '→ Convertir' },
  { key: 'ACTIVE',   label: 'Clients',   color: '#10b981', icon: '✅', next: null,        nextLabel: null },
  { key: 'INACTIVE', label: 'Inactifs',  color: '#64748b', icon: '😴', next: null,        nextLabel: null },
];

const emptyForm = (status = 'LEAD') => ({ name: '', type: 'COMPANY', email: '', phone: '', country: 'Algérie', status });

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data } = useQuery({
    queryKey: ['customers-pipeline'],
    queryFn: () => customersAPI.getAll({ limit: 200 }).then(r => r.data || []),
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }) => customersAPI.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers-pipeline'] }); queryClient.invalidateQueries({ queryKey: ['customers'] }); toast.success('Statut mis à jour'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const createMutation = useMutation({
    mutationFn: customersAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers-pipeline'] }); queryClient.invalidateQueries({ queryKey: ['customers'] }); setModal(null); toast.success('✅ Lead ajouté !'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customersAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers-pipeline'] }); queryClient.invalidateQueries({ queryKey: ['customers'] }); setModal(null); toast.success('✅ Contact mis à jour'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: customersAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers-pipeline'] }); queryClient.invalidateQueries({ queryKey: ['customers'] }); toast.success('Contact supprimé'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modal?.type === 'edit') {
      updateMutation.mutate({ id: modal.customer.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (customer) => {
    setForm({ name: customer.name, type: customer.type, email: customer.email || '', phone: customer.phone || '', country: customer.country || 'Algérie', status: customer.status });
    setModal({ type: 'edit', customer });
  };

  const customers = data || [];
  const byStage = (key) => customers.filter(c => c.status === key);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Pipeline Commercial</h1>
          <p className="page-subtitle">{customers.filter(c => ['LEAD','PROSPECT'].includes(c.status)).length} opportunités actives · {customers.filter(c => c.status === 'ACTIVE').length} clients</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setForm(emptyForm()); setModal('create'); }}>
          <Plus size={16} /> Nouveau lead
        </button>
      </div>

      {/* KPI RAPIDE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {STAGES.map(stage => (
          <div key={stage.key} style={{ background: 'var(--bg-card)', border: `1px solid var(--border)`, borderTop: `3px solid ${stage.color}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{stage.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: stage.color }}>{byStage(stage.key).length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stage.label}</div>
          </div>
        ))}
      </div>

      {/* KANBAN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
        {STAGES.map(stage => (
          <div key={stage.key}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: stage.color + '18', border: `1px solid ${stage.color}33`, borderRadius: '10px 10px 0 0', borderBottom: `2px solid ${stage.color}` }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: stage.color }}>{stage.icon} {stage.label}</span>
              <span style={{ background: stage.color + '33', color: stage.color, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                {byStage(stage.key).length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0', minHeight: 100 }}>
              {byStage(stage.key).length === 0 ? (
                <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 8 }}>
                  Aucun contact
                </div>
              ) : byStage(stage.key).map(customer => (
                <div key={customer.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', transition: 'var(--transition)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = stage.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: stage.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginTop: 1 }}>
                      {customer.type === 'COMPANY' ? '🏢' : '👤'}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{customer.country || '—'}</div>
                    </div>
                    {/* Edit + Delete */}
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button className="icon-btn" style={{ padding: 3 }} title="Modifier" onClick={() => openEdit(customer)}><Edit2 size={11} /></button>
                      <button className="icon-btn icon-btn--danger" style={{ padding: 3 }} title="Supprimer"
                        onClick={async () => { const ok = await confirm({ title: `Supprimer "${customer.name}" ?`, confirmLabel: 'Supprimer', variant: 'danger' }); if (ok) deleteMutation.mutate(customer.id); }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {(customer.email || customer.phone) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
                      {customer.email && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}><Mail size={10} /> {customer.email}</div>}
                      {customer.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}><Phone size={10} /> {customer.phone}</div>}
                    </div>
                  )}

                  {stage.next && (
                    <button className="btn btn--ghost" style={{ width: '100%', fontSize: 11, padding: '5px 8px', justifyContent: 'center', color: stage.color, borderColor: stage.color + '44' }}
                      onClick={() => advanceMutation.mutate({ id: customer.id, status: stage.next })}>
                      <ArrowRight size={11} /> {stage.nextLabel}
                    </button>
                  )}
                </div>
              ))}

              {stage.key === 'LEAD' && (
                <button className="btn btn--ghost" style={{ fontSize: 12, padding: '8px', justifyContent: 'center', borderStyle: 'dashed', color: 'var(--text-muted)' }}
                  onClick={() => { setForm(emptyForm('LEAD')); setModal('create'); }}>
                  <Plus size={13} /> Ajouter un lead
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CREATE / EDIT */}
      {(modal === 'create' || modal?.type === 'edit') && (
        <Modal title={modal?.type === 'edit' ? `✏️ Modifier — ${modal.customer.name}` : '🎯 Nouveau lead'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Nom *</label><input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
              <div className="form-group"><label>Type</label>
                <select value={form.type} onChange={e => set('type', e.target.value)}>
                  <option value="COMPANY">Entreprise</option>
                  <option value="INDIVIDUAL">Particulier</option>
                </select>
              </div>
              <div className="form-group"><label>Statut</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
              <div className="form-group"><label>Téléphone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Pays</label><input value={form.country} onChange={e => set('country', e.target.value)} /></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Enregistrement…' : modal?.type === 'edit' ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {confirmModal}
    </div>
  );
}
