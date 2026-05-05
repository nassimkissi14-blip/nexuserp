import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersAPI } from '../../api/client.js';
import { Search, Plus, Edit2, Eye, Phone, Mail, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { CardGridSkeleton } from '../../components/ui/Skeleton.jsx';
import { useConfirm } from '../../components/ui/ConfirmModal.jsx';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS = {
  ACTIVE:   { label: 'Client actif', color: '#10b981' },
  PROSPECT: { label: 'Prospect',     color: '#6366f1' },
  LEAD:     { label: 'Lead',         color: '#f59e0b' },
  INACTIVE: { label: 'Inactif',      color: '#475569' },
  LOST:     { label: 'Perdu',        color: '#ef4444' },
};

const fmt = (n) => new Intl.NumberFormat('fr-DZ').format(Number(n) || 0) + ' DZD';

/* ── Variants ─────────────────────────────────────────────── */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};
const cardV = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

/* ── Modal ────────────────────────────────────────────────── */
const Modal = ({ title, onClose, children, size = 'md' }) => (
  <AnimatePresence>
    <motion.div className="modal-overlay" onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal" style={{ maxWidth: size === 'lg' ? 700 : 560 }} onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 26 } }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}>
        <div className="modal__header">
          <h3>{title}</h3>
          <motion.button className="modal__close" onClick={onClose} whileHover={{ rotate: 90 }} whileTap={{ scale: 0.85 }}>✕</motion.button>
        </div>
        <div className="modal__body">{children}</div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

/* ── CustomerForm ─────────────────────────────────────────── */
const CustomerForm = ({ initial, onSubmit, onCancel, isLoading }) => {
  const [form, setForm] = useState(initial || { name: '', type: 'COMPANY', status: 'LEAD', email: '', phone: '', country: 'Algérie', address: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Nom *</label><input value={form.name || ''} onChange={e => set('name', e.target.value)} required /></div>
        <div className="form-group"><label>Type</label>
          <select value={form.type || 'COMPANY'} onChange={e => set('type', e.target.value)}>
            <option value="COMPANY">Entreprise</option>
            <option value="INDIVIDUAL">Particulier</option>
          </select>
        </div>
        <div className="form-group"><label>Statut</label>
          <select value={form.status || 'LEAD'} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Email</label><input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} /></div>
        <div className="form-group"><label>Téléphone</label><input value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
        <div className="form-group"><label>Pays</label><input value={form.country || ''} onChange={e => set('country', e.target.value)} /></div>
        <div className="form-group"><label>Adresse</label><input value={form.address || ''} onChange={e => set('address', e.target.value)} /></div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Notes</label><input value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn--primary" disabled={isLoading}>{isLoading ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
};

/* ── Main ─────────────────────────────────────────────────── */
export default function CustomersPage() {
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, filterStatus],
    queryFn: () => customersAPI.getAll({ page, limit: 12, search, status: filterStatus || undefined }),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: customersAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setModal(null); toast.success('✅ Client ajouté !'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => customersAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setModal(null); toast.success('✅ Client mis à jour !'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });
  const deleteMutation = useMutation({
    mutationFn: customersAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); toast.success('Client archivé'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const customers = data?.data || [];
  const pagination = data?.pagination || {};

  const stats = [
    { label: 'Clients actifs', value: customers.filter(c => c.status === 'ACTIVE').length,   color: '#10b981', icon: '✅', accent: 'rgba(16,185,129,0.15)' },
    { label: 'Prospects',      value: customers.filter(c => c.status === 'PROSPECT').length, color: '#6366f1', icon: '👀', accent: 'rgba(99,102,241,0.15)' },
    { label: 'Leads',          value: customers.filter(c => c.status === 'LEAD').length,      color: '#f59e0b', icon: '🎯', accent: 'rgba(245,158,11,0.15)' },
    { label: 'Total',          value: pagination.total || 0,                                  color: '#8b5cf6', icon: '👥', accent: 'rgba(139,92,246,0.15)' },
  ];

  return (
    <motion.div className="page" variants={container} initial="hidden" animate="show">
      {/* HEADER */}
      <motion.div className="page-header" variants={fadeUp}>
        <div>
          <h1 className="page-title">Gestion Clients (CRM)</h1>
          <p className="page-subtitle">{pagination.total || 0} clients · {customers.filter(c => c.status === 'ACTIVE').length} actifs</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <motion.button className="btn btn--primary" onClick={() => setModal('create')}
            whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(99,102,241,0.4)' }} whileTap={{ scale: 0.96 }}>
            <Plus size={16} /> Ajouter client
          </motion.button>
        </div>
      </motion.div>

      {/* STATS */}
      <motion.div variants={container} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {stats.map((s) => (
          <motion.div key={s.label} variants={fadeUp} whileHover={{ y: -3, boxShadow: `0 8px 32px ${s.color}22` }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${s.color}`, borderRadius: 'var(--radius-lg)', padding: 18, cursor: 'default' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* FILTRES */}
      <motion.div variants={fadeUp} className="filters-bar">
        <div className="search-input">
          <Search size={16} className="search-input__icon" />
          <input placeholder="Rechercher un client…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['', 'Tous'], ['ACTIVE', 'Actifs'], ['PROSPECT', 'Prospects'], ['LEAD', 'Leads'], ['INACTIVE', 'Inactifs']].map(([val, label]) => (
            <motion.div key={val}
              className={`filter-pill${filterStatus === val ? ' active' : ''}`}
              style={filterStatus === val ? { background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.35)', color: '#818cf8' } : {}}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setFilterStatus(val); setPage(1); }}>{label}</motion.div>
          ))}
        </div>
      </motion.div>

      {/* CARDS */}
      {isLoading ? (
        <motion.div variants={fadeUp}><CardGridSkeleton count={6} minWidth={300} /></motion.div>
      ) : customers.length === 0 ? (
        <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <motion.div style={{ fontSize: 52, marginBottom: 16 }}
            animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}>🤝</motion.div>
          <p style={{ fontSize: 15, fontWeight: 500 }}>Aucun client trouvé</p>
          <motion.button className="btn btn--primary" style={{ marginTop: 16 }} onClick={() => setModal('create')}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>Ajouter le premier client</motion.button>
        </motion.div>
      ) : (
        <motion.div variants={container}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {customers.map((customer) => (
            <motion.div key={customer.id} variants={cardV}
              whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.35)', borderColor: 'rgba(99,102,241,0.4)' }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: customer.type === 'COMPANY' ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {customer.type === 'COMPANY' ? '🏢' : '👤'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{customer.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{customer.country || '—'}</div>
                  </div>
                </div>
                <span className={`badge badge--${
                  customer.status === 'ACTIVE' ? 'green' :
                  customer.status === 'PROSPECT' ? 'indigo' :
                  customer.status === 'LEAD' ? 'orange' :
                  customer.status === 'LOST' ? 'red' : 'gray'
                } badge--dot`}>
                  {STATUS[customer.status]?.label || customer.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {customer.email && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}><Mail size={13} /> {customer.email}</div>}
                {customer.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}><Phone size={13} /> {customer.phone}</div>}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button className="btn btn--ghost" style={{ flex: 1, padding: '6px', fontSize: 12, justifyContent: 'center' }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setModal({ type: 'view', customer })}>
                  <Eye size={13} /> Voir
                </motion.button>
                <motion.button className="btn btn--primary" style={{ flex: 1, padding: '6px', fontSize: 12, justifyContent: 'center' }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setModal({ type: 'edit', customer })}>
                  <Edit2 size={13} /> Modifier
                </motion.button>
                <motion.button className="icon-btn icon-btn--danger" title="Archiver"
                  whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }}
                  onClick={async () => { const ok = await confirm({ title: 'Archiver ce client ?', message: `"${customer.name}" sera archivé et retiré de la liste active.`, confirmLabel: 'Archiver', variant: 'warning' }); if (ok) deleteMutation.mutate(customer.id); }}>
                  <Trash2 size={14} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* PAGINATION */}
      {pagination.pages > 1 && (
        <motion.div variants={fadeUp} className="pagination">
          <button className="pagination__btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
          <span className="pagination__info">Page {page} / {pagination.pages} — {pagination.total} clients</span>
          <button className="pagination__btn" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
        </motion.div>
      )}

      {/* MODALS */}
      {modal === 'create' && (
        <Modal title="Nouveau client" onClose={() => setModal(null)}>
          <CustomerForm onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setModal(null)} isLoading={createMutation.isPending} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title="Modifier client" onClose={() => setModal(null)}>
          <CustomerForm initial={modal.customer} onSubmit={(data) => updateMutation.mutate({ id: modal.customer.id, data })} onCancel={() => setModal(null)} isLoading={updateMutation.isPending} />
        </Modal>
      )}
      {modal?.type === 'view' && (
        <Modal title="Fiche Client" onClose={() => setModal(null)} size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                {modal.customer.type === 'COMPANY' ? '🏢' : '👤'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{modal.customer.name}</div>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, background: (STATUS[modal.customer.status]?.color || '#64748b') + '22', color: STATUS[modal.customer.status]?.color || '#64748b' }}>
                  {STATUS[modal.customer.status]?.label}
                </span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Email', modal.customer.email || '—'],
                ['Téléphone', modal.customer.phone || '—'],
                ['Pays', modal.customer.country || '—'],
                ['Type', modal.customer.type === 'COMPANY' ? 'Entreprise' : 'Particulier'],
                ['Adresse', modal.customer.address || '—'],
                ['Notes', modal.customer.notes || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
      {confirmModal}
    </motion.div>
  );
}
