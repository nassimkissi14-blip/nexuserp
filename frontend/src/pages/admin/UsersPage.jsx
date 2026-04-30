import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client.js';
import { Plus, Edit2, UserX, UserCheck, Shield, MoreVertical, Info, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const usersAPI = {
  getAll: () => apiClient.get('/users').then(r => r.data),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.patch(`/users/${id}`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
};

const ROLES = ['OPERATOR', 'MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'];
const ROLE_COLOR = { SUPER_ADMIN: '#ef4444', ADMIN: '#f97316', DIRECTOR: '#8b5cf6', MANAGER: '#3b82f6', OPERATOR: '#64748b' };
const ROLE_LABEL = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', DIRECTOR: 'Directeur', MANAGER: 'Manager', OPERATOR: 'Opérateur' };
const ROLE_ACCESS = {
  OPERATOR:   'Dashboard · Messagerie · Son département uniquement',
  MANAGER:    'Son département · Rapports de son service · Gestion équipe',
  DIRECTOR:   'Tous les modules · Rapports avancés · Validation globale',
  ADMIN:      'Accès total · Gestion modules · Gestion utilisateurs',
  SUPER_ADMIN:'Accès total + Configuration système et compagnie',
};
const DEPARTMENTS = ['Direction', 'Ressources Humaines', 'Finance', 'CRM & Ventes', 'Production', 'Logistique', 'IT', 'Maintenance', 'Administration'];

const Modal = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
      <div className="modal__header"><h3>{title}</h3><button className="modal__close" onClick={onClose}>✕</button></div>
      <div className="modal__body">{children}</div>
    </div>
  </div>
);

function ActionMenu({ user, onEdit, onToggle, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)} style={{ background: 'transparent', border: '1px solid transparent', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}>
        <MoreVertical size={15} />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 200, minWidth: 170, overflow: 'hidden' }}>
          <button onClick={() => { setOpen(false); onEdit(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'left' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
            <Edit2 size={13} /> Modifier le rôle
          </button>
          <button onClick={() => { setOpen(false); onToggle(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: user.isActive ? '#ef4444' : '#10b981', textAlign: 'left' }}
            onMouseEnter={e => { e.currentTarget.style.background = user.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
            {user.isActive ? <><UserX size={13} /> Désactiver</> : <><UserCheck size={13} /> Activer</>}
          </button>
          <button onClick={() => { setOpen(false); onDelete(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: '#ef4444', textAlign: 'left', borderTop: '1px solid rgba(239,68,68,0.15)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
            <Trash2 size={13} /> Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

const UserForm = ({ initial, onSubmit, onCancel, isLoading }) => {
  const [form, setForm] = useState(initial || { firstName: '', lastName: '', email: '', password: '', role: 'OPERATOR', department: DEPARTMENTS[0] });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = !!initial?.email === false; // edit mode = no email field

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="form-group"><label>Prénom *</label><input value={form.firstName} onChange={e => set('firstName', e.target.value)} required /></div>
        <div className="form-group"><label>Nom *</label><input value={form.lastName} onChange={e => set('lastName', e.target.value)} required /></div>
        {!initial && <>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Email *</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} required /></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Mot de passe <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(vide = promedal2025)</span></label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Laisser vide pour le mot de passe par défaut" />
          </div>
        </>}
        <div className="form-group"><label>Rôle & Permissions</label>
          <select value={form.role} onChange={e => set('role', e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Département</label>
          <select value={form.department || ''} onChange={e => set('department', e.target.value)}>
            <option value="">— Aucun —</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Role permission preview */}
      <div style={{ padding: '10px 14px', background: ROLE_COLOR[form.role] + '10', border: `1px solid ${ROLE_COLOR[form.role]}30`, borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Shield size={14} style={{ color: ROLE_COLOR[form.role], marginTop: 1, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLOR[form.role], marginBottom: 2 }}>{ROLE_LABEL[form.role]}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{ROLE_ACCESS[form.role]}</div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn--primary" disabled={isLoading}>{isLoading ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [showMatrix, setShowMatrix] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: usersAPI.getAll });

  const createMutation = useMutation({
    mutationFn: usersAPI.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setModal(null); toast.success('✅ Utilisateur créé !'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setModal(null); toast.success('✅ Mis à jour'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => usersAPI.update(id, { isActive }),
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success(vars.isActive ? '✅ Compte activé' : '🔴 Compte désactivé'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: usersAPI.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur supprimé'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const users = data || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Gestion Utilisateurs</h1>
          <p className="page-subtitle">{users.length} utilisateurs · {users.filter(u => u.isActive).length} actifs</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--ghost" onClick={() => setShowMatrix(!showMatrix)} style={{ fontSize: 12 }}>
            <Info size={13} /> Matrice de droits
          </button>
          <button className="btn btn--primary" onClick={() => setModal('create')}><Plus size={16} /> Créer un utilisateur</button>
        </div>
      </div>

      {/* Role stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ROLES.filter(r => users.some(u => u.role === r)).map(role => (
          <div key={role} style={{ background: 'var(--bg-card)', border: `1px solid ${ROLE_COLOR[role]}33`, borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={11} style={{ color: ROLE_COLOR[role] }} />
            <span style={{ fontSize: 11.5, color: ROLE_COLOR[role], fontWeight: 600 }}>{ROLE_LABEL[role]}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{users.filter(u => u.role === role).length}</span>
          </div>
        ))}
      </div>

      {/* Permissions matrix */}
      {showMatrix && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>🔐 Matrice des droits d'accès</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ROLES.map(role => (
              <div key={role} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '10px 14px', background: ROLE_COLOR[role] + '08', borderRadius: 8, border: `1px solid ${ROLE_COLOR[role]}20` }}>
                <Shield size={15} style={{ color: ROLE_COLOR[role], flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: ROLE_COLOR[role], marginBottom: 3 }}>{ROLE_LABEL[role]}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ROLE_ACCESS[role]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Utilisateur', 'Rôle & Permissions', 'Département', 'Dernière connexion', 'Statut', ''].map((h, i) => (
                <th key={i} style={{ padding: '11px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.7, textAlign: 'left', background: 'var(--bg-card)',
                  ...(i === 5 && { position: 'sticky', right: 0, width: 52, textAlign: 'center', borderLeft: '1px solid var(--border)' }) }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement…</td></tr>
            ) : users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <td style={{ padding: '12px 14px', minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: `hsl(${(user.firstName.charCodeAt(0) * 13) % 360}, 65%, 42%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{user.firstName} {user.lastName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: ROLE_COLOR[user.role] + '18', color: ROLE_COLOR[user.role], width: 'fit-content' }}>
                      <Shield size={9} />{ROLE_LABEL[user.role]}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', maxWidth: 220 }}>{ROLE_ACCESS[user.role]?.split('·')[0].trim()}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}><span className="tag">{user.department || '—'}</span></td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Jamais'}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: user.isActive ? '#10b98118' : '#ef444418', color: user.isActive ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: user.isActive ? '#10b981' : '#ef4444' }} />
                    {user.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', position: 'sticky', right: 0, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', textAlign: 'center', zIndex: 1 }}>
                  <ActionMenu
                    user={user}
                    onEdit={() => setModal({ type: 'edit', user })}
                    onToggle={() => toggleMutation.mutate({ id: user.id, isActive: !user.isActive })}
                    onDelete={() => { if (window.confirm(`Supprimer définitivement "${user.firstName} ${user.lastName}" ?`)) deleteMutation.mutate(user.id); }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'create' && (
        <Modal title="➕ Nouvel utilisateur" onClose={() => setModal(null)}>
          <UserForm onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setModal(null)} isLoading={createMutation.isPending} />
        </Modal>
      )}
      {modal?.type === 'edit' && (
        <Modal title="✏️ Modifier le rôle & département" onClose={() => setModal(null)}>
          <UserForm
            initial={{ firstName: modal.user.firstName, lastName: modal.user.lastName, role: modal.user.role, department: modal.user.department || '' }}
            onSubmit={(data) => updateMutation.mutate({ id: modal.user.id, data })}
            onCancel={() => setModal(null)}
            isLoading={updateMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
