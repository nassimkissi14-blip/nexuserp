import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ChevronRight, Trash2, Eye, X, Printer, Mail } from 'lucide-react';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { purchasesAPI, suppliersAPI, productsAPI } from '../../api/client.js';
import { useAuthStore } from '../../store/index.js';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';

/* ── Print BDC ───────────────────────────────────────────────── */
function printBDC(order, companyName = 'NexusERP') {
  const f = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';
  const d = (v) => v ? new Date(v).toLocaleDateString('fr-FR') : '—';
  const STATUS_LABELS = { DRAFT:'Brouillon', SENT:'Envoyé', CONFIRMED:'Confirmé', RECEIVED:'Reçu', CANCELLED:'Annulé' };
  const STATUS_COLORS = { DRAFT:'#64748b', SENT:'#3b82f6', CONFIRMED:'#6366f1', RECEIVED:'#10b981', CANCELLED:'#ef4444' };

  const rows = (order.items || []).map(it => `
    <tr>
      <td>${it.product?.name || '—'}</td>
      <td style="text-align:center">${it.quantity} ${it.product?.unit || ''}</td>
      <td style="text-align:right">${f(it.unitPrice)}</td>
      <td style="text-align:right;font-weight:700">${f(it.totalPrice)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
  <title>BDC ${order.reference}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;background:#fff}
    .page{max-width:800px;margin:0 auto;padding:40px 48px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4f46e5;padding-bottom:20px;margin-bottom:28px}
    .logo h1{font-size:24px;font-weight:900;color:#4f46e5}.logo p{font-size:11px;color:#64748b;margin-top:3px;line-height:1.5}
    .doc-title{font-size:22px;font-weight:800;color:#1e293b;text-align:right}
    .doc-ref{font-size:13px;color:#6366f1;font-weight:700;text-align:right;margin-top:4px}
    .badge{display:inline-block;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:20px;background:${STATUS_COLORS[order.status]}22;color:${STATUS_COLORS[order.status]}}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
    .party{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px}
    .party-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:6px}
    .party-name{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px}
    .party-detail{font-size:11.5px;color:#64748b;line-height:1.6}
    .section-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#6366f1;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin:20px 0 10px}
    table{width:100%;border-collapse:collapse;font-size:12.5px}
    thead tr{background:#1e293b}th{padding:9px 14px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;text-align:left}
    tbody tr{border-bottom:1px solid #f1f5f9}td{padding:10px 14px;color:#334155}
    .total-box{width:260px;margin-left:auto;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-top:16px}
    .total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #e2e8f0;color:#64748b}
    .total-row:last-child{border-bottom:none;padding:10px 12px;background:#4f46e5;border-radius:8px;margin-top:6px}
    .total-row:last-child span{font-size:15px;font-weight:800;color:white}
    .notes{margin-top:20px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12.5px;color:#475569}
    .footer{margin-top:36px;text-align:center;font-size:10.5px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:14px}
    .sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px}
    .sig-block{text-align:center}.sig-block p{font-size:11px;color:#94a3b8;margin-bottom:28px}
    .sig-line{border-top:1px solid #e2e8f0;padding-top:8px;font-size:11px;color:#64748b}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:20px 24px}}
  </style></head><body><div class="page">
    <div class="header">
      <div class="logo"><h1>${companyName}</h1><p>Bon de Commande</p></div>
      <div><div class="doc-title">BON DE COMMANDE</div><div class="doc-ref">${order.reference}</div></div>
    </div>
    <div class="badge">${STATUS_LABELS[order.status] || order.status}</div>
    <div class="parties">
      <div class="party">
        <div class="party-label">Émetteur</div>
        <div class="party-name">${companyName}</div>
        <div class="party-detail">Date commande : ${d(order.orderDate)}<br/>Livraison prévue : ${d(order.deliveryDate)}</div>
      </div>
      <div class="party">
        <div class="party-label">Fournisseur</div>
        <div class="party-name">${order.supplier?.name || '—'}</div>
        <div class="party-detail">${order.supplier?.email ? order.supplier.email + '<br/>' : ''}${order.supplier?.phone || ''}${order.supplier?.address ? '<br/>' + order.supplier.address : ''}</div>
      </div>
    </div>
    <div class="section-title">Articles commandés</div>
    <table>
      <thead><tr><th>Désignation</th><th style="text-align:center">Quantité</th><th style="text-align:right">Prix unitaire</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="total-box">
      <div class="total-row"><span>Total HT</span><span>${f(order.totalAmount)}</span></div>
      <div class="total-row"><span>TOTAL À PAYER</span><span>${f(order.totalAmount)}</span></div>
    </div>
    ${order.notes ? `<div class="notes"><strong>Notes :</strong> ${order.notes}</div>` : ''}
    <div class="sig">
      <div class="sig-block"><p>Signature du responsable achats</p><div class="sig-line">${companyName}</div></div>
      <div class="sig-block"><p>Cachet et signature fournisseur</p><div class="sig-line">${order.supplier?.name || ''}</div></div>
    </div>
    <div class="footer">Document généré par NexusERP — ${new Date().toLocaleDateString('fr-FR')}</div>
  </div>
  <script>window.onload=()=>window.print()</script></body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(html);
  win.document.close();
}

/* ── Email BDC ───────────────────────────────────────────────── */
function emailBDC(order, companyName = 'NexusERP') {
  const f = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';
  const d = (v) => v ? new Date(v).toLocaleDateString('fr-FR') : 'À définir';
  const itemLines = (order.items || []).map(it =>
    `• ${it.product?.name || 'Produit'} — Qté : ${it.quantity} — PU : ${f(it.unitPrice)} — Total : ${f(it.totalPrice)}`
  ).join('\n');

  const subject = encodeURIComponent(`Bon de Commande ${order.reference} — ${companyName}`);
  const body = encodeURIComponent(
`Bonjour,

Veuillez trouver ci-dessous notre bon de commande n° ${order.reference}.

─────────────────────────────────────
Référence    : ${order.reference}
Date         : ${d(order.orderDate)}
Livraison    : ${d(order.deliveryDate)}
Montant total: ${f(order.totalAmount)}
─────────────────────────────────────
ARTICLES COMMANDÉS :
${itemLines}
─────────────────────────────────────
${order.notes ? 'Notes : ' + order.notes + '\n' : ''}
Merci de nous confirmer la réception de ce bon de commande et la date de livraison.

Cordialement,
${companyName}`
  );

  window.open(`mailto:${order.supplier?.email || ''}?subject=${subject}&body=${body}`);
}

const STATUS = {
  DRAFT:     { label: 'Brouillon',  color: '#64748b', next: 'Envoyer' },
  SENT:      { label: 'Envoyé',     color: '#3b82f6', next: 'Confirmer' },
  CONFIRMED: { label: 'Confirmé',   color: '#6366f1', next: null },
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
  const { confirm, modal: confirmModal } = useConfirm();
  const { user } = useAuthStore();
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

  const handleAdvance = async (id, status) => {
    const isReceive = status === 'CONFIRMED';
    const ok = await confirm({
      title: isReceive ? 'Réceptionner le BDC ?' : 'Avancer le statut ?',
      message: isReceive ? 'Cela créera automatiquement des entrées de stock et une sortie en trésorerie.' : undefined,
      confirmLabel: isReceive ? 'Réceptionner' : 'Avancer',
      variant: 'info',
    });
    if (ok) advanceMutation.mutate(id);
  };

  const totalBDC = orders.reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Bons de Commande Achats</h1>
          <p className="page-subtitle">{orders.length} BDC · {orders.filter(o => o.status === 'CONFIRMED').length} confirmé(s)</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setForm(emptyForm()); setModal('create'); }}><Plus size={16} /> Nouveau BDC</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total BDC', value: orders.length, color: '#6366f1', icon: '📋' },
          { label: 'En cours', value: orders.filter(o => ['DRAFT','SENT'].includes(o.status)).length, color: '#f59e0b', icon: '⏳' },
          { label: 'Confirmés', value: orders.filter(o => o.status === 'CONFIRMED').length, color: '#10b981', icon: '✅' },
          { label: 'Total commandé', value: fmt(totalBDC), color: '#3b82f6', icon: '💰' },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${k.color}`, borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>{k.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, marginBottom: 4, letterSpacing: -0.5 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} className="search-input__icon" />
          <input placeholder="Référence, fournisseur…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <div className={`filter-pill${filterStatus === 'ALL' ? ' active' : ''}`}
            style={filterStatus === 'ALL' ? { background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.35)', color: '#818cf8' } : {}}
            onClick={() => setFilterStatus('ALL')}>Tous</div>
          {Object.entries(STATUS).map(([k, s]) => (
            <div key={k} className={`filter-pill${filterStatus === k ? ' active' : ''}`}
              style={filterStatus === k ? { background: `${s.color}18`, borderColor: `${s.color}44`, color: s.color } : {}}
              onClick={() => setFilterStatus(k)}>{s.label}</div>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={8} />
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
                    <td><span className={`badge badge--${o.status === 'RECEIVED' ? 'green' : o.status === 'CONFIRMED' ? 'indigo' : o.status === 'SENT' ? 'blue' : o.status === 'CANCELLED' ? 'red' : 'gray'} badge--dot`}>{st.label}</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="icon-btn" title="Voir" onClick={() => setModal({ type: 'view', order: o })}><Eye size={13} /></button>
                        <button className="icon-btn" title="Imprimer" onClick={() => printBDC(o, user?.company?.name)}><Printer size={13} /></button>
                        <button className="icon-btn" title="Envoyer par email" onClick={() => emailBDC(o, user?.company?.name)}><Mail size={13} /></button>
                        {st.next && (
                          <button className="icon-btn" title={st.next} style={{ color: '#10b981' }} onClick={() => handleAdvance(o.id, o.status)}>
                            <ChevronRight size={13} />
                          </button>
                        )}
                        {['DRAFT', 'SENT'].includes(o.status) && (
                          <button className="icon-btn icon-btn--danger" onClick={async () => { const ok = await confirm({ title: 'Annuler ce BDC ?', message: 'Le bon de commande sera annulé définitivement.', confirmLabel: 'Annuler', variant: 'danger' }); if (ok) deleteMutation.mutate(o.id); }}><Trash2 size={13} /></button>
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
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => printBDC(modal.order, user?.company?.name)}>
                <Printer size={14} /> Imprimer
              </button>
              <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => emailBDC(modal.order, user?.company?.name)}>
                <Mail size={14} /> Envoyer par email
              </button>
              {STATUS[modal.order.status]?.next && (
                <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => { handleAdvance(modal.order.id, modal.order.status); setModal(null); }}>
                  <ChevronRight size={14} /> {STATUS[modal.order.status].next}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE MODAL */}
      {confirmModal}
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
