import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ChevronRight, Trash2, Eye, X } from 'lucide-react';
import { purchasesAPI, suppliersAPI, productsAPI } from '../../api/client.js';
import toast from 'react-hot-toast';

const STATUS = {
  DRAFT:     { label: 'Brouillon',  color: '#64748b', next: 'Envoyer' },
  SENT:      { label: 'Envoyé',     color: '#3b82f6', next: 'Confirmer' },
  CONFIRMED: { label: 'Confirmé',   color: '#6366f1', next: 'Réceptionner' },
  RECEIVED:  { label: 'Reçu',       color: '#10b981', next: null },
  CANCELLED: { label: 'Annulé',     color: '#ef4444', next: null },
};
const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(n) + ' DZD';

const Modal = ({ title, onClose, children, size = 'md' }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: size === 'lg' ? 780 : 560 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

const emptyForm = () => ({
  supplierId: '',
  orderDate: new Date().toISOString().split('T')[0],
  deliveryDate: '',
  notes: '',
  items: [{ productId: '', quantity: 1, unitPrice: '' }],
});

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', filterStatus, search],
    queryFn: () => purchasesAPI.getAll({ status: filterStatus !== 'ALL' ? filterStatus : undefined, search: search || undefined }).then(r => r),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => suppliersAPI.getAll({ limit: 200, isActive: 'true' }).then(r => r.data),
  });

  const { data: products } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsAPI.getAll({ limit: 200 }).then(r => r.data),
  });

  const orders = data?.data || [];

  const createMutation = useMutation({
    mutationFn: purchasesAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchases'] }); setModal(null); toast.success('✅ Bon de commande créé'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const advanceMutation = useMutation({
    mutationFn: purchasesAPI.advance,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['treasury'] });
      const msg = res?.data?.status === 'RECEIVED' ? '📦 Réception enregistrée — stock et trésorerie mis à jour' : '✅ Statut avancé';
      toast.success(msg);
    },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: purchasesAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchases'] }); toast.success('BDC annulé'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const setItem = (i, key, val) => setForm(f => {
    const items = [...f.items];
    items[i] = { ...items[i], [key]: val };
    if (key === 'productId' && val) {
      const prod = (products || []).find(p => p.id === val);
      if (prod) items[i].unitPrice = prod.buyPrice;
    }
    return { ...f, items };
  });

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { productId: '', quantity: 1, unitPrice: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const total = form.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, items: form.items.filter(it => it.productId && it.quantity && it.unitPrice) };
    createMutation.mutate(payload);
  };

  const handleAdvance = (id, status) => {
    const confirmMsg = status === 'CONFIRMED'
      ? 'Réceptionner ce bon de commande ?\nCela créera automatiquement des entrées de stock et une sortie en trésorerie.'
      : 'Avancer le statut de ce bon de commande ?';
    if (window.confirm(confirmMsg)) advanceMutation.mutate(id);
  };

  const totalBDC = orders.reduce((s, o) => s + o.totalAmount, 0);
  const received = orders.filter(o => o.status === 'RECEIVED').reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Bons de Commande Achats</h1>
          <p className="page-subtitle">{orders.length} BDC · {orders.filter(o => o.status === 'RECEIVED').length} reçu(s)</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setForm(emptyForm()); setModal('create'); }}><Plus size={16} /> Nouveau BDC</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total BDC', value: orders.length, color: '#6366f1', icon: '📋' },
          { label: 'En attente', value: orders.filter(o => ['DRAFT','SENT','CONFIRMED'].includes(o.status)).length, color: '#f59e0b', icon: '⏳' },
          { label: 'Total commandé', value: fmt(totalBDC), color: '#3b82f6', icon: '💰' },
          { label: 'Réceptionné', value: fmt(received), color: '#10b981', icon: '✅' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{k.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} className="search-input__icon" />
          <input placeholder="Référence, fournisseur…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`btn ${filterStatus === 'ALL' ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setFilterStatus('ALL')}>Tous</button>
          {Object.entries(STATUS).map(([k, s]) => (
            <button key={k} className={`btn ${filterStatus === k ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setFilterStatus(k)}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead><tr><th>Référence</th><th>Fournisseur</th><th>Articles</th><th>Montant</th><th>Date commande</th><th>Livraison prévue</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun bon de commande</td></tr>
              ) : orders.map(o => {
                const st = STATUS[o.status];
                return (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{o.reference}</td>
                    <td style={{ fontSize: 13 }}>{o.supplier?.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.items?.length || 0} article(s)</td>
                    <td style={{ fontWeight: 700, fontSize: 13 }}>{fmt(o.totalAmount)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(o.orderDate).toLocaleDateString('fr-FR')}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('fr-FR') : '—'}</td>
                    <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: st.color + '22', color: st.color }}>{st.label}</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="icon-btn" onClick={() => setModal({ type: 'view', order: o })}><Eye size={13} /></button>
                        {st.next && (
                          <button className="icon-btn" title={st.next} style={{ color: '#10b981' }} onClick={() => handleAdvance(o.id, o.status)}>
                            <ChevronRight size={13} />
                          </button>
                        )}
                        {['DRAFT', 'SENT'].includes(o.status) && (
                          <button className="icon-btn icon-btn--danger" onClick={() => { if (window.confirm('Annuler ce BDC ?')) deleteMutation.mutate(o.id); }}><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal?.type === 'view' && (
        <Modal title={`📦 BDC ${modal.order.reference}`} onClose={() => setModal(null)} size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Fournisseur', modal.order.supplier?.name],
                ['Statut', STATUS[modal.order.status]?.label],
                ['Date commande', new Date(modal.order.orderDate).toLocaleDateString('fr-FR')],
                ['Livraison prévue', modal.order.deliveryDate ? new Date(modal.order.deliveryDate).toLocaleDateString('fr-FR') : '—'],
                ['Montant total', fmt(modal.order.totalAmount)],
                ['Articles', `${modal.order.items?.length || 0} ligne(s)`],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
            {modal.order.items?.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Lignes commande</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: 'var(--bg-primary)' }}>{['Produit', 'Qté', 'Prix unit.', 'Total'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {modal.order.items.map((it, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px' }}>{it.product?.name || 'Produit'}</td>
                        <td style={{ padding: '8px 12px' }}>{it.quantity} {it.product?.unit || ''}</td>
                        <td style={{ padding: '8px 12px' }}>{fmt(it.unitPrice)}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>{fmt(it.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {modal.order.status === 'CONFIRMED' && (
              <div style={{ padding: '12px 16px', background: '#6366f111', borderRadius: 8, border: '1px solid #6366f133', fontSize: 13, color: '#6366f1' }}>
                💡 Cliquer sur "Réceptionner" créera automatiquement des entrées en stock et une sortie en trésorerie.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* CREATE MODAL */}
      {modal === 'create' && (
        <Modal title="➕ Nouveau BDC" onClose={() => setModal(null)} size="lg">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label>Fournisseur *</label>
                  <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))} required>
                    <option value="">— Choisir un fournisseur —</option>
                    {(suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Date commande</label><input type="date" value={form.orderDate} onChange={e => setForm(f => ({ ...f, orderDate: e.target.value }))} /></div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Livraison prévue</label><input type="date" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} /></div>
              </div>

              {/* Items */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Articles commandés</div>
                {form.items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 40px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                    <div>
                      {i === 0 && <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Produit *</label>}
                      <select value={item.productId} onChange={e => setItem(i, 'productId', e.target.value)} required>
                        <option value="">— Produit —</option>
                        {(products || []).map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                    </div>
                    <div>
                      {i === 0 && <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Quantité</label>}
                      <input type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} min="0.01" step="0.01" required />
                    </div>
                    <div>
                      {i === 0 && <label style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Prix unitaire</label>}
                      <input type="number" value={item.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)} min="0" required placeholder="PU" />
                    </div>
                    <div style={{ paddingBottom: 1 }}>
                      {form.items.length > 1 && <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeItem(i)}><X size={13} /></button>}
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn--ghost" style={{ fontSize: 12, padding: '4px 12px' }} onClick={addItem}><Plus size={12} /> Ajouter</button>
              </div>

              {total > 0 && <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 12, textAlign: 'right', fontWeight: 700, fontSize: 15, color: 'var(--accent-primary)' }}>Total : {fmt(total)}</div>}
              <div className="form-group"><label>Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: 'vertical' }} /></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Annuler</button>
              <button type="submit" className="btn btn--primary" disabled={createMutation.isPending}>{createMutation.isPending ? 'Création…' : 'Créer le BDC'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
