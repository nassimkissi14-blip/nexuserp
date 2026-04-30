import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Edit2, Trash2 } from 'lucide-react';
import { projectsAPI } from '../../api/client.js';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};
const cardV = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

const STATUS = {
  PLANNING:    { label: 'Planification', color: '#6366f1', icon: '📋' },
  IN_PROGRESS: { label: 'En cours',      color: '#f59e0b', icon: '⚙️' },
  ON_HOLD:     { label: 'En pause',      color: '#64748b', icon: '⏸️' },
  COMPLETED:   { label: 'Terminé',       color: '#10b981', icon: '✅' },
  CANCELLED:   { label: 'Annulé',        color: '#ef4444', icon: '❌' },
};
const PRIORITY = {
  LOW:      { label: 'Faible',   color: '#10b981' },
  MEDIUM:   { label: 'Moyenne',  color: '#f59e0b' },
  HIGH:     { label: 'Haute',    color: '#ef4444' },
  CRITICAL: { label: 'Critique', color: '#dc2626' },
};
const fmt = (n) => n ? new Intl.NumberFormat('fr-DZ').format(n) + ' DZD' : '—';

const Modal = ({ title, onClose, children, size = 'md' }) => (
  <AnimatePresence>
    <motion.div className="modal-overlay" onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="modal" style={{ maxWidth: size === 'lg' ? 820 : 600 }} onClick={e => e.stopPropagation()}
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

const Skeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
    {[1,2,3].map(i => (
      <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22, height: 220 }}>
        <div style={{ height: 16, background: 'var(--border)', borderRadius: 4, marginBottom: 12, width: '70%', animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: 10, background: 'var(--border)', borderRadius: 4, marginBottom: 8, width: '90%' }} />
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, marginTop: 20 }} />
      </div>
    ))}
  </div>
);

const ProjectCard = ({ project, onView, onEdit, onDelete }) => {
  const status = STATUS[project.status] || STATUS.PLANNING;
  const priority = PRIORITY[project.priority] || PRIORITY.MEDIUM;
  const tasksDone = (project.tasks || []).filter(t => t.status === 'DONE').length;
  const tasksTotal = (project.tasks || []).length;
  const daysLeft = project.endDate ? Math.ceil((new Date(project.endDate) - new Date()) / 86400000) : null;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderLeft: `4px solid ${status.color}`,
      borderRadius: 'var(--radius-lg)', padding: 22,
      display: 'flex', flexDirection: 'column', gap: 14,
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{project.name}</div>
          {project.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{project.description.substring(0, 80)}{project.description.length > 80 ? '…' : ''}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: status.color + '22', color: status.color, whiteSpace: 'nowrap' }}>{status.icon} {status.label}</span>
          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: priority.color + '22', color: priority.color }}>{priority.label}</span>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Progression</span>
          <span style={{ fontWeight: 700, color: project.progress === 100 ? '#10b981' : 'inherit' }}>{project.progress}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
          <div style={{ height: '100%', borderRadius: 3, width: `${project.progress}%`, background: project.progress === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : `linear-gradient(90deg, ${status.color}, ${status.color}99)`, transition: 'width 1s ease' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Membres', value: project.members?.length ?? 0 },
          { label: daysLeft === null ? 'Délai' : daysLeft < 0 ? 'Dépassé' : 'Jours rest.', value: daysLeft === null ? '—' : Math.abs(daysLeft) + 'j', color: daysLeft !== null && daysLeft < 0 ? '#ef4444' : daysLeft !== null && daysLeft < 14 ? '#f59e0b' : undefined },
          { label: 'Tâches', value: `${tasksDone}/${tasksTotal}` },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: stat.color || 'var(--text-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {(project.members || []).slice(0, 4).map((m, i) => (
            <div key={m.id || i} title={`${m.user?.firstName} ${m.user?.lastName}`} style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${i * 70 + 200}, 65%, 45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', border: '2px solid var(--bg-card)', marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i }}>
              {m.user ? (m.user.firstName[0] + m.user.lastName[0]).toUpperCase() : '?'}
            </div>
          ))}
          {project.members?.length > 4 && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', border: '2px solid var(--bg-card)', marginLeft: -8 }}>+{project.members.length - 4}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="icon-btn" onClick={() => onView(project)}><Eye size={14} /></button>
          <button className="icon-btn" onClick={() => onEdit(project)}><Edit2 size={14} /></button>
          <button className="icon-btn icon-btn--danger" onClick={() => onDelete(project.id)}><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
};

const emptyForm = () => ({
  name: '', description: '', status: 'PLANNING', priority: 'MEDIUM',
  startDate: new Date().toISOString().split('T')[0], endDate: '', budget: '',
});

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const { data, isLoading } = useQuery({
    queryKey: ['projects', filterStatus, search],
    queryFn: () => projectsAPI.getAll({ status: filterStatus !== 'ALL' ? filterStatus : undefined, search: search || undefined }).then(r => r.data),
  });

  const projects = data || [];

  const createMutation = useMutation({
    mutationFn: projectsAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); setModal(null); toast.success('✅ Projet créé'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => projectsAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); setModal(null); toast.success('✅ Projet mis à jour'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: projectsAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); toast.success('Projet supprimé'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, budget: form.budget ? Number(form.budget) : undefined, endDate: form.endDate || undefined };
    if (modal?.type === 'edit') {
      updateMutation.mutate({ id: modal.project.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer ce projet et toutes ses tâches ?')) deleteMutation.mutate(id);
  };

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
  const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;

  return (
    <motion.div className="page" variants={container} initial="hidden" animate="show">
      {/* HEADER */}
      <motion.div className="page-header" variants={fadeUp}>
        <div>
          <h1 className="page-title">Gestion des Projets</h1>
          <p className="page-subtitle">{projects.filter(p => p.status === 'IN_PROGRESS').length} en cours · Progression moyenne : <strong style={{ color: 'var(--accent-primary)' }}>{avgProgress}%</strong></p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button className={`btn ${viewMode === 'cards' ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '8px 12px' }}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setViewMode('cards')}>⊞ Cartes</motion.button>
          <motion.button className={`btn ${viewMode === 'table' ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '8px 12px' }}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setViewMode('table')}>☰ Table</motion.button>
          <motion.button className="btn btn--primary"
            whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(99,102,241,0.4)' }} whileTap={{ scale: 0.96 }}
            onClick={() => { setForm(emptyForm()); setModal('create'); }}><Plus size={16} /> Nouveau projet</motion.button>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={container} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total projets', value: projects.length,                                          color: '#6366f1', icon: '🗂️' },
          { label: 'En cours',      value: projects.filter(p => p.status === 'IN_PROGRESS').length,  color: '#f59e0b', icon: '⚙️' },
          { label: 'Budget total',  value: fmt(totalBudget),                                         color: '#10b981', icon: '💰' },
          { label: 'Terminés',      value: projects.filter(p => p.status === 'COMPLETED').length,    color: '#10b981', icon: '✅' },
        ].map((s) => (
          <motion.div key={s.label} variants={fadeUp} whileHover={{ y: -3, boxShadow: `0 8px 32px ${s.color}22` }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${s.color}`, borderRadius: 'var(--radius-lg)', padding: 18 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Filtres */}
      <motion.div variants={fadeUp} className="filters-bar">
        <div className="search-input">
          <Search size={16} className="search-input__icon" />
          <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <motion.button className={`btn ${filterStatus === 'ALL' ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '6px 12px', fontSize: 12 }}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => setFilterStatus('ALL')}>Tous</motion.button>
          {Object.entries(STATUS).map(([k, s]) => (
            <motion.button key={k} className={`btn ${filterStatus === k ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '6px 12px', fontSize: 12 }}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => setFilterStatus(k)}>{s.icon} {s.label}</motion.button>
          ))}
        </div>
      </motion.div>

      {isLoading ? <Skeleton /> : projects.length === 0 ? (
        <motion.div variants={fadeUp} style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <motion.div style={{ fontSize: 52, marginBottom: 16 }}
            animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}>🗂️</motion.div>
          <h3>Aucun projet</h3>
          <p style={{ fontSize: 13 }}>Créez votre premier projet pour commencer</p>
          <motion.button className="btn btn--primary" style={{ marginTop: 16 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
            onClick={() => { setForm(emptyForm()); setModal('create'); }}><Plus size={14} /> Nouveau projet</motion.button>
        </motion.div>
      ) : viewMode === 'cards' ? (
        <motion.div variants={container} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {projects.map(p => (
            <motion.div key={p.id} variants={cardV}>
              <ProjectCard project={p}
                onView={(proj) => setModal({ type: 'view', project: proj })}
                onEdit={(proj) => { setForm({ name: proj.name, description: proj.description || '', status: proj.status, priority: proj.priority, startDate: proj.startDate?.split('T')[0] || '', endDate: proj.endDate?.split('T')[0] || '', budget: proj.budget || '' }); setModal({ type: 'edit', project: proj }); }}
                onDelete={handleDelete}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="table-card">
          <table className="data-table">
            <thead><tr><th>Projet</th><th>Priorité</th><th>Progression</th><th>Budget</th><th>Échéance</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {projects.map((p, i) => (
                <motion.tr key={p.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.3 } }}
                  whileHover={{ backgroundColor: 'rgba(99,102,241,0.04)' }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(p.members?.length || 0)} membre(s)</div>
                  </td>
                  <td><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: PRIORITY[p.priority]?.color + '22', color: PRIORITY[p.priority]?.color }}>{PRIORITY[p.priority]?.label}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, minWidth: 80 }}>
                        <div style={{ height: '100%', width: `${p.progress}%`, background: STATUS[p.status]?.color, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 32 }}>{p.progress}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{fmt(p.budget)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.endDate ? new Date(p.endDate).toLocaleDateString('fr-FR') : '—'}</td>
                  <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: STATUS[p.status]?.color + '22', color: STATUS[p.status]?.color }}>{STATUS[p.status]?.icon} {STATUS[p.status]?.label}</span></td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-btn" onClick={() => setModal({ type: 'view', project: p })}><Eye size={13} /></button>
                      <button className="icon-btn" onClick={() => { setForm({ name: p.name, description: p.description || '', status: p.status, priority: p.priority, startDate: p.startDate?.split('T')[0] || '', endDate: p.endDate?.split('T')[0] || '', budget: p.budget || '' }); setModal({ type: 'edit', project: p }); }}><Edit2 size={13} /></button>
                      <button className="icon-btn icon-btn--danger" onClick={() => handleDelete(p.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* CREATE / EDIT MODAL */}
      {(modal === 'create' || modal?.type === 'edit') && (
        <Modal title={modal?.type === 'edit' ? '✏️ Modifier le projet' : '➕ Nouveau projet'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group"><label>Nom du projet *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group"><label>Statut</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Priorité</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Date début *</label><input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required /></div>
                <div className="form-group"><label>Date fin</label><input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label>Budget (DZD)</label><input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} min="0" /></div>
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

      {/* VIEW MODAL */}
      {modal?.type === 'view' && (
        <Modal title="📋 Détails du projet" onClose={() => setModal(null)} size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{modal.project.name}</h2>
                {modal.project.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{modal.project.description}</p>}
              </div>
              <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: STATUS[modal.project.status]?.color + '22', color: STATUS[modal.project.status]?.color, whiteSpace: 'nowrap', marginLeft: 16 }}>
                {STATUS[modal.project.status]?.icon} {STATUS[modal.project.status]?.label}
              </span>
            </div>

            <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 600 }}>Progression globale</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: STATUS[modal.project.status]?.color }}>{modal.project.progress}%</span>
              </div>
              <div style={{ height: 10, background: 'var(--border)', borderRadius: 5 }}>
                <div style={{ height: '100%', width: `${modal.project.progress}%`, background: STATUS[modal.project.status]?.color, borderRadius: 5, transition: 'width 1s ease' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Priorité', PRIORITY[modal.project.priority]?.label],
                ['Membres', `${modal.project.members?.length || 0} membre(s)`],
                ['Date début', modal.project.startDate ? new Date(modal.project.startDate).toLocaleDateString('fr-FR') : '—'],
                ['Date fin', modal.project.endDate ? new Date(modal.project.endDate).toLocaleDateString('fr-FR') : '—'],
                ['Budget', fmt(modal.project.budget)],
                ['Tâches', `${(modal.project.tasks || []).filter(t => t.status === 'DONE').length} / ${(modal.project.tasks || []).length} terminées`],
              ].map(([label, value]) => (
                <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>

            {modal.project.members?.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Équipe projet</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {modal.project.members.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-primary)', borderRadius: 20, padding: '4px 12px', fontSize: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                        {m.user ? (m.user.firstName[0] + m.user.lastName[0]).toUpperCase() : '?'}
                      </div>
                      {m.user ? `${m.user.firstName} ${m.user.lastName}` : 'Inconnu'}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
