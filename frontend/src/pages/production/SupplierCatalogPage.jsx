import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Star, Package, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';
import { gpaoAPI, suppliersAPI, productsAPI } from '../../api/client.js';

const fmt = n => Number(n || 0).toLocaleString('fr-DZ');

/* ── ADD MODAL (multi-articles, one supplier) ── */
function AddCatalogModal({ suppliers, products, onClose, onSave, loading }) {
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([
    { productId: '', price: 0, leadTime: 5, minQty: 1, isDefault: false, reference: '' },
  ]);

  const addRow = () => setItems(prev => [
    ...prev, { productId: '', price: 0, leadTime: 5, minQty: 1, isDefault: false, reference: '' },
  ]);
  const removeRow = idx => setItems(prev => prev.filter((_, i) => i !== idx));
  const setRow = (idx, k, v) => setItems(prev => {
    const next = [...prev]; next[idx] = { ...next[idx], [k]: v }; return next;
  });

  const validItems = items.filter(i => i.productId);
  const canSave = supplierId && validItems.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 780 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3><Truck size={15} style={{ display: 'inline', marginRight: 6 }} />Ajouter au catalogue fournisseur</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">

          {/* Supplier select */}
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label>Fournisseur *</label>
            <select className="form__input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">— Sélectionner un fournisseur —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Articles header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Articles ({items.length})
            </label>
            <button className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={addRow}>
              <Plus size={12} /> Ajouter une ligne
            </button>
          </div>

          {/* Column labels */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 90px 80px 80px 110px 36px 28px', gap: 6, marginBottom: 4, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, padding: '0 2px' }}>
            <span>Article *</span>
            <span style={{ textAlign: 'right' }}>Prix (DZD)</span>
            <span style={{ textAlign: 'right' }}>Délai (j)</span>
            <span style={{ textAlign: 'right' }}>Qté min.</span>
            <span>Réf. fourn.</span>
            <span style={{ textAlign: 'center' }} title="Fournisseur préférentiel">⭐</span>
            <span />
          </div>

          {/* Rows */}
          <div style={{ maxHeight: 340, overflowY: 'auto', display: 'grid', gap: 6, paddingRight: 2 }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 90px 80px 80px 110px 36px 28px', gap: 6, alignItems: 'center' }}>
                <select
                  className="form__input"
                  value={item.productId}
                  onChange={e => setRow(idx, 'productId', e.target.value)}
                  style={{ fontSize: 13 }}
                >
                  <option value="">— Choisir —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.sku ? `[${p.sku}] ` : ''}{p.name}
                    </option>
                  ))}
                </select>
                <input
                  className="form__input" type="number" value={item.price} min={0} step={0.01}
                  onChange={e => setRow(idx, 'price', +e.target.value)}
                  style={{ textAlign: 'right', fontSize: 13 }}
                />
                <input
                  className="form__input" type="number" value={item.leadTime} min={0}
                  onChange={e => setRow(idx, 'leadTime', +e.target.value)}
                  style={{ textAlign: 'right', fontSize: 13 }}
                />
                <input
                  className="form__input" type="number" value={item.minQty} min={1} step={0.001}
                  onChange={e => setRow(idx, 'minQty', +e.target.value)}
                  style={{ textAlign: 'right', fontSize: 13 }}
                />
                <input
                  className="form__input" value={item.reference}
                  onChange={e => setRow(idx, 'reference', e.target.value)}
                  placeholder="Réf. catalogue"
                  style={{ fontSize: 13 }}
                />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    title="Fournisseur préférentiel pour cet article"
                    checked={item.isDefault}
                    onChange={e => setRow(idx, 'isDefault', e.target.checked)}
                    style={{ accentColor: '#f59e0b', width: 16, height: 16, cursor: 'pointer' }}
                  />
                </div>
                <button
                  onClick={() => removeRow(idx)}
                  disabled={items.length === 1}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: items.length === 1 ? 'not-allowed' : 'pointer', color: 'var(--accent-danger)', padding: '4px 6px', opacity: items.length === 1 ? 0.3 : 1 }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {validItems.length === 0 && supplierId && (
            <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 6 }}>
              Sélectionnez au moins un article pour pouvoir enregistrer.
            </div>
          )}

          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
            <button
              className="btn btn--primary"
              disabled={loading || !canSave}
              onClick={() => onSave({ supplierId, items: validItems })}
            >
              {loading ? 'Enregistrement…' : `Ajouter ${validItems.length} article${validItems.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── EDIT MODAL (single entry) ─────────────────── */
function EditCatalogModal({ entry, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    price:     entry.price    ?? 0,
    leadTime:  entry.leadTime ?? 0,
    minQty:    entry.minQty   ?? 1,
    isDefault: entry.isDefault ?? false,
    reference: entry.reference || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>Modifier l'entrée catalogue</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>{entry.product?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {entry.product?.sku && `[${entry.product.sku}] `}{entry.supplier?.name}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Prix unitaire (DZD)</label>
              <input className="form__input" type="number" value={form.price} min={0} step={0.01} onChange={e => set('price', +e.target.value)} />
            </div>
            <div className="form-group">
              <label>Délai (jours)</label>
              <input className="form__input" type="number" value={form.leadTime} min={0} onChange={e => set('leadTime', +e.target.value)} />
            </div>
            <div className="form-group">
              <label>Qté min. commande</label>
              <input className="form__input" type="number" value={form.minQty} min={1} step={0.001} onChange={e => set('minQty', +e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Référence fournisseur</label>
            <input className="form__input" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Référence catalogue fournisseur" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
            <input type="checkbox" checked={form.isDefault} onChange={e => set('isDefault', e.target.checked)} style={{ accentColor: '#f59e0b' }} />
            <Star size={14} color={form.isDefault ? '#f59e0b' : undefined} />
            Fournisseur préférentiel pour cet article
          </label>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn--primary" disabled={loading} onClick={() => onSave(form)}>
              {loading ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN PAGE ─────────────────────────────────── */
export default function SupplierCatalogPage() {
  const qc = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [showAdd, setShowAdd]   = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [filterSupp, setFilterSupp] = useState('');
  const [filterProd, setFilterProd] = useState('');

  const params = {};
  if (filterSupp) params.supplierId = filterSupp;
  if (filterProd) params.productId  = filterProd;

  const { data, isLoading } = useQuery({
    queryKey: ['gpao-catalog', filterSupp, filterProd],
    queryFn:  () => gpaoAPI.catalog(params).then(r => r.data),
  });
  const { data: suppData } = useQuery({
    queryKey: ['suppliers-catalog'],
    queryFn:  () => suppliersAPI.getAll({ limit: 200 }).then(r => r.data || []),
  });
  const { data: prodData } = useQuery({
    queryKey: ['products-catalog'],
    queryFn:  () => productsAPI.getAll({ limit: 200 }).then(r => Array.isArray(r) ? r : (r?.data || [])),
  });

  const catalog   = data     || [];
  const suppliers = suppData || [];
  const products  = prodData || [];

  const addMut = useMutation({
    mutationFn: d => gpaoAPI.bulkCatalog(d),
    onSuccess: r => {
      qc.invalidateQueries({ queryKey: ['gpao-catalog'] });
      setShowAdd(false);
      toast.success(r?.message || 'Catalogue mis à jour');
    },
    onError: e => toast.error(e?.message || 'Erreur lors de l\'ajout'),
  });

  const editMut = useMutation({
    mutationFn: ({ id, data }) => gpaoAPI.updateCatalog(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gpao-catalog'] });
      setEditEntry(null);
      toast.success('Entrée mise à jour');
    },
    onError: e => toast.error(e?.message || 'Erreur lors de la modification'),
  });

  const deleteMut = useMutation({
    mutationFn: gpaoAPI.deleteCatalog,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gpao-catalog'] }); toast.success('Entrée supprimée'); },
    onError: e => toast.error(e?.message || 'Erreur'),
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Truck size={22} style={{ display: 'inline', marginRight: 8 }} />Catalogue fournisseurs
          </h1>
          <p className="page-subtitle">
            {catalog.length} entrée(s) — prix, délais et quantités minimales par fournisseur
          </p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Ajouter des articles
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 600, marginBottom: 16 }}>
        <div className="form-group">
          <label style={{ fontSize: 12 }}>Filtrer par fournisseur</label>
          <select className="form__input" value={filterSupp} onChange={e => setFilterSupp(e.target.value)}>
            <option value="">Tous les fournisseurs</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label style={{ fontSize: 12 }}>Filtrer par article</label>
          <select className="form__input" value={filterProd} onChange={e => setFilterProd(e.target.value)}>
            <option value="">Tous les articles</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Fournisseur</th>
              <th>Réf. fourn.</th>
              <th style={{ textAlign: 'right' }}>Prix unitaire</th>
              <th style={{ textAlign: 'center' }}>Délai (j)</th>
              <th style={{ textAlign: 'center' }}>Qté min.</th>
              <th style={{ textAlign: 'center' }}>Préférentiel</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="table-loading">Chargement…</td></tr>
            ) : catalog.length === 0 ? (
              <tr><td colSpan={8} className="table-empty">Aucune entrée dans le catalogue</td></tr>
            ) : catalog.map(entry => (
              <tr key={entry.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Package size={13} color="var(--text-muted)" />
                    <div>
                      <div style={{ fontWeight: 500 }}>{entry.product?.name}</div>
                      {entry.product?.sku && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.product.sku}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td>{entry.supplier?.name}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{entry.reference || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(entry.price)} DZD</td>
                <td style={{ textAlign: 'center' }}>{entry.leadTime}j</td>
                <td style={{ textAlign: 'center' }}>{fmt(entry.minQty)}</td>
                <td style={{ textAlign: 'center' }}>
                  {entry.isDefault
                    ? <Star size={16} color="#f59e0b" fill="#f59e0b" />
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td>
                  <div className="table-actions">
                    <button className="icon-btn" onClick={() => setEditEntry(entry)}>
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="icon-btn icon-btn--danger"
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Supprimer ${entry.product?.name} — ${entry.supplier?.name} ?`,
                          confirmLabel: 'Supprimer',
                          variant: 'danger',
                        });
                        if (ok) deleteMut.mutate(entry.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddCatalogModal
          suppliers={suppliers}
          products={products}
          onClose={() => setShowAdd(false)}
          onSave={d => addMut.mutate(d)}
          loading={addMut.isPending}
        />
      )}
      {editEntry && (
        <EditCatalogModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSave={d => editMut.mutate({ id: editEntry.id, data: d })}
          loading={editMut.isPending}
        />
      )}
      {confirmModal}
    </div>
  );
}
