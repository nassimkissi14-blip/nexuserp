import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersAPI, customersAPI } from '../../api/client.js';
import { Search, Plus, Eye, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';
import { motion } from 'framer-motion';
import { QrButton, QrBatchButton } from '../../components/ui/QrCodeWidget.jsx';

const kpiStagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.4,0,0.2,1] } } };
const rowAnim = { hidden: { opacity: 0, x: -10 }, show: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.035, duration: 0.2 } }) };

const STATUS = {
  DRAFT: { label: 'Brouillon', color: '#64748b', icon: '📝' },
  CONFIRMED: { label: 'Confirmée', color: '#3b82f6', icon: '✅' },
  PROCESSING: { label: 'En cours', color: '#f59e0b', icon: '⚙️' },
  SHIPPED: { label: 'Expédiée', color: '#8b5cf6', icon: '🚛' },
  DELIVERED: { label: 'Livrée', color: '#10b981', icon: '📦' },
  CANCELLED: { label: 'Annulée', color: '#ef4444', icon: '❌' },
};

const PRIORITY = {
  LOW: { label: 'Faible', color: '#10b981' },
  MEDIUM: { label: 'Moyenne', color: '#f59e0b' },
  HIGH: { label: 'Haute', color: '#ef4444' },
};

const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';

const Modal = ({ title, onClose, children, size = 'md' }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: size === 'lg' ? 750 : 600 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

const OrderForm = ({ initial, customers, onSubmit, onCancel, isLoading }) => {
  const [form, setForm] = useState(initial || {
    customerId: '', totalAmount: '', status: 'DRAFT',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '', notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Client *</label>
          <select value={form.customerId} onChange={e => set('customerId', e.target.value)} required>
            <option value="">-- Sélectionner un client --</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Montant total (DZD) *</label><input type="number" value={form.totalAmount} onChange={e => set('totalAmount', e.target.value)} required min="0" /></div>
        <div className="form-group"><label>Date commande *</label><input type="date" value={form.orderDate} onChange={e => set('orderDate', e.target.value)} required /></div>
        <div className="form-group"><label>Date livraison prévue</label><input type="date" value={form.deliveryDate || ''} onChange={e => set('deliveryDate', e.target.value)} /></div>
        <div className="form-group"><label>Statut</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Notes</label><input value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn--primary" disabled={isLoading}>{isLoading ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, search, filterStatus],
    queryFn: () => ordersAPI.getAll({ page, limit: 15, search, status: filterStatus || undefined }),
    keepPreviousData: true,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersAPI.getAll({ limit: 200 }).then(r => r.data || []),
  });

  const createMutation = useMutation({
    mutationFn: ordersAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); setModal(null); toast.success('✅ Commande créée !'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => ordersAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); setModal(null); toast.success('✅ Commande mise à jour !'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });
  const advanceMutation = useMutation({
    mutationFn: ordersAPI.advance,
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ['orders'] }); toast.success(`✅ Statut → ${STATUS[res.data?.status]?.label}`); setModal(null); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });
  const deleteMutation = useMutation({
    mutationFn: ordersAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); toast.success('Commande annulée'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const orders = data?.data || [];
  const pagination = data?.pagination || {};
  const customers = customersData || [];

  const STATUS_FLOW = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const canAdvance = (status) => STATUS_FLOW.includes(status) && status !== 'DELIVERED';

  return (
    <div className="page">
      <motion.div className="page-header" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.4,0,0.2,1] }}>
        <div>
          <h1 className="page-title page-title--gradient">🛒 Gestion des Commandes</h1>
          <p className="page-subtitle">{pagination.total || 0} commandes</p>
        </div>
        <motion.div style={{ display: 'flex', gap: 8 }} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28, delay: 0.08 }}>
          <QrBatchButton type="order" items={orders} label="Commandes — QR Badges" filename="qr-commandes" />
          <button className="btn btn--primary" onClick={() => setModal('create')}><Plus size={16} /> Nouvelle commande</button>
        </motion.div>
      </motion.div>

      {/* STATS STATUTS */}
      <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }} variants={kpiStagger} initial="hidden" animate="show">
        {Object.entries(STATUS).map(([key, s]) => {
          const count = orders.filter(o => o.status === key).length;
          return (
            <motion.div key={key} variants={fadeUp}
              whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
              whileTap={{ scale: 0.97 }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', borderTop: `2px solid ${s.color}`, cursor: 'pointer', opacity: filterStatus === key || filterStatus === '' ? 1 : 0.45, transition: 'opacity 0.2s' }}
              onClick={() => setFilterStatus(filterStatus === key ? '' : key)}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{count}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* FILTRES */}
      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} className="search-input__icon" />
          <input placeholder="Référence ou client…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* TABLE */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr><th>Référence</th><th>Client</th><th>Date</th><th>Montant</th><th>Statut</th><th style={{ textAlign: 'center', width: 44 }}>QR</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="table-loading">Chargement…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">
                Aucune commande trouvée.{' '}
                <button className="btn btn--ghost" style={{ display: 'inline', fontSize: 12, padding: '2px 8px' }} onClick={() => setModal('create')}>Créer la première</button>
              </td></tr>
            ) : orders.map((order, i) => (
              <motion.tr key={order.id} custom={i} variants={rowAnim} initial="hidden" animate="show" whileHover={{ backgroundColor: 'rgba(99,102,241,0.04)' }}>
                <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{order.reference}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{order.customer?.name || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.customer?.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}</div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(order.orderDate).toLocaleDateString('fr-FR')}</td>
                <td style={{ fontWeight: 700 }}>{fmt(order.totalAmount)}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: STATUS[order.status]?.color + '22', color: STATUS[order.status]?.color }}>
                    {STATUS[order.status]?.icon} {STATUS[order.status]?.label}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <QrButton type="order" id={order.id} name={order.reference} extraData={{ customer: order.customer?.name, status: order.status }} />
                </td>
                <td>
                  <div className="table-actions">
                    <button className="icon-btn" title="Voir" onClick={() => setModal({ type: 'view', order })}><Eye size={14} /></button>
                    <button className="icon-btn" title="Modifier" onClick={() => setModal({ type: 'edit', order })}><Edit2 size={14} /></button>
                    {canAdvance(order.status) && (
                      <button className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => advanceMutation.mutate(order.id)}>→ Avancer</button>
                    )}
                    {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                      <button className="btn btn--ghost" style={{ padding: '4px 10px', fontSize: 11, color: '#ef4444' }}
                        onClick={async () => { const ok = await confirm({ title: 'Annuler cette commande ?', confirmLabel: 'Annuler', variant: 'danger' }); if (ok) deleteMutation.mutate(order.id); }}>Annuler</button>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button className="pagination__btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
          <span className="pagination__info">Page {page} / {pagination.pages} — {pagination.total} commandes</span>
          <button className="pagination__btn" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
        </div>
      )}

      {/* MODALS */}
      {modal === 'create' && (
        <Modal title="➕ Nouvelle commande" onClose={() => setModal(null)}>
          <OrderForm customers={customers} onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setModal(null)} isLoading={createMutation.isPending} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title="✏️ Modifier commande" onClose={() => setModal(null)}>
          <OrderForm
            initial={{ ...modal.order, customerId: modal.order.customerId, orderDate: modal.order.orderDate?.split('T')[0] }}
            customers={customers}
            onSubmit={(data) => updateMutation.mutate({ id: modal.order.id, data })}
            onCancel={() => setModal(null)}
            isLoading={updateMutation.isPending}
          />
        </Modal>
      )}
      {modal?.type === 'view' && (
        <Modal title="📋 Détails commande" onClose={() => setModal(null)} size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-primary)' }}>{modal.order.reference}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(modal.order.orderDate).toLocaleDateString('fr-FR')}</div>
              </div>
              <span style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: STATUS[modal.order.status]?.color + '22', color: STATUS[modal.order.status]?.color }}>
                {STATUS[modal.order.status]?.icon} {STATUS[modal.order.status]?.label}
              </span>
            </div>

            {/* TIMELINE */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {STATUS_FLOW.map((s, i) => {
                const currentIdx = STATUS_FLOW.indexOf(modal.order.status);
                const isDone = i <= currentIdx;
                return (
                  <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDone ? STATUS[s].color : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'white', fontWeight: 700 }}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <div style={{ fontSize: 10, color: isDone ? STATUS[s].color : 'var(--text-muted)', marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap' }}>{STATUS[s].label}</div>
                    </div>
                    {i < STATUS_FLOW.length - 1 && <div style={{ height: 2, flex: 1, background: i < STATUS_FLOW.indexOf(modal.order.status) ? 'var(--accent-primary)' : 'var(--border)', margin: '0 4px', marginBottom: 20 }} />}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Client', modal.order.customer?.name || '—'],
                ['Montant', fmt(modal.order.totalAmount)],
                ['Date commande', new Date(modal.order.orderDate).toLocaleDateString('fr-FR')],
                ['Livraison prévue', modal.order.deliveryDate ? new Date(modal.order.deliveryDate).toLocaleDateString('fr-FR') : '—'],
                ['Notes', modal.order.notes || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '12px 16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {canAdvance(modal.order.status) && (
                <button className="btn btn--primary" onClick={() => advanceMutation.mutate(modal.order.id)}>→ Avancer le statut</button>
              )}
            </div>
          </div>
        </Modal>
      )}
      {confirmModal}
    </div>
  );
}
