import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leavesAPI, employeesAPI } from '../../api/client.js';
import { Plus, Check, X, Clock, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const LEAVE_TYPES = {
  ANNUAL: 'Congé annuel',
  SICK: 'Maladie',
  MATERNITY: 'Maternité',
  PATERNITY: 'Paternité',
  UNPAID: 'Sans solde',
  OTHER: 'Autre',
};

const STATUS = {
  PENDING: { label: 'En attente', color: '#f59e0b', icon: <Clock size={13} /> },
  APPROVED: { label: 'Approuvé', color: '#10b981', icon: <Check size={13} /> },
  REJECTED: { label: 'Refusé', color: '#ef4444', icon: <X size={13} /> },
  CANCELLED: { label: 'Annulé', color: '#64748b', icon: <X size={13} /> },
};

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header">
        <h3>{title}</h3>
        <button className="modal__close" onClick={onClose}>✕</button>
      </div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

const LeaveForm = ({ employees, onSubmit, onCancel, isLoading }) => {
  const [form, setForm] = useState({
    employeeId: '',
    type: 'ANNUAL',
    startDate: '',
    endDate: '',
    days: '',
    reason: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleDates = (k, v) => {
    const next = { ...form, [k]: v };
    if (next.startDate && next.endDate && next.startDate <= next.endDate) {
      const start = new Date(next.startDate);
      const end = new Date(next.endDate);
      const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      next.days = diff;
    }
    setForm(next);
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Employé *</label>
          <select value={form.employeeId} onChange={e => set('employeeId', e.target.value)} required>
            <option value="">-- Sélectionner un employé --</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.department}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Type de congé *</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}>
            {Object.entries(LEAVE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Date de début *</label>
          <input type="date" value={form.startDate} onChange={e => handleDates('startDate', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Date de fin *</label>
          <input type="date" value={form.endDate} min={form.startDate} onChange={e => handleDates('endDate', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Nombre de jours *</label>
          <input type="number" value={form.days} onChange={e => set('days', e.target.value)} required min="1" />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Motif</label>
          <input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Optionnel" />
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn--primary" disabled={isLoading}>{isLoading ? 'Enregistrement…' : 'Soumettre'}</button>
      </div>
    </form>
  );
};

export default function LeavesPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', filter],
    queryFn: () => leavesAPI.getAll(filter !== 'ALL' ? { status: filter } : {}).then(r => r.data),
  });

  const { data: empData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesAPI.getAll({ limit: 200 }).then(r => r.data || []),
  });

  const createMutation = useMutation({
    mutationFn: leavesAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leaves'] }); setShowForm(false); toast.success('Demande soumise'); },
    onError: (err) => toast.error(err?.message || err?.error || 'Erreur lors de la soumission'),
  });

  const approveMutation = useMutation({
    mutationFn: leavesAPI.approve,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leaves'] }); queryClient.invalidateQueries({ queryKey: ['employees'] }); toast.success('✅ Congé approuvé'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const rejectMutation = useMutation({
    mutationFn: leavesAPI.reject,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Congé refusé'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const cancelMutation = useMutation({
    mutationFn: leavesAPI.cancel,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Demande annulée'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const requests = data || [];
  const counts = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🏖️ Gestion des Congés</h1>
          <p className="page-subtitle">{counts.pending} demande(s) en attente</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nouvelle demande
        </button>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total demandes', value: counts.total, color: '#6366f1', icon: '📋' },
          { label: 'En attente', value: counts.pending, color: '#f59e0b', icon: '⏳' },
          { label: 'Approuvés', value: counts.approved, color: '#10b981', icon: '✅' },
          { label: 'Refusés', value: counts.rejected, color: '#ef4444', icon: '❌' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* FILTRES */}
      <div style={{ display: 'flex', gap: 8 }}>
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
          <button key={f} className={`btn ${filter === f ? 'btn--primary' : 'btn--ghost'}`}
            style={{ padding: '6px 14px', fontSize: 13 }}
            onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'Tous' : STATUS[f]?.label}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr><th>Employé</th><th>Type</th><th>Période</th><th>Jours</th><th>Statut</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="table-loading">Chargement…</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} className="table-empty">Aucune demande trouvée</td></tr>
            ) : requests.map(req => (
              <tr key={req.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{req.employee?.firstName} {req.employee?.lastName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{req.employee?.department}</div>
                </td>
                <td><span className="tag">{LEAVE_TYPES[req.type] || req.type}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {new Date(req.startDate).toLocaleDateString('fr-FR')} → {new Date(req.endDate).toLocaleDateString('fr-FR')}
                </td>
                <td style={{ fontWeight: 600 }}>{req.days}j</td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    background: STATUS[req.status]?.color + '22',
                    color: STATUS[req.status]?.color,
                  }}>
                    {STATUS[req.status]?.icon} {STATUS[req.status]?.label}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    {req.status === 'PENDING' && (
                      <>
                        <button className="btn btn--primary" style={{ padding: '5px 12px', fontSize: 12 }}
                          onClick={() => approveMutation.mutate(req.id)}>✅ Approuver</button>
                        <button className="btn btn--ghost" style={{ padding: '5px 12px', fontSize: 12, color: '#ef4444' }}
                          onClick={() => rejectMutation.mutate(req.id)}>❌ Refuser</button>
                        <button className="icon-btn icon-btn--danger" title="Annuler"
                          onClick={() => { if (window.confirm('Annuler cette demande ?')) cancelMutation.mutate(req.id); }}>
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="➕ Nouvelle demande de congé" onClose={() => setShowForm(false)}>
          <LeaveForm
            employees={empData || []}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
