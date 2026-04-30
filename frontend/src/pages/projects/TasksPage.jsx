import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Check, ChevronDown } from 'lucide-react';
import { projectsAPI } from '../../api/client.js';
import toast from 'react-hot-toast';

const STATUS = {
  TODO:        { label: 'À faire',     color: '#64748b', icon: '📋' },
  IN_PROGRESS: { label: 'En cours',    color: '#f59e0b', icon: '⚙️' },
  REVIEW:      { label: 'En révision', color: '#6366f1', icon: '👀' },
  DONE:        { label: 'Terminé',     color: '#10b981', icon: '✅' },
};
const PRIORITY = {
  LOW:      { label: 'Faible',   color: '#10b981' },
  MEDIUM:   { label: 'Moyenne',  color: '#f59e0b' },
  HIGH:     { label: 'Haute',    color: '#ef4444' },
  CRITICAL: { label: 'Critique', color: '#dc2626' },
};

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

const emptyForm = (projectId = '') => ({
  projectId, title: '', description: '', status: 'TODO', priority: 'MEDIUM', dueDate: '',
});

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterProject, setFilterProject] = useState('ALL');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks-all', filterStatus, filterProject],
    queryFn: () => projectsAPI.getAllTasks({
      status: filterStatus !== 'ALL' ? filterStatus : undefined,
      limit: 100,
    }).then(r => r.data),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsAPI.getAll({ limit: 100 }).then(r => r.data),
  });

  const tasks = (tasksData || []).filter(t =>
    (filterProject === 'ALL' || t.project?.id === filterProject) &&
    (search === '' || t.title.toLowerCase().includes(search.toLowerCase()) || t.project?.name?.toLowerCase().includes(search.toLowerCase()))
  );

  const projects = projectsData || [];

  const createMutation = useMutation({
    mutationFn: ({ projectId, data }) => projectsAPI.createTask(projectId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks-all'] }); queryClient.invalidateQueries({ queryKey: ['projects'] }); setModal(null); toast.success('✅ Tâche créée'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => projectsAPI.updateTask(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks-all'] }); queryClient.invalidateQueries({ queryKey: ['projects'] }); setModal(null); toast.success('✅ Tâche mise à jour'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: projectsAPI.deleteTask,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks-all'] }); queryClient.invalidateQueries({ queryKey: ['projects'] }); toast.success('Tâche supprimée'); },
    onError: (e) => toast.error(e?.message || 'Erreur'),
  });

  const quickStatus = (task, newStatus) => updateMutation.mutate({ id: task.id, data: { status: newStatus } });

  const handleSubmit = (e) => {
    e.preventDefault();
    const { projectId, ...rest } = form;
    if (modal?.type === 'edit') {
      updateMutation.mutate({ id: modal.task.id, data: rest });
    } else {
      if (!projectId) return toast.error('Sélectionnez un projet');
      createMutation.mutate({ projectId, data: rest });
    }
  };

  const byStatus = (s) => tasks.filter(t => t.status === s);
  const boardMode = filterStatus === 'ALL' && filterProject === 'ALL' && search === '';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">✅ Gestion des Tâches</h1>
          <p className="page-subtitle">{tasks.length} tâche(s) · {tasks.filter(t => t.status === 'DONE').length} terminée(s)</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setForm(emptyForm()); setModal('create'); }}><Plus size={16} /> Nouvelle tâche</button>
      </div>

      {/* Filtres */}
      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} className="search-input__icon" />
          <input placeholder="Rechercher une tâche…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontSize: 13 }}>
          <option value="ALL">Tous les projets</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`btn ${filterStatus === 'ALL' ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setFilterStatus('ALL')}>Tous</button>
          {Object.entries(STATUS).map(([k, s]) => (
            <button key={k} className={`btn ${filterStatus === k ? 'btn--primary' : 'btn--ghost'}`} style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setFilterStatus(k)}>{s.icon} {s.label}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Chargement…</div>
      ) : boardMode ? (
        /* KANBAN VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'start' }}>
          {Object.entries(STATUS).map(([statusKey, statusCfg]) => {
            const col = byStatus(statusKey);
            return (
              <div key={statusKey} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: statusCfg.color + '11' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: statusCfg.color }}>{statusCfg.icon} {statusCfg.label}</span>
                  <span style={{ background: statusCfg.color + '33', color: statusCfg.color, borderRadius: 10, padding: '1px 8px', fontSize: 12, fontWeight: 700 }}>{col.length}</span>
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                  {col.map(task => (
                    <div key={task.id} style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'transform 0.15s', borderLeft: `3px solid ${PRIORITY[task.priority]?.color}` }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{task.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>{task.project?.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: PRIORITY[task.priority]?.color + '22', color: PRIORITY[task.priority]?.color, fontWeight: 600 }}>{PRIORITY[task.priority]?.label}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {statusKey !== 'DONE' && <button className="icon-btn" style={{ padding: 2 }} title="Marquer terminé" onClick={() => quickStatus(task, 'DONE')}><Check size={11} /></button>}
                          <button className="icon-btn" style={{ padding: 2 }} onClick={() => { setForm({ projectId: task.project?.id || '', title: task.title, description: task.description || '', status: task.status, priority: task.priority, dueDate: task.dueDate?.split('T')[0] || '' }); setModal({ type: 'edit', task }); }}><Edit2 size={11} /></button>
                          <button className="icon-btn icon-btn--danger" style={{ padding: 2 }} onClick={() => { if (window.confirm('Supprimer ?')) deleteMutation.mutate(task.id); }}><Trash2 size={11} /></button>
                        </div>
                      </div>
                      {task.dueDate && <div style={{ fontSize: 10, color: new Date(task.dueDate) < new Date() ? '#ef4444' : 'var(--text-muted)', marginTop: 6 }}>📅 {new Date(task.dueDate).toLocaleDateString('fr-FR')}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="table-card">
          <table className="data-table">
            <thead><tr><th>Tâche</th><th>Projet</th><th>Priorité</th><th>Statut</th><th>Échéance</th><th>Actions</th></tr></thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune tâche</td></tr>
              ) : tasks.map(task => (
                <tr key={task.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{task.title}</div>
                    {task.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.description.substring(0, 60)}</div>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{task.project?.name || '—'}</td>
                  <td><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: PRIORITY[task.priority]?.color + '22', color: PRIORITY[task.priority]?.color }}>{PRIORITY[task.priority]?.label}</span></td>
                  <td><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: STATUS[task.status]?.color + '22', color: STATUS[task.status]?.color }}>{STATUS[task.status]?.icon} {STATUS[task.status]?.label}</span></td>
                  <td style={{ fontSize: 12, color: task.dueDate && new Date(task.dueDate) < new Date() ? '#ef4444' : 'var(--text-muted)' }}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '—'}</td>
                  <td>
                    <div className="table-actions">
                      {task.status !== 'DONE' && <button className="icon-btn" title="Terminer" onClick={() => quickStatus(task, 'DONE')}><Check size={13} /></button>}
                      <button className="icon-btn" onClick={() => { setForm({ projectId: task.project?.id || '', title: task.title, description: task.description || '', status: task.status, priority: task.priority, dueDate: task.dueDate?.split('T')[0] || '' }); setModal({ type: 'edit', task }); }}><Edit2 size={13} /></button>
                      <button className="icon-btn icon-btn--danger" onClick={() => { if (window.confirm('Supprimer ?')) deleteMutation.mutate(task.id); }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FORM MODAL */}
      {(modal === 'create' || modal?.type === 'edit') && (
        <Modal title={modal?.type === 'edit' ? '✏️ Modifier la tâche' : '➕ Nouvelle tâche'} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {modal === 'create' && (
                <div className="form-group"><label>Projet *</label>
                  <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} required>
                    <option value="">— Choisir un projet —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group"><label>Titre *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
              <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ resize: 'vertical' }} /></div>
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
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label>Date limite</label><input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
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
    </div>
  );
}
