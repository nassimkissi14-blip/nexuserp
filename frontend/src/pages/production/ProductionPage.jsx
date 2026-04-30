import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Play, CheckCircle, Pause, AlertTriangle, Clock,
  Cpu, Layers, BarChart2, ChevronRight, Package, Zap, Target,
  TrendingUp, Settings, List, ArrowRight, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../api/client.js';

/* ── API ─────────────────────────────────────────────────────────── */
const api = {
  dashboard:   ()       => apiClient.get('/production/dashboard'),
  orders:      (p)      => apiClient.get('/production/orders', { params: p }),
  createOrder: (d)      => apiClient.post('/production/orders', d),
  updateOrder: (id, d)  => apiClient.patch(`/production/orders/${id}`, d),
  deleteOrder: (id)     => apiClient.delete(`/production/orders/${id}`),
  getOrder:    (id)     => apiClient.get(`/production/orders/${id}`),
  bom:         ()       => apiClient.get('/production/bom'),
  createBom:   (d)      => apiClient.post('/production/bom', d),
  updateBom:   (id, d)  => apiClient.patch(`/production/bom/${id}`, d),
  deleteBom:   (id)     => apiClient.delete(`/production/bom/${id}`),
  workcenters: ()       => apiClient.get('/production/workcenters'),
  createWC:    (d)      => apiClient.post('/production/workcenters', d),
  updateWC:    (id, d)  => apiClient.patch(`/production/workcenters/${id}`, d),
  deleteWC:    (id)     => apiClient.delete(`/production/workcenters/${id}`),
  updateOp:    (id, d)  => apiClient.patch(`/production/operations/${id}`, d),
  products:    ()       => apiClient.get('/products'),
};

/* ── Constants ───────────────────────────────────────────────────── */
const KANBAN_COLS = [
  { key: 'DRAFT',       label: 'Brouillon',  color: '#64748b', icon: '📋' },
  { key: 'PLANNED',     label: 'Planifié',   color: '#6366f1', icon: '🗓️' },
  { key: 'IN_PROGRESS', label: 'En cours',   color: '#f59e0b', icon: '⚙️' },
  { key: 'COMPLETED',   label: 'Terminé',    color: '#10b981', icon: '✅' },
];

const ORDER_STATUS = {
  DRAFT:       { label: 'Brouillon',  color: '#64748b' },
  PLANNED:     { label: 'Planifié',   color: '#6366f1' },
  IN_PROGRESS: { label: 'En cours',   color: '#f59e0b' },
  COMPLETED:   { label: 'Terminé',    color: '#10b981' },
  PAUSED:      { label: 'Suspendu',   color: '#ef4444' },
  CANCELLED:   { label: 'Annulé',     color: '#94a3b8' },
};
const PRIORITY = {
  LOW:      { label: 'Faible',   color: '#64748b' },
  MEDIUM:   { label: 'Normale',  color: '#6366f1' },
  HIGH:     { label: 'Haute',    color: '#f59e0b' },
  CRITICAL: { label: 'Critique', color: '#ef4444' },
};

const fmt    = n => Number(n || 0).toLocaleString('fr-DZ');
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

/* ── Small components ────────────────────────────────────────────── */
const Badge = ({ map, value }) => {
  const s = map[value] || { label: value, color: '#64748b' };
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: s.color + '22', color: s.color
    }}>{s.label}</span>
  );
};

const Modal = ({ title, onClose, children, width = 620 }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
      <div className="modal__header">
        <h3>{title}</h3>
        <button className="modal__close" onClick={onClose}><X size={15} /></button>
      </div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

/* ── Progress bar ────────────────────────────────────────────────── */
const ProgressBar = ({ value, max, color = '#6366f1', height = 6 }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ background: '#1e293b', borderRadius: 99, height, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, background: color,
        borderRadius: 99, transition: 'width .4s ease'
      }} />
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   PRODUCTION ORDER MODAL
══════════════════════════════════════════════════════════════════ */
function OrderModal({ order, products, workcenters, boms, onClose, onSave }) {
  const [form, setForm] = useState({
    productId: order?.productId || '',
    bomId: order?.bomId || '',
    quantity: order?.quantity || '',
    priority: order?.priority || 'MEDIUM',
    plannedStart: order?.plannedStart?.slice(0, 10) || '',
    plannedEnd: order?.plannedEnd?.slice(0, 10) || '',
    operations: order?.operations || [],
  });

  const addOp = () => setForm(f => ({
    ...f,
    operations: [...f.operations, { name: '', workCenterId: '', estimatedHours: '', sequence: f.operations.length + 1 }]
  }));
  const removeOp = i => setForm(f => ({ ...f, operations: f.operations.filter((_, idx) => idx !== i) }));
  const setOp = (i, k, v) => setForm(f => {
    const ops = [...f.operations];
    ops[i] = { ...ops[i], [k]: v };
    return { ...f, operations: ops };
  });

  const prods = products?.data || products || [];
  const wcs   = workcenters || [];
  const bList = boms || [];

  return (
    <Modal title={order ? `Modifier OF ${order.number}` : 'Nouvel ordre de fabrication'} onClose={onClose} width={720}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <label style={{ gridColumn: '1/-1' }}>
          <span className="form__label">Produit fini *</span>
          <select className="form__input" value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
            <option value="">Sélectionner…</option>
            {prods.map(p => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` — ${p.sku}` : ''}</option>)}
          </select>
        </label>
        <label>
          <span className="form__label">Nomenclature (BOM)</span>
          <select className="form__input" value={form.bomId} onChange={e => setForm(f => ({ ...f, bomId: e.target.value }))}>
            <option value="">Sans nomenclature</option>
            {bList.map(b => <option key={b.id} value={b.id}>v{b.version} — {b.product?.name}</option>)}
          </select>
        </label>
        <label>
          <span className="form__label">Priorité</span>
          <select className="form__input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label>
          <span className="form__label">Quantité à produire *</span>
          <input className="form__input" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
        </label>
        <label>
          <span className="form__label">Début planifié</span>
          <input className="form__input" type="date" value={form.plannedStart} onChange={e => setForm(f => ({ ...f, plannedStart: e.target.value }))} />
        </label>
        <label>
          <span className="form__label">Fin planifiée</span>
          <input className="form__input" type="date" value={form.plannedEnd} onChange={e => setForm(f => ({ ...f, plannedEnd: e.target.value }))} />
        </label>
      </div>

      {/* Operations */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Opérations ({form.operations.length})</span>
          <button className="btn btn--sm btn--secondary" onClick={addOp}>
            <Plus size={13} /> Ajouter
          </button>
        </div>
        {form.operations.map((op, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
            <label>
              <span className="form__label" style={{ fontSize: 10 }}>Opération</span>
              <input className="form__input" value={op.name} onChange={e => setOp(i, 'name', e.target.value)} placeholder="ex: Assemblage" />
            </label>
            <label>
              <span className="form__label" style={{ fontSize: 10 }}>Poste de charge</span>
              <select className="form__input" value={op.workCenterId || ''} onChange={e => setOp(i, 'workCenterId', e.target.value)}>
                <option value="">— Aucun —</option>
                {wcs.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <label>
              <span className="form__label" style={{ fontSize: 10 }}>Heures est.</span>
              <input className="form__input" type="number" value={op.estimatedHours} onChange={e => setOp(i, 'estimatedHours', e.target.value)} placeholder="0" />
            </label>
            <button onClick={() => removeOp(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn btn--secondary" onClick={onClose}>Annuler</button>
        <button className="btn btn--primary" onClick={() => {
          if (!form.productId) { toast.error('Sélectionner un produit'); return; }
          if (!form.quantity || Number(form.quantity) <= 0) { toast.error('Quantité invalide'); return; }
          onSave({ ...form, bomId: form.bomId || null });
        }}>
          {order ? 'Enregistrer' : 'Créer l\'OF'}
        </button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BOM MODAL
══════════════════════════════════════════════════════════════════ */
function BomModal({ bom, products, onClose, onSave }) {
  const prods = products?.data || products || [];
  const [form, setForm] = useState({
    productId: bom?.productId || '',
    version: bom?.version || '1.0',
    isActive: bom?.isActive ?? true,
    items: bom?.items?.map(i => ({ productId: i.productId, quantity: i.quantity, unit: i.unit })) || [],
  });

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { productId: '', quantity: 1, unit: 'pcs' }] }));
  const removeItem = i => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const setItem = (i, k, v) => setForm(f => {
    const items = [...f.items];
    items[i] = { ...items[i], [k]: v };
    return { ...f, items };
  });

  return (
    <Modal title={bom ? 'Modifier Nomenclature' : 'Nouvelle Nomenclature'} onClose={onClose} width={680}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
        <label>
          <span className="form__label">Produit fini *</span>
          <select className="form__input" value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
            <option value="">Sélectionner…</option>
            {prods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          <span className="form__label">Version</span>
          <input className="form__input" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Composants ({form.items.length})</span>
        <button className="btn btn--sm btn--secondary" onClick={addItem}><Plus size={13} /> Ajouter</button>
      </div>
      {form.items.map((item, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
          <label>
            <span className="form__label" style={{ fontSize: 10 }}>Composant</span>
            <select className="form__input" value={item.productId} onChange={e => setItem(i, 'productId', e.target.value)}>
              <option value="">—</option>
              {prods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>
            <span className="form__label" style={{ fontSize: 10 }}>Quantité</span>
            <input className="form__input" type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} />
          </label>
          <label>
            <span className="form__label" style={{ fontSize: 10 }}>Unité</span>
            <input className="form__input" value={item.unit} onChange={e => setItem(i, 'unit', e.target.value)} />
          </label>
          <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}>
            <X size={14} />
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn btn--secondary" onClick={onClose}>Annuler</button>
        <button className="btn btn--primary" onClick={() => onSave(form)}>{bom ? 'Enregistrer' : 'Créer'}</button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WORK CENTER MODAL
══════════════════════════════════════════════════════════════════ */
function WCModal({ wc, onClose, onSave }) {
  const [form, setForm] = useState({
    code: wc?.code || '', name: wc?.name || '', type: wc?.type || 'ASSEMBLY',
    capacity: wc?.capacity || 8, status: wc?.status || 'ACTIVE',
  });
  return (
    <Modal title={wc ? 'Modifier Poste' : 'Nouveau Poste de charge'} onClose={onClose} width={480}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label>
          <span className="form__label">Code</span>
          <input className="form__input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="WC-01" />
        </label>
        <label>
          <span className="form__label">Nom *</span>
          <input className="form__input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Soudure" />
        </label>
        <label>
          <span className="form__label">Type</span>
          <select className="form__input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {['ASSEMBLY', 'MACHINING', 'WELDING', 'PAINTING', 'PACKAGING', 'QUALITY', 'OTHER'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="form__label">Capacité (h/j)</span>
          <input className="form__input" type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
        </label>
        <label style={{ gridColumn: '1/-1' }}>
          <span className="form__label">Statut</span>
          <select className="form__input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="ACTIVE">Actif</option>
            <option value="MAINTENANCE">En maintenance</option>
            <option value="INACTIVE">Inactif</option>
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn btn--secondary" onClick={onClose}>Annuler</button>
        <button className="btn btn--primary" onClick={() => onSave(form)}>{wc ? 'Enregistrer' : 'Créer'}</button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KANBAN CARD
══════════════════════════════════════════════════════════════════ */
function KanbanCard({ order, onClick, onAdvance }) {
  const pct = order.quantity > 0 ? Math.min(100, Math.round(((order.producedQty || 0) / order.quantity) * 100)) : 0;
  const pri = PRIORITY[order.priority] || { label: order.priority, color: '#64748b' };
  const isLate = order.plannedEnd && new Date(order.plannedEnd) < new Date() && order.status !== 'COMPLETED';

  return (
    <div
      onClick={onClick}
      style={{
        background: '#1e293b',
        border: `1px solid ${isLate ? '#ef444444' : '#334155'}`,
        borderLeft: `3px solid ${pri.color}`,
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'border-color .2s, transform .15s',
        marginBottom: 8,
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#6366f1' }}>{order.number}</span>
        {isLate && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>⚠ En retard</span>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>
        {order.product?.name || '—'}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
        Qté: {fmt(order.producedQty || 0)} / {fmt(order.quantity)}
        {order.plannedEnd && <span style={{ marginLeft: 8 }}>📅 {fmtDate(order.plannedEnd)}</span>}
      </div>

      {/* Progress bar */}
      {order.status === 'IN_PROGRESS' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>Avancement</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: pct >= 100 ? '#10b981' : '#f59e0b' }}>{pct}%</span>
          </div>
          <ProgressBar value={order.producedQty || 0} max={order.quantity} color={pct >= 80 ? '#10b981' : '#f59e0b'} height={5} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, background: pri.color + '22', color: pri.color, padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>
          {pri.label}
        </span>
        {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
          <button
            onClick={e => { e.stopPropagation(); onAdvance(order); }}
            style={{ background: '#6366f111', border: '1px solid #6366f155', color: '#6366f1', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
          >
            Avancer →
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRODUCTION PAGE (MAIN)
══════════════════════════════════════════════════════════════════ */
export default function ProductionPage() {
  const qc = useQueryClient();
  const [tab, setTab]     = useState('flow');
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);

  const inv = (...keys) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  /* ── Queries */
  const { data: dash, refetch: refetchDash } = useQuery({
    queryKey: ['prod-dashboard'], queryFn: api.dashboard,
  });
  const { data: ordersRes } = useQuery({
    queryKey: ['prod-orders'], queryFn: () => api.orders(),
  });
  const { data: bomRes } = useQuery({
    queryKey: ['prod-bom'], queryFn: api.bom, enabled: tab === 'bom',
  });
  const { data: wcRes } = useQuery({
    queryKey: ['prod-wc'], queryFn: api.workcenters,
  });
  const { data: prodRes } = useQuery({
    queryKey: ['products'], queryFn: api.products,
  });
  const { data: detailRes } = useQuery({
    queryKey: ['prod-order-detail', detail],
    queryFn: () => api.getOrder(detail),
    enabled: !!detail,
  });

  const orders     = ordersRes?.data || [];
  const boms       = bomRes?.data    || [];
  const workcenters= wcRes?.data     || [];
  const products   = prodRes?.data   || [];

  /* ── Mutations */
  const createOrder = useMutation({
    mutationFn: api.createOrder,
    onSuccess: () => { inv('prod-orders', 'prod-dashboard'); setModal(null); toast.success('OF créé'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const updateOrder = useMutation({
    mutationFn: ({ id, data }) => api.updateOrder(id, data),
    onSuccess: () => { inv('prod-orders', 'prod-dashboard', 'prod-order-detail'); setModal(null); toast.success('Mis à jour'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const deleteOrder = useMutation({
    mutationFn: api.deleteOrder,
    onSuccess: () => { inv('prod-orders', 'prod-dashboard'); toast.success('Supprimé'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const createBom = useMutation({
    mutationFn: api.createBom,
    onSuccess: () => { inv('prod-bom'); setModal(null); toast.success('Nomenclature créée'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const createWC = useMutation({
    mutationFn: api.createWC,
    onSuccess: () => { inv('prod-wc'); setModal(null); toast.success('Poste créé'); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  /* Advance order to next status */
  const advanceStatus = (order) => {
    const flow = ['DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED'];
    const idx  = flow.indexOf(order.status);
    if (idx < 0 || idx >= flow.length - 1) return;
    updateOrder.mutate({ id: order.id, data: { status: flow[idx + 1] } });
  };

  /* ── Group orders by status for Kanban */
  const kanbanData = KANBAN_COLS.reduce((acc, col) => {
    acc[col.key] = orders.filter(o => o.status === col.key);
    return acc;
  }, {});
  const pausedOrders = orders.filter(o => o.status === 'PAUSED');

  /* ── KPIs */
  const totalProduced = orders.reduce((s, o) => s + (o.producedQty || 0), 0);
  const totalPlanned  = orders.reduce((s, o) => s + (o.quantity || 0), 0);
  const inProgress    = orders.filter(o => o.status === 'IN_PROGRESS').length;
  const efficiency    = totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : 0;
  const completed     = orders.filter(o => o.status === 'COMPLETED').length;
  const onTime        = orders.filter(o => o.status === 'COMPLETED' && (!o.plannedEnd || new Date(o.completedAt) <= new Date(o.plannedEnd))).length;
  const onTimePct     = completed > 0 ? Math.round((onTime / completed) * 100) : 100;

  /* ── Detail order */
  const detailOrder = detailRes?.data;

  const tabs = [
    { key: 'flow',       label: 'Flux Kanban',     icon: <ArrowRight size={14} /> },
    { key: 'bom',        label: 'Nomenclatures',   icon: <Layers size={14} /> },
    { key: 'workcenters',label: 'Postes de charge', icon: <Cpu size={14} /> },
  ];

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#0f172a' }}>

      {/* ── Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
            ⚙️ Production
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
            Flux de fabrication · Ordres · Nomenclatures · Postes
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--secondary" onClick={() => { refetchDash(); qc.invalidateQueries({ queryKey: ['prod-orders'] }); }}>
            <RefreshCw size={14} />
          </button>
          <button className="btn btn--primary" onClick={() => setModal({ type: 'order' })}>
            <Plus size={14} /> Nouvel OF
          </button>
        </div>
      </div>

      {/* ── KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { icon: <Zap size={18} />, label: 'En production', value: inProgress, color: '#f59e0b', sub: 'ordres actifs' },
          { icon: <Package size={18} />, label: 'Qté produite', value: fmt(totalProduced), color: '#6366f1', sub: `/ ${fmt(totalPlanned)} planifiés` },
          { icon: <TrendingUp size={18} />, label: 'Efficacité', value: `${efficiency}%`, color: efficiency >= 80 ? '#10b981' : '#f59e0b', sub: 'production vs planifié' },
          { icon: <Target size={18} />, label: 'Ponctualité', value: `${onTimePct}%`, color: onTimePct >= 90 ? '#10b981' : '#ef4444', sub: `${onTime}/${completed} terminés à temps` },
        ].map((k, i) => (
          <div key={i} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '16px', display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 42, height: 42, background: k.color + '22', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 12, color: '#f1f5f9', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Paused alert banner */}
      {pausedOrders.length > 0 && (
        <div style={{ background: '#ef444411', border: '1px solid #ef444444', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
            {pausedOrders.length} ordre{pausedOrders.length > 1 ? 's' : ''} suspendu{pausedOrders.length > 1 ? 's' : ''} :
          </span>
          {pausedOrders.map(o => (
            <span key={o.id} style={{ background: '#ef444422', color: '#ef4444', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>
              {o.number} — {o.product?.name}
            </span>
          ))}
        </div>
      )}

      {/* ── Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 2 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: '8px 8px 0 0',
              background: tab === t.key ? '#1e293b' : 'transparent',
              border: 'none', borderBottom: tab === t.key ? '2px solid #6366f1' : '2px solid transparent',
              color: tab === t.key ? '#6366f1' : '#64748b', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all .2s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TAB: KANBAN FLOW
      ══════════════════════════════════════════ */}
      {tab === 'flow' && (
        <div>
          {/* Kanban board */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {KANBAN_COLS.map(col => {
              const colOrders = kanbanData[col.key] || [];
              return (
                <div key={col.key} style={{ background: '#0f172a', border: `1px solid ${col.color}33`, borderRadius: 12, padding: 12 }}>
                  {/* Column header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{col.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: col.color }}>{col.label}</span>
                    </div>
                    <span style={{ background: col.color + '22', color: col.color, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                      {colOrders.length}
                    </span>
                  </div>
                  {/* Divider */}
                  <div style={{ height: 2, background: col.color + '44', borderRadius: 2, marginBottom: 12 }} />
                  {/* Cards */}
                  {colOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#334155', fontSize: 12, padding: '20px 0' }}>
                      Aucun ordre
                    </div>
                  ) : (
                    colOrders.map(order => (
                      <KanbanCard
                        key={order.id}
                        order={order}
                        onClick={() => setDetail(order.id)}
                        onAdvance={advanceStatus}
                      />
                    ))
                  )}
                  {col.key === 'DRAFT' && (
                    <button
                      onClick={() => setModal({ type: 'order' })}
                      style={{ width: '100%', background: 'none', border: '1px dashed #334155', borderRadius: 8, color: '#475569', padding: '8px', cursor: 'pointer', fontSize: 12, marginTop: 4 }}
                    >
                      + Nouvel OF
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Work Center Utilization */}
          {workcenters.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                Utilisation des postes de charge
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {workcenters.map(wc => {
                  const load = orders
                    .filter(o => o.status === 'IN_PROGRESS' && o.operations?.some(op => op.workCenterId === wc.id))
                    .length;
                  const loadPct = Math.min(100, Math.round((load / Math.max(1, wc.capacity / 8)) * 100));
                  const color = loadPct > 90 ? '#ef4444' : loadPct > 70 ? '#f59e0b' : '#10b981';
                  return (
                    <div key={wc.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{wc.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{wc.type} · {wc.capacity}h/j</div>
                        </div>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: wc.status === 'ACTIVE' ? '#10b981' : '#ef4444' }} />
                      </div>
                      <ProgressBar value={load} max={Math.max(1, wc.capacity / 8)} color={color} height={8} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Charge</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color }}>{loadPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: NOMENCLATURES
      ══════════════════════════════════════════ */}
      {tab === 'bom' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn--primary" onClick={() => setModal({ type: 'bom' })}>
              <Plus size={14} /> Nouvelle nomenclature
            </button>
          </div>
          {boms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <Layers size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p>Aucune nomenclature. Créez votre première BOM.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
              {boms.map(bom => (
                <div key={bom.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{bom.product?.name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Version {bom.version} · {bom.items?.length || 0} composants</div>
                    </div>
                    <span style={{
                      background: bom.isActive ? '#10b98122' : '#64748b22',
                      color: bom.isActive ? '#10b981' : '#64748b',
                      borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600
                    }}>{bom.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div style={{ borderTop: '1px solid #334155', paddingTop: 10 }}>
                    {(bom.items || []).slice(0, 4).map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>• {item.component?.name || item.product?.name || '—'}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#6366f1' }}>{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                    {(bom.items?.length || 0) > 4 && (
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>+{bom.items.length - 4} composants…</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB: WORK CENTERS
      ══════════════════════════════════════════ */}
      {tab === 'workcenters' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn--primary" onClick={() => setModal({ type: 'wc' })}>
              <Plus size={14} /> Nouveau poste
            </button>
          </div>
          {workcenters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <Cpu size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p>Aucun poste de charge. Créez votre premier poste.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {workcenters.map(wc => {
                const statusColor = wc.status === 'ACTIVE' ? '#10b981' : wc.status === 'MAINTENANCE' ? '#f59e0b' : '#64748b';
                return (
                  <div key={wc.id} style={{ background: '#1e293b', border: '1px solid #334155', borderLeft: `4px solid ${statusColor}`, borderRadius: 12, padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{wc.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{wc.code} · {wc.type}</div>
                      </div>
                      <span style={{ background: statusColor + '22', color: statusColor, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                        {wc.status === 'ACTIVE' ? 'Actif' : wc.status === 'MAINTENANCE' ? 'Maintenance' : 'Inactif'}
                      </span>
                    </div>
                    <div style={{ marginTop: 14, padding: '10px', background: '#0f172a', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Capacité</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{wc.capacity}h / jour</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn btn--sm btn--secondary" style={{ flex: 1 }} onClick={() => setModal({ type: 'wc', data: wc })}>
                        Modifier
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════ */}
      {modal?.type === 'order' && (
        <OrderModal
          order={modal.data}
          products={products}
          workcenters={workcenters}
          boms={boms}
          onClose={() => setModal(null)}
          onSave={(form) => {
            if (modal.data) {
              updateOrder.mutate({ id: modal.data.id, data: form });
            } else {
              createOrder.mutate(form);
            }
          }}
        />
      )}
      {modal?.type === 'bom' && (
        <BomModal
          bom={modal.data}
          products={products}
          onClose={() => setModal(null)}
          onSave={(form) => createBom.mutate(form)}
        />
      )}
      {modal?.type === 'wc' && (
        <WCModal
          wc={modal.data}
          onClose={() => setModal(null)}
          onSave={(form) => {
            if (modal.data) {
              api.updateWC(modal.data.id, form)
                .then(() => { inv('prod-wc'); setModal(null); toast.success('Mis à jour'); })
                .catch(e => toast.error(e.response?.data?.message || 'Erreur'));
            } else {
              createWC.mutate(form);
            }
          }}
        />
      )}

      {/* Order Detail Modal */}
      {detail && detailOrder && (
        <Modal title={`OF ${detailOrder.number} — Détail`} onClose={() => setDetail(null)} width={680}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Produit</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{detailOrder.product?.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Statut</div>
              <Badge map={ORDER_STATUS} value={detailOrder.status} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Quantité</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#6366f1' }}>{fmt(detailOrder.producedQty || 0)} / {fmt(detailOrder.quantity)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Période</div>
              <div style={{ fontSize: 13, color: '#f1f5f9' }}>{fmtDate(detailOrder.plannedStart)} → {fmtDate(detailOrder.plannedEnd)}</div>
            </div>
          </div>

          {/* Operations */}
          {(detailOrder.operations || []).length > 0 && (
            <div>
              <h4 style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Opérations
              </h4>
              {detailOrder.operations.map((op, i) => {
                const opStatus = OP_STATUS[op.status] || { label: op.status, color: '#64748b' };
                return (
                  <div key={op.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#0f172a', borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ width: 22, height: 22, background: opStatus.color + '22', color: opStatus.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {op.sequence}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: '#f1f5f9' }}>{op.name}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{op.estimatedHours}h</span>
                    <span style={{ fontSize: 11, background: opStatus.color + '22', color: opStatus.color, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>{opStatus.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn--secondary" onClick={() => setDetail(null)}>Fermer</button>
            <button className="btn btn--primary" onClick={() => { setModal({ type: 'order', data: detailOrder }); setDetail(null); }}>
              Modifier
            </button>
            <button
              className="btn"
              style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }}
              onClick={() => { if (confirm('Supprimer cet OF ?')) { deleteOrder.mutate(detailOrder.id); setDetail(null); } }}
            >
              Supprimer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
