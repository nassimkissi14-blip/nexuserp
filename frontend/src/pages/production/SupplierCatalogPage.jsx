import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Star, Package, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { gpaoAPI, suppliersAPI, productsAPI } from '../../api/client.js';

const fmt = n => Number(n || 0).toLocaleString('fr-DZ');

function CatalogModal({ entry, suppliers, products, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    supplierId: entry?.supplierId || '',
    productId: entry?.productId || '',
    price: entry?.price ?? 0,
    leadTime: entry?.leadTime ?? 5,
    minQty: entry?.minQty ?? 1,
    isDefault: entry?.isDefault ?? false,
    reference: entry?.reference || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{entry ? 'Modifier l\'entrée catalogue' : 'Ajouter au catalogue'}</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal__body">
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="form-group">
              <label>Fournisseur *</label>
              <select className="form__input" value={form.supplierId} onChange={e => set('supplierId', e.target.value)} required disabled={!!entry}>
                <option value="">— Sélectionner —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Article *</label>
              <select className="form__input" value={form.productId} onChange={e => set('productId', e.target.value)} required disabled={!!entry}>
                <option value="">— Sélectionner —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.sku ? `[${p.sku}] ` : ''}{p.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group"><label>Prix unitaire (DZD)</label><input className="form__input" type="number" value={form.price} min={0} onChange={e => set('price', +e.target.value)} /></div>
              <div className="form-group"><label>Délai (jours)</label><input className="form__input" type="number" value={form.leadTime} min={0} onChange={e => set('leadTime', +e.target.value)} /></div>
              <div className="form-group"><label>Qté min. commande</label><input className="form__input" type="number" value={form.minQty} min={1} onChange={e => set('minQty', +e.target.value)} /></div>
            </div>
            <div className="form-group">
              <label>Référence fournisseur</label>
              <input className="form__input" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Référence catalogue fournisseur" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isDefault} onChange={e => set('isDefault', e.target.checked)} />
              <Star size={14} color={form.isDefault ? '#f59e0b' : undefined} />
              Fournisseur préférentiel pour cet article
            </label>
          </div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn--primary" disabled={loading || !form.supplierId || !form.productId} onClick={() => onSave(form)}>
              {loading ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SupplierCatalogPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [filterSupp, setFilterSupp] = useState('');
  const [filterProd, setFilterProd] = useState('');

  const params = {};
  if (filterSupp) params.supplierId = filterSupp;
  if (filterProd) params.productId = filterProd;

  const { data, isLoading } = useQuery({ queryKey: ['gpao-catalog', filterSupp, filterProd], queryFn: () => gpaoAPI.catalog(params).then(r => r.data) });
  const { data: suppData } = useQuery({ queryKey: ['suppliers-all'], queryFn: () => suppliersAPI.getAll({ limit: 200 }).then(r => r.data || []) });
  const { data: prodData } = useQuery({ queryKey: ['products-all'], queryFn: () => productsAPI.getAll({ limit: 200 }).then(r => Array.isArray(r) ? r : (r?.data || [])) });

  const catalog = data || [];
  const suppliers = suppData || [];
  const products = prodData || [];

  const saveMut = useMutation({
    mutationFn: form => modal?.id ? gpaoAPI.updateCatalog(modal.id, form) : gpaoAPI.addCatalog(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gpao-catalog'] }); setModal(null); toast.success('Catalogue mis à jour'); },
    onError: e => toast.error(e?.message || 'Erreur'),
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
          <h1 className="page-title"><Truck size={22} style={{ display: 'inline', marginRight: 8 }} />Catalogue fournisseurs</h1>
          <p className="page-subtitle">{catalog.length} entrée(s) — prix, délais et quantités minimales par fournisseur</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModal('new')}><Plus size={16} /> Ajouter</button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 600 }}>
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
                      {entry.product?.sku && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.product.sku}</div>}
                    </div>
                  </div>
                </td>
                <td>{entry.supplier?.name}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{entry.reference || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(entry.price)} DZD</td>
                <td style={{ textAlign: 'center' }}>{entry.leadTime}j</td>
                <td style={{ textAlign: 'center' }}>{fmt(entry.minQty)}</td>
                <td style={{ textAlign: 'center' }}>
                  {entry.isDefault ? <Star size={16} color="#f59e0b" fill="#f59e0b" /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td>
                  <div className="table-actions">
                    <button className="icon-btn" onClick={() => setModal(entry)}><Edit2 size={13} /></button>
                    <button className="icon-btn icon-btn--danger" onClick={() => { if (window.confirm('Supprimer cette entrée ?')) deleteMut.mutate(entry.id); }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <CatalogModal
          entry={modal === 'new' ? null : modal}
          suppliers={suppliers}
          products={products}
          onClose={() => setModal(null)}
          onSave={form => saveMut.mutate(form)}
          loading={saveMut.isPending}
        />
      )}
    </div>
  );
}
