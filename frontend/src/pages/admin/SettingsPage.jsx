import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient, { departmentsAPI } from '../../api/client.js';
import { useAuthStore } from '../../store/index.js';
import { Save, User, Building2, Lock, LayoutGrid, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['Direction', 'Ressources Humaines', 'Finance', 'CRM & Ventes', 'Production', 'Logistique', 'IT', 'Maintenance', 'Administration'];

const DEPT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#84cc16',
];

const ROLE_ORDER = { OPERATOR: 0, MANAGER: 1, DIRECTOR: 2, ADMIN: 3, SUPER_ADMIN: 4 };
const isManager = (role) => (ROLE_ORDER[role] || 0) >= ROLE_ORDER.MANAGER;
const canEditDept = (role, userDept, targetDept) => {
  if (!isManager(role)) return false;
  if (role === 'MANAGER') return userDept === targetDept;
  return true;
};

const TABS = [
  { id: 'profile',  label: 'Mon profil',      icon: <User size={15} /> },
  { id: 'dept',     label: 'Mon département',  icon: <LayoutGrid size={15} /> },
  { id: 'company',  label: 'Entreprise',       icon: <Building2 size={15} /> },
  { id: 'security', label: 'Sécurité',         icon: <Lock size={15} /> },
];

const Section = ({ title, icon, children }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>
      <h3 style={{ fontWeight: 600, fontSize: 15 }}>{title}</h3>
    </div>
    <div style={{ padding: 20 }}>{children}</div>
  </div>
);

function ProfileTab({ user }) {
  const { fetchMe } = useAuthStore();
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    department: user?.department || DEPARTMENTS[0],
  });
  const setP = (k, v) => setProfile(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) => apiClient.patch('/users/me', data),
    onSuccess: async () => { await fetchMe(); toast.success('Profil mis à jour'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const ROLE_LABEL = { SUPER_ADMIN: 'Super Administrateur', ADMIN: 'Administrateur', DIRECTOR: 'Directeur', MANAGER: 'Manager', OPERATOR: 'Opérateur' };

  return (
    <Section title="Mon profil" icon={<User size={16} />}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'white', flexShrink: 0 }}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.firstName} {user?.lastName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
          <span style={{ marginTop: 4, display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, background: '#6366f122', color: '#6366f1', fontWeight: 600 }}>
            {ROLE_LABEL[user?.role] || user?.role}
          </span>
        </div>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(profile); }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div className="form-group"><label>Prénom</label><input value={profile.firstName} onChange={e => setP('firstName', e.target.value)} /></div>
          <div className="form-group"><label>Nom</label><input value={profile.lastName} onChange={e => setP('lastName', e.target.value)} /></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Département</label>
            <select value={profile.department} onChange={e => setP('department', e.target.value)}>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn--primary" style={{ width: '100%' }} disabled={mutation.isPending}>
          <Save size={14} /> {mutation.isPending ? 'Enregistrement…' : 'Enregistrer le profil'}
        </button>
      </form>
    </Section>
  );
}

function SecurityTab() {
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const setPw = (k, v) => setPwd(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) => apiClient.patch('/users/me', data),
    onSuccess: () => { setPwd({ currentPassword: '', newPassword: '', confirm: '' }); toast.success('Mot de passe changé'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirm) return toast.error('Les mots de passe ne correspondent pas');
    if (pwd.newPassword.length < 6) return toast.error('Minimum 6 caractères');
    mutation.mutate({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
  };

  return (
    <Section title="Changer le mot de passe" icon={<Lock size={16} />}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
          <div className="form-group">
            <label>Mot de passe actuel *</label>
            <input type="password" value={pwd.currentPassword} onChange={e => setPw('currentPassword', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Nouveau mot de passe *</label>
            <input type="password" value={pwd.newPassword} onChange={e => setPw('newPassword', e.target.value)} required minLength={6} />
          </div>
          <div className="form-group">
            <label>Confirmer *</label>
            <input type="password" value={pwd.confirm} onChange={e => setPw('confirm', e.target.value)} required />
            {pwd.confirm && pwd.newPassword !== pwd.confirm && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Les mots de passe ne correspondent pas</div>
            )}
          </div>
        </div>
        <button type="submit" className="btn btn--primary" style={{ width: '100%' }} disabled={mutation.isPending || pwd.newPassword !== pwd.confirm}>
          <Lock size={14} /> {mutation.isPending ? 'Mise à jour…' : 'Changer le mot de passe'}
        </button>
      </form>
    </Section>
  );
}

function CompanyTab({ user }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Section title="Informations entreprise" icon={<Building2 size={16} />}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['Entreprise', user?.company?.name || '—'],
            ['Plan', user?.company?.subscriptionPlan || '—'],
            ['Email', user?.company?.email || '—'],
            ['Version', '1.0'],
          ].map(([label, value]) => (
            <div key={label} style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Raccourcis clavier" icon="⌨️">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[['Alt + D','Dashboard'],['Alt + E','Employés'],['Alt + C','Clients CRM'],['Alt + O','Commandes'],['Alt + P','Produits'],['Alt + M','Messagerie'],['Alt + A','NexusAI']].map(([key, action]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{action}</span>
              <kbd style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: 600 }}>{key}</kbd>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function DeptConfigForm({ dept, user, onSaved }) {
  const qc = useQueryClient();
  const canEdit = canEditDept(user?.role, user?.department, dept);

  const { data, isLoading } = useQuery({
    queryKey: ['dept-config', dept],
    queryFn: () => departmentsAPI.getConfig(dept),
    select: (r) => r.data,
  });

  const [form, setForm] = useState(null);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Initialize form when data loads
  if (data && form === null) {
    setForm({
      description: data.description || '',
      headName:    data.headName    || '',
      email:       data.email       || '',
      phone:       data.phone       || '',
      location:    data.location    || '',
      budgetTarget: data.budgetTarget ?? '',
      color:       data.color       || DEPT_COLORS[0],
      goals:       data.goals       || '',
    });
  }

  const mutation = useMutation({
    mutationFn: (d) => departmentsAPI.saveConfig(dept, d),
    onSuccess: () => {
      qc.invalidateQueries(['dept-config', dept]);
      qc.invalidateQueries(['dept-configs']);
      toast.success(`Département "${dept}" mis à jour`);
      onSaved?.();
    },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  if (isLoading || form === null) return <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</div>;

  return (
    <div>
      {/* Header with color dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)' }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: form.color || '#6366f1', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{dept}</div>
          {data?.updatedBy && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dernière modif. par {data.updatedBy}</div>}
        </div>
        {!canEdit && (
          <span style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 10px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Lecture seule</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Description du département</label>
          <textarea rows={2} value={form.description} onChange={e => setF('description', e.target.value)} disabled={!canEdit} style={{ resize: 'vertical' }} />
        </div>
        <div className="form-group">
          <label>Chef de département</label>
          <input value={form.headName} onChange={e => setF('headName', e.target.value)} disabled={!canEdit} placeholder="Nom et prénom" />
        </div>
        <div className="form-group">
          <label>Localisation / Bureau</label>
          <input value={form.location} onChange={e => setF('location', e.target.value)} disabled={!canEdit} placeholder="ex: Bâtiment A, 2ème étage" />
        </div>
        <div className="form-group">
          <label>Email de contact</label>
          <input type="email" value={form.email} onChange={e => setF('email', e.target.value)} disabled={!canEdit} placeholder="dept@entreprise.dz" />
        </div>
        <div className="form-group">
          <label>Téléphone</label>
          <input value={form.phone} onChange={e => setF('phone', e.target.value)} disabled={!canEdit} placeholder="+213 …" />
        </div>
        <div className="form-group">
          <label>Budget cible (DZD)</label>
          <input type="number" value={form.budgetTarget} onChange={e => setF('budgetTarget', e.target.value)} disabled={!canEdit} placeholder="0" />
        </div>
        <div className="form-group">
          <label>Couleur du département</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {DEPT_COLORS.map(c => (
              <button key={c} type="button" onClick={() => canEdit && setF('color', c)} disabled={!canEdit}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: canEdit ? 'pointer' : 'default', padding: 0 }} />
            ))}
          </div>
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Objectifs / Notes</label>
          <textarea rows={3} value={form.goals} onChange={e => setF('goals', e.target.value)} disabled={!canEdit} placeholder="Objectifs trimestriels, KPIs, remarques…" style={{ resize: 'vertical' }} />
        </div>
      </div>

      {canEdit && (
        <button className="btn btn--primary" style={{ width: '100%', marginTop: 4 }} disabled={mutation.isPending}
          onClick={() => mutation.mutate(form)}>
          <Save size={14} /> {mutation.isPending ? 'Enregistrement…' : `Enregistrer la config de "${dept}"`}
        </button>
      )}
    </div>
  );
}

function DeptTab({ user }) {
  const userDept = user?.department;
  const role = user?.role;
  const canSeeAll = (ROLE_ORDER[role] || 0) >= ROLE_ORDER.DIRECTOR;

  // MANAGERs only see their own dept; DIRECTOR+ see all
  const visibleDepts = canSeeAll ? DEPARTMENTS : (userDept ? [userDept] : []);
  const [selected, setSelected] = useState(visibleDepts[0] || DEPARTMENTS[0]);

  if (!isManager(role)) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
        <div style={{ fontSize: 14 }}>La configuration de département est réservée aux managers et supérieurs.</div>
      </div>
    );
  }

  return (
    <Section title="Configuration des départements" icon={<LayoutGrid size={16} />}>
      {canSeeAll && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {DEPARTMENTS.map(d => (
            <button key={d} type="button" onClick={() => setSelected(d)}
              className={selected === d ? 'btn btn--primary' : 'btn btn--ghost'}
              style={{ fontSize: 12, padding: '5px 12px' }}>
              {d === userDept ? `★ ${d}` : d}
            </button>
          ))}
        </div>
      )}
      <DeptConfigForm dept={selected} user={user} />
    </Section>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('profile');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Paramètres</h1>
          <p className="page-subtitle">Gérez votre profil, votre département et vos préférences</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: tab === t.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'profile'  && <ProfileTab user={user} />}
      {tab === 'dept'     && <DeptTab user={user} />}
      {tab === 'company'  && <CompanyTab user={user} />}
      {tab === 'security' && <SecurityTab />}
    </div>
  );
}
