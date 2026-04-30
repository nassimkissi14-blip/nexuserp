import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesAPI } from '../../api/client.js';
import { Search, Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight, Download, MoreVertical, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import ImportModal from '../../components/ImportModal.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { QrButton, QrBatchButton, EmployeeBadgeButton } from '../../components/ui/QrCodeWidget.jsx';

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  show:   (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.22, ease: [0.4, 0, 0.2, 1] } }),
};
const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show:   (i) => ({ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.05, duration: 0.26, ease: [0.34, 1.2, 0.64, 1] } }),
};
const pillVariants = {
  hidden: { opacity: 0, scale: 0.88 },
  show:   (i) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.04, duration: 0.2 } }),
};

/* ─── Dropdown action menu for table rows ─────────────────────── */
function ActionMenu({ emp, onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ background: open ? 'rgba(99,102,241,0.12)' : 'transparent', border: '1px solid transparent', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', transition: 'all .15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 200, minWidth: 150, overflow: 'hidden' }}>
          {[
            { icon: '👁', label: 'Voir le profil', color: '#94a3b8', action: onView },
            { icon: '✏️', label: 'Modifier',       color: '#6366f1', action: onEdit },
            { icon: '🗑', label: 'Archiver',        color: '#ef4444', action: () => { if (window.confirm(`Archiver ${emp.firstName} ${emp.lastName} ?`)) { onDelete(); } }, danger: true },
          ].map((item) => (
            <button key={item.label}
              onClick={(e) => { e.stopPropagation(); setOpen(false); item.action(); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: item.danger ? '#ef4444' : 'var(--text-secondary)', textAlign: 'left', transition: 'background .12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
 
const DEPARTMENTS = ['Direction', 'Ressources Humaines', 'Finance', 'CRM & Ventes', 'Production', 'Logistique', 'IT', 'Maintenance'];
const CONTRACT_TYPES = ['CDI', 'CDD', 'INTERIM', 'STAGE', 'FREELANCE'];
const STATUS_LABELS = { ACTIVE: 'Actif', ON_LEAVE: 'En congé', SUSPENDED: 'Suspendu', TERMINATED: 'Archivé' };
const STATUS_COLORS = { ACTIVE: '#10b981', ON_LEAVE: '#f59e0b', SUSPENDED: '#ef4444', TERMINATED: '#475569' };
 
const Modal = ({ title, onClose, children, size = 'md' }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: size === 'lg' ? 800 : 600 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header">
        <h3>{title}</h3>
        <button className="modal__close" onClick={onClose}>✕</button>
      </div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);
 
const EmployeeForm = ({ initial, onSubmit, onCancel, isLoading }) => {
  const [form, setForm] = useState(initial || {
    firstName: '', lastName: '', email: '', phone: '',
    position: '', department: DEPARTMENTS[0], salary: '',
    hireDate: new Date().toISOString().split('T')[0],
    contractType: 'CDI', status: 'ACTIVE', address: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
 
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="form-group"><label>Prénom *</label><input value={form.firstName} onChange={e => set('firstName', e.target.value)} required /></div>
        <div className="form-group"><label>Nom *</label><input value={form.lastName} onChange={e => set('lastName', e.target.value)} required /></div>
        <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
        <div className="form-group"><label>Téléphone</label><input value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
        <div className="form-group"><label>Poste *</label><input value={form.position} onChange={e => set('position', e.target.value)} required /></div>
        <div className="form-group"><label>Département *</label>
          <select value={form.department} onChange={e => set('department', e.target.value)}>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Salaire (DZD) *</label><input type="number" value={form.salary} onChange={e => set('salary', e.target.value)} required min="0" /></div>
        <div className="form-group"><label>Date d'embauche *</label><input type="date" value={form.hireDate} onChange={e => set('hireDate', e.target.value)} required /></div>
        <div className="form-group"><label>Type de contrat</label>
          <select value={form.contractType} onChange={e => set('contractType', e.target.value)}>
            {CONTRACT_TYPES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Statut</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 20 }}><label>Adresse</label><input value={form.address || ''} onChange={e => set('address', e.target.value)} /></div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn--primary" disabled={isLoading}>{isLoading ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
};
 
export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // table | cards
 
  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search, filterDept, filterStatus],
    queryFn: () => employeesAPI.getAll({ page, limit: 12, search, department: filterDept, status: filterStatus }),
    keepPreviousData: true,
  });
 
  const createMutation = useMutation({
    mutationFn: employeesAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); setModal(null); toast.success('✅ Employé créé !'); },
    onError: (err) => toast.error(err?.message || err?.error || 'Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => employeesAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); setModal(null); toast.success('✅ Employé mis à jour !'); },
    onError: (err) => toast.error(err?.message || err?.error || 'Erreur lors de la mise à jour'),
  });
 
  const deleteMutation = useMutation({
    mutationFn: employeesAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employé archivé'); },
  });
 
  const employees = data?.data || [];
  const pagination = data?.pagination || {};
 
  const deptStats = DEPARTMENTS.reduce((acc, d) => {
    acc[d] = employees.filter(e => e.department === d).length;
    return acc;
  }, {});
 
  return (
    <div className="page">
      {/* HEADER */}
      <motion.div className="page-header" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}>
        <div>
          <h1 className="page-title page-title--gradient">👥 Gestion des Employés</h1>
          <p className="page-subtitle">{pagination.total || 0} employé(s) · {employees.filter(e => e.status === 'ACTIVE').length} actifs</p>
        </div>
        <motion.div style={{ display: 'flex', gap: 8 }} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28, delay: 0.08 }}>
          <QrBatchButton type="employee" items={employees} label="Employés — Badges QR" filename="qr-employes" />
          <button className="btn btn--ghost" onClick={() => toast('Export Excel bientôt disponible')}><Download size={15} /> Export</button>
          <button className="btn btn--ghost" onClick={() => setModal('import')}><Upload size={15} /> Importer</button>
          <button className="btn btn--primary" onClick={() => setModal('create')}><Plus size={16} /> Ajouter</button>
        </motion.div>
      </motion.div>
 
      {/* STATS DÉPARTEMENTS */}
      <motion.div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.045 } } }}>
        {Object.entries(deptStats).filter(([, count]) => count > 0).map(([dept, count], i) => (
          <motion.div key={dept} custom={i} variants={pillVariants} whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: 0.96 }} style={{
            background: filterDept === dept ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)',
            border: `1px solid ${filterDept === dept ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
            borderRadius: 20, padding: '5px 13px', fontSize: 12,
            color: filterDept === dept ? '#818cf8' : 'var(--text-secondary)',
            cursor: 'pointer', fontWeight: filterDept === dept ? 700 : 400,
          }} onClick={() => setFilterDept(filterDept === dept ? '' : dept)}>
            {dept} <strong>({count})</strong>
          </motion.div>
        ))}
      </motion.div>
 
      {/* FILTRES */}
      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} className="search-input__icon" />
          <input placeholder="Rechercher un employé…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}>
          <option value="">Tous les départements</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <button className={`btn ${viewMode === 'table' ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '8px 12px' }} onClick={() => setViewMode('table')}>☰</button>
          <button className={`btn ${viewMode === 'cards' ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '8px 12px' }} onClick={() => setViewMode('cards')}>⊞</button>
        </div>
      </div>
 
      {/* VUE TABLE — responsive with sticky action column */}
      {viewMode === 'table' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Employé', 'Poste', 'Département', 'Contrat', 'Salaire', 'Embauché', 'Statut', 'QR', 'Badge', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '11px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: 0.7, textAlign: 'left', whiteSpace: 'nowrap',
                    background: 'var(--bg-card)',
                    ...(i === 7 && { textAlign: 'center', width: 44 }),
                    ...(i === 8 && { textAlign: 'center', width: 52 }),
                    ...(i === 9 && { position: 'sticky', right: 0, zIndex: 2, width: 52, textAlign: 'center', borderLeft: '1px solid var(--border)' }),
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Chargement…</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Aucun employé trouvé</td></tr>
              ) : employees.map((emp, i) => (
                <motion.tr key={emp.id} custom={i} variants={rowVariants} initial="hidden" animate="show"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  whileHover={{ backgroundColor: 'rgba(99,102,241,0.04)' }}
                  transition={{ type: 'tween' }}>
                  {/* Employé */}
                  <td style={{ padding: '12px 14px', minWidth: 190 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: `hsl(${emp.firstName.charCodeAt(0) * 13 % 360}, 65%, 42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{emp.firstName} {emp.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{emp.position}</td>
                  <td style={{ padding: '12px 14px' }}><span className="tag" style={{ whiteSpace: 'nowrap' }}>{emp.department}</span></td>
                  <td style={{ padding: '12px 14px' }}><span className="tag">{emp.contractType}</span></td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)', fontSize: 13, whiteSpace: 'nowrap' }}>{new Intl.NumberFormat('fr-DZ').format(emp.salary)} DZD</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(emp.hireDate).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: STATUS_COLORS[emp.status] + '1a', color: STATUS_COLORS[emp.status], whiteSpace: 'nowrap' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATUS_COLORS[emp.status] }} />
                      {STATUS_LABELS[emp.status]}
                    </span>
                  </td>
                  {/* QR column */}
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <QrButton type="employee" id={emp.id} name={`${emp.firstName} ${emp.lastName}`} />
                  </td>
                  {/* Badge column */}
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <EmployeeBadgeButton emp={emp} />
                  </td>
                  {/* Sticky action column */}
                  <td style={{ padding: '10px 12px', position: 'sticky', right: 0, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', textAlign: 'center', zIndex: 1 }}>
                    <ActionMenu
                      emp={emp}
                      onView={() => setModal({ type: 'view', emp })}
                      onEdit={() => setModal({ type: 'edit', emp })}
                      onDelete={() => deleteMutation.mutate(emp.id)}
                    />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
 
      {/* VUE CARDS */}
      {viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {isLoading ? <p style={{ color: 'var(--text-muted)' }}>Chargement…</p> :
            employees.map((emp, i) => (
              <motion.div key={emp.id} custom={i} variants={cardVariants} initial="hidden" animate="show"
                whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.4)', borderColor: 'rgba(99,102,241,0.3)' }}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: 20,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: `hsl(${emp.firstName.charCodeAt(0) * 10}, 70%, 40%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: 'white'
                  }}>{emp.firstName[0]}{emp.lastName[0]}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.firstName} {emp.lastName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{emp.position}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Département</span>
                    <span className="tag">{emp.department}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Salaire</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Intl.NumberFormat('fr-DZ').format(emp.salary)} DZD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Statut</span>
                    <span style={{ color: STATUS_COLORS[emp.status], fontWeight: 500 }}>{STATUS_LABELS[emp.status]}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button className="btn btn--ghost" style={{ flex: 1, padding: '6px', fontSize: 12, justifyContent: 'center' }}
                    onClick={() => setModal({ type: 'view', emp })}>Voir</button>
                  <button className="btn btn--primary" style={{ flex: 1, padding: '6px', fontSize: 12, justifyContent: 'center' }}
                    onClick={() => setModal({ type: 'edit', emp })}>Modifier</button>
                </div>
              </motion.div>
            ))
          }
        </div>
      )}
 
      {/* PAGINATION */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button className="pagination__btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
          <span className="pagination__info">Page {page} / {pagination.pages} — {pagination.total} employés</span>
          <button className="pagination__btn" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
        </div>
      )}
 
      {/* MODALS */}
      {modal === 'import' && (
        <ImportModal type="employees" label="employés" onClose={() => setModal(null)} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['employees'] })} />
      )}
      {modal === 'create' && (
        <Modal title="➕ Ajouter un employé" onClose={() => setModal(null)}>
          <EmployeeForm onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setModal(null)} isLoading={createMutation.isPending} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title="✏️ Modifier l'employé" onClose={() => setModal(null)}>
          <EmployeeForm initial={modal.emp} onSubmit={(data) => updateMutation.mutate({ id: modal.emp.id, data })} onCancel={() => setModal(null)} isLoading={updateMutation.isPending} />
        </Modal>
      )}
      {modal?.type === 'view' && (
        <Modal title="👤 Fiche Employé" onClose={() => setModal(null)} size="lg">
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minWidth: 160 }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: `hsl(${modal.emp.firstName.charCodeAt(0) * 10}, 70%, 40%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, color: 'white'
              }}>{modal.emp.firstName[0]}{modal.emp.lastName[0]}</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{modal.emp.firstName} {modal.emp.lastName}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{modal.emp.position}</div>
              </div>
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: STATUS_COLORS[modal.emp.status] + '22',
                color: STATUS_COLORS[modal.emp.status]
              }}>{STATUS_LABELS[modal.emp.status]}</span>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Email', modal.emp.email],
                ['Téléphone', modal.emp.phone || '—'],
                ['Département', modal.emp.department],
                ['Contrat', modal.emp.contractType],
                ['Salaire', new Intl.NumberFormat('fr-DZ').format(Number(modal.emp.salary || 0)) + ' DZD'],
                ['Date embauche', new Date(modal.emp.hireDate).toLocaleDateString('fr-FR')],
                ['Adresse', modal.emp.address || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}