import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { suppliersAPI } from '../../api/client.js';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';

const Modal = ({ title, onClose, children, size = 'md' }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: size === 'lg' ? 700 : 540 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

const emptyForm = () => ({ name: '', email: '', phone: '', address: '', country: 'DZ', taxId: '', paymentTerms: 30 });

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => suppliersAPI.getAll({ search: search || undefined, isActive: 'true' }).then(r => r),
  });

  const suppliers = data?.data || [];

  const createMutation = useMutation({
    mutationFn: suppliersAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); setModal(null); toast.success('✅ Fournisseur créé'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => suppliersAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); setModal(null); toast.success('✅ Fournisseur mis à jour'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: suppliersAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Fournisseur supprimé'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modal?.type === 'edit') {
      updateMutation.mutate({ id: modal.supplier.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏭 Fournisseurs</h1>
          <p className="page-subtitle">{suppliers.length} fournisseur(s) actif(s)</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setForm(emptyForm()); setModal('create'); }}><Plus size={16} /> Nouveau fournisseur</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total fournisseurs', value: suppliers.length, color: '#6366f1', icon: '🏭' },
          { label: 'Avec commandes', value: suppliers.filter(s => (s._count?.purchaseOrders || 0) > 0).length, color: '#f59e0b', icon: '📦' },
          { label: 'Délai paiement moyen', value: suppliers.length ? Math.round(suppliers.reduce((s, sup) => s + sup.paymentTerms, 0) / suppliers.length) + ' jours' : '—', color: '#10b981', icon: '💳' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${k.color}`, borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>{k.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginBottom: 4, letterSpacing: -0.5 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} className="search-input__icon" />
          <input placeholder="Nom, email, NIF…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead><tr><th>Fournisseur</th><th>Contact</th><th>Pays</th><th>NIF</th><th>Délai paiement</th><th>Commandes</th><th>Actions</th></tr></thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Aucun fournisseur
                </td></tr>
              ) : suppliers.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                    {s.address && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.address}</div>}
                  </td>
                  <td>
                    {s.email && <div style={{ fontSize: 12 }}>{s.email}</div>}
                    {s.phone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.phone}</div>}
                  </td>
                  <td style={{ fontSize: 13 }}>{s.country || '—'}</td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{s.taxId || '—'}</td>
                  <td>
                    <span className={`badge badge--${s.paymentTerms <= 30 ? 'green' : 'orange'}`}>
                      {s.paymentTerms} jours
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{s._count?.purchaseOrders || 0}</td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-btn" onClick={() => { setForm({ name: s.name, email: s.email || '', phone: s.phone || '', address: s.address || '', country: s.country || 'DZ', taxId: s.taxId || '', paymentTerms: s.paymentTerms }); setModal({ type: 'edit', supplier: s }); }}><Edit2 size={13} /></button>
                      <button className="icon-btn icon-btn--danger" onClick={async () => { const ok = await confirm({ title: `Supprimer "${s.name}" ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', variant: 'danger' }); if (ok) deleteMutation.mutate(s.id); }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FORM MODAL */}
      {(modal === 'create' || modal?.type === 'edit') && (
        <Modal title={modal?.type === 'edit' ? '✏️ Modifier le fournisseur' : '➕ Nouveau fournisseur'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group"><label>Nom *</label><input value={form.name} onChange={e => set('name', e.target.value)} required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
                <div className="form-group"><label>Téléphone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label>Adresse</label><input value={form.address} onChange={e => set('address', e.target.value)} /></div>
                <div className="form-group"><label>Pays</label><input value={form.country} onChange={e => set('country', e.target.value)} /></div>
                <div className="form-group"><label>NIF / ID fiscal</label><input value={form.taxId} onChange={e => set('taxId', e.target.value)} /></div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label>Délai de paiement (jours)</label><input type="number" value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} min="0" /></div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {confirmModal}
    </div>
  );
}
