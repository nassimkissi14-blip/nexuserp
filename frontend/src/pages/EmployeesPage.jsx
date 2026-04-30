import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesAPI } from '../api/client.js';
import { Search, Plus, Edit2, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['Direction', 'Ressources Humaines', 'Finance', 'CRM & Ventes', 'Production', 'Logistique', 'IT'];
const CONTRACT_TYPES = ['CDI', 'CDD', 'INTERIM', 'STAGE', 'FREELANCE'];
const STATUS_LABELS = { ACTIVE: 'Actif', ON_LEAVE: 'En congé', SUSPENDED: 'Suspendu', TERMINATED: 'Archivé' };

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()}>
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
    contractType: 'CDI', status: 'ACTIVE',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      <div className="form-row">
        <div className="form-group">
          <label>Prénom *</label>
          <input value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Nom *</label>
          <input value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Email *</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Téléphone</label>
          <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Poste *</label>
          <input value={form.position} onChange={e => set('position', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Département *</label>
          <select value={form.department} onChange={e => set('department', e.target.value)}>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Salaire (DZD) *</label>
          <input type="number" value={form.salary} onChange={e => set('salary', e.target.value)} required min="0" />
        </div>
        <div className="form-group">
          <label>Date d'embauche *</label>
          <input type="date" value={form.hireDate} onChange={e => set('hireDate', e.target.value)} required />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Contrat</label>
          <select value={form.contractType} onChange={e => set('contractType', e.target.value)}>
            {CONTRACT_TYPES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Statut</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn--primary" disabled={isLoading}>
          {isLoading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
};

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [modal, setModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search, filterDept],
    queryFn: () => employeesAPI.getAll({ page, limit: 15, search, department: filterDept }),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: employeesAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); setModal(null); toast.success('Employé créé !'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => employeesAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); setModal(null); toast.success('Employé mis à jour !'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: employeesAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employé archivé'); },
  });

  const employees = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Employés</h1>
          <p className="page-subtitle">{pagination.total || 0} employé(s) au total</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModal('create')}>
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <Search size={16} className="search-input__icon" />
          <input
            placeholder="Rechercher…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}>
          <option value="">Tous les départements</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Poste</th>
              <th>Département</th>
              <th>Contrat</th>
              <th>Salaire</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="table-loading">Chargement…</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={7} className="table-empty">Aucun employé trouvé</td></tr>
            ) : employees.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <div className="table-user">
                    <div className="table-user__avatar">{emp.firstName[0]}{emp.lastName[0]}</div>
                    <div>
                      <div className="table-user__name">{emp.firstName} {emp.lastName}</div>
                      <div className="table-user__email">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td>{emp.position}</td>
                <td><span className="tag">{emp.department}</span></td>
                <td>{emp.contractType}</td>
                <td>{new Intl.NumberFormat('fr-DZ').format(emp.salary)} DZD</td>
                <td>
                  <span className={`status-dot status-dot--${emp.status.toLowerCase()}`}>
                    {STATUS_LABELS[emp.status]}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="icon-btn" title="Voir" onClick={() => setModal({ type: 'view', emp })}>
                      <Eye size={15} />
                    </button>
                    <button className="icon-btn" title="Modifier" onClick={() => setModal({ type: 'edit', emp })}>
                      <Edit2 size={15} />
                    </button>
                    <button className="icon-btn icon-btn--danger" title="Archiver"
                      onClick={() => { if (window.confirm('Archiver cet employé ?')) deleteMutation.mutate(emp.id); }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <button className="pagination__btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={16} />
          </button>
          <span className="pagination__info">Page {page} / {pagination.pages}</span>
          <button className="pagination__btn" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Ajouter un employé" onClose={() => setModal(null)}>
          <EmployeeForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setModal(null)}
            isLoading={createMutation.isPending}
          />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title="Modifier l'employé" onClose={() => setModal(null)}>
          <EmployeeForm
            initial={modal.emp}
            onSubmit={(data) => updateMutation.mutate({ id: modal.emp.id, data })}
            onCancel={() => setModal(null)}
            isLoading={updateMutation.isPending}
          />
        </Modal>
      )}

      {modal?.type === 'view' && (
        <Modal title="Détails employé" onClose={() => setModal(null)}>
          <div className="employee-detail">
            <div className="employee-detail__avatar">
              {modal.emp.firstName[0]}{modal.emp.lastName[0]}
            </div>
            <h2>{modal.emp.firstName} {modal.emp.lastName}</h2>
            <p style={{ color: 'var(--text-muted)' }}>{modal.emp.position} — {modal.emp.department}</p>
            <div className="detail-grid">
              <div><label>Email</label><span>{modal.emp.email}</span></div>
              <div><label>Téléphone</label><span>{modal.emp.phone || '—'}</span></div>
              <div><label>Contrat</label><span>{modal.emp.contractType}</span></div>
              <div><label>Embauché le</label><span>{new Date(modal.emp.hireDate).toLocaleDateString('fr-FR')}</span></div>
              <div><label>Salaire</label><span>{new Intl.NumberFormat('fr-DZ').format(modal.emp.salary)} DZD</span></div>
              <div><label>Statut</label><span>{STATUS_LABELS[modal.emp.status]}</span></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}