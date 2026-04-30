import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsAPI } from '../../api/client.js';
import apiClient from '../../api/client.js';
import { Plus, TrendingUp, TrendingDown, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const movementsAPI = {
  getAll:  (params) => apiClient.get('/movements', { params }),
  create:  (data)   => apiClient.post('/movements', data),
  update:  (id, data) => apiClient.patch(`/movements/${id}`, data),
  delete:  (id)     => apiClient.delete(`/movements/${id}`),
};

const TYPE = {
  IN:         { label: 'Entrée',      color: '#10b981', icon: <TrendingUp size={13} />,    bg: '#10b98122' },
  OUT:        { label: 'Sortie',      color: '#ef4444', icon: <TrendingDown size={13} />,  bg: '#ef444422' },
  ADJUSTMENT: { label: 'Ajustement', color: '#f59e0b', icon: <RefreshCw size={13} />,     bg: '#f59e0b22' },
  TRANSFER:   { label: 'Transfert',  color: '#6366f1', icon: <RefreshCw size={13} />,     bg: '#6366f122' },
};

const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

const MovementForm = ({ products, initial, onSubmit, onCancel, isLoading, isEdit }) => {
  const [form, setForm] = useState(initial || { productId: '', type: 'IN', quantity: '', unitPrice: '', reference: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedProduct = products.find(p => p.id === form.productId);

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {!isEdit && (
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Produit *</label>
            <select value={form.productId} onChange={e => set('productId', e.target.value)} required>
              <option value="">-- Sélectionner un produit --</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.stockQty} {p.unit}</option>)}
            </select>
          </div>
        )}
        {!isEdit && (
          <div className="form-group">
            <label>Type de mouvement *</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}>
              {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        )}
        <div className="form-group" style={!isEdit ? {} : { gridColumn: '1 / -1' }}>
          <label>Quantité * {selectedProduct && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({selectedProduct.unit})</span>}</label>
          <input type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} required min="0.01" step="0.01" />
        </div>
        <div className="form-group">
          <label>Prix unitaire (DZD)</label>
          <input type="number" value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} min="0" />
        </div>
        <div className="form-group">
          <label>Référence</label>
          <input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="N° bon de commande…" />
        </div>
        <div className="form-group">
          <label>Notes</label>
          <input value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn--primary" disabled={isLoading}>{isLoading ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Enregistrer'}</button>
      </div>
    </form>
  );
};

export default function MovementsPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['movements', page, filterType],
    queryFn: () => movementsAPI.getAll({ page, limit: 20, type: filterType || undefined }),
    keepPreviousData: true,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsAPI.getAll({ limit: 200 }).then(r => r.data || []),
  });

  const createMutation = useMutation({
    mutationFn: movementsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      setShowForm(false);
      toast.success('✅ Mouvement enregistré !');
    },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => movementsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      setEditTarget(null);
      toast.success('✅ Mouvement mis à jour !');
    },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: movementsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      toast.success('🗑️ Mouvement supprimé et stock corrigé');
    },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const handleDelete = (m) => {
    if (!window.confirm(`Supprimer ce mouvement (${TYPE[m.type]?.label} × ${m.quantity} de ${m.product?.name}) ?\nLe stock sera corrigé automatiquement.`)) return;
    deleteMutation.mutate(m.id);
  };

  const movements = data?.data || [];
  const pagination = data?.pagination || {};

  const stats = {
    in: movements.filter(m => m.type === 'IN').reduce((s, m) => s + m.quantity, 0),
    out: movements.filter(m => m.type === 'OUT').reduce((s, m) => s + m.quantity, 0),
    total: pagination.total || 0,
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🔄 Mouvements de Stock</h1>
          <p className="page-subtitle">{pagination.total || 0} mouvement(s)</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowForm(true)}><Plus size={16} /> Nouveau mouvement</button>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total mouvements', value: stats.total, color: '#6366f1', icon: '🔄' },
          { label: 'Entrées (qté)', value: stats.in, color: '#10b981', icon: '📥' },
          { label: 'Sorties (qté)', value: stats.out, color: '#ef4444', icon: '📤' },
          { label: 'Ajustements', value: movements.filter(m => m.type === 'ADJUSTMENT').length, color: '#f59e0b', icon: '⚖️' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* FILTRES */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[['', 'Tous'], ...Object.entries(TYPE).map(([k, v]) => [k, v.label])].map(([val, label]) => (
          <button key={val} className={`btn ${filterType === val ? 'btn--primary' : 'btn--ghost'}`}
            style={{ padding: '6px 14px', fontSize: 13 }}
            onClick={() => { setFilterType(val); setPage(1); }}>{label}</button>
        ))}
      </div>

      {/* TABLE */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Produit</th><th>Type</th><th>Quantité</th><th>Prix unitaire</th><th>Référence</th><th>Notes</th><th style={{ position: 'sticky', right: 0, background: 'var(--bg-card)' }}>Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="table-loading">Chargement…</td></tr>
            ) : movements.length === 0 ? (
              <tr><td colSpan={8} className="table-empty">
                Aucun mouvement enregistré.{' '}
                <button className="btn btn--ghost" style={{ display: 'inline', fontSize: 12, padding: '2px 8px' }} onClick={() => setShowForm(true)}>Créer le premier</button>
              </td></tr>
            ) : movements.map(m => (
              <tr key={m.id}>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(m.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{m.product?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.product?.sku}</div>
                </td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: TYPE[m.type]?.bg, color: TYPE[m.type]?.color }}>
                    {TYPE[m.type]?.icon} {TYPE[m.type]?.label}
                  </span>
                </td>
                <td style={{ fontWeight: 700, color: m.type === 'IN' ? '#10b981' : m.type === 'OUT' ? '#ef4444' : 'var(--text-primary)' }}>
                  {m.type === 'IN' ? '+' : m.type === 'OUT' ? '-' : ''}{m.quantity} {m.product?.unit}
                </td>
                <td>{m.unitPrice ? fmt(m.unitPrice) : '—'}</td>
                <td><span className="tag">{m.reference || '—'}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.notes || '—'}</td>
                <td style={{ position: 'sticky', right: 0, background: 'var(--bg-card)', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn--ghost" style={{ padding: '4px 8px' }}
                      onClick={() => setEditTarget(m)}>
                      <Edit2 size={13} />
                    </button>
                    <button className="btn btn--ghost" style={{ padding: '4px 8px', color: '#ef4444' }}
                      onClick={() => handleDelete(m)}
                      disabled={deleteMutation.isPending}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <button className="pagination__btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          <span className="pagination__info">Page {page} / {pagination.pages}</span>
          <button className="pagination__btn" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}

      {showForm && (
        <Modal title="➕ Nouveau mouvement de stock" onClose={() => setShowForm(false)}>
          <MovementForm
            products={productsData || []}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </Modal>
      )}

      {editTarget && (
        <Modal title="✏️ Modifier le mouvement" onClose={() => setEditTarget(null)}>
          <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Produit : <strong style={{ color: 'var(--text-primary)' }}>{editTarget.product?.name}</strong> — Type : <strong style={{ color: TYPE[editTarget.type]?.color }}>{TYPE[editTarget.type]?.label}</strong>
          </div>
          <MovementForm
            products={productsData || []}
            initial={{ quantity: editTarget.quantity, unitPrice: editTarget.unitPrice || '', reference: editTarget.reference || '', notes: editTarget.notes || '' }}
            onSubmit={(data) => updateMutation.mutate({ id: editTarget.id, data })}
            onCancel={() => setEditTarget(null)}
            isLoading={updateMutation.isPending}
            isEdit
          />
        </Modal>
      )}
    </div>
  );
}
