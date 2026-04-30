import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '../../api/client.js';
import { useAuthStore } from '../../store/index.js';
import { Save, User, Building2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['Direction', 'Ressources Humaines', 'Finance', 'CRM & Ventes', 'Production', 'Logistique', 'IT', 'Maintenance', 'Administration'];

const Section = ({ title, icon, children }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>
      <h3 style={{ fontWeight: 600, fontSize: 15 }}>{title}</h3>
    </div>
    <div style={{ padding: 20 }}>{children}</div>
  </div>
);

export default function SettingsPage() {
  const { user, fetchMe } = useAuthStore();

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    department: user?.department || DEPARTMENTS[0],
  });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const setP = (k, v) => setProfile(f => ({ ...f, [k]: v }));
  const setPw = (k, v) => setPwd(f => ({ ...f, [k]: v }));

  const profileMutation = useMutation({
    mutationFn: (data) => apiClient.patch('/users/me', data),
    onSuccess: async () => { await fetchMe(); toast.success('✅ Profil mis à jour'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const pwdMutation = useMutation({
    mutationFn: (data) => apiClient.patch('/users/me', data),
    onSuccess: () => { setPwd({ currentPassword: '', newPassword: '', confirm: '' }); toast.success('✅ Mot de passe changé'); },
    onError: (err) => toast.error(err.message || 'Erreur'),
  });

  const handleProfileSave = (e) => {
    e.preventDefault();
    profileMutation.mutate(profile);
  };

  const handlePwdSave = (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirm) return toast.error('Les mots de passe ne correspondent pas');
    if (pwd.newPassword.length < 6) return toast.error('Mot de passe trop court (min. 6 caractères)');
    pwdMutation.mutate({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
  };

  const ROLE_LABEL = { SUPER_ADMIN: 'Super Administrateur', ADMIN: 'Administrateur', DIRECTOR: 'Directeur', MANAGER: 'Manager', OPERATOR: 'Opérateur' };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Paramètres</h1>
          <p className="page-subtitle">Gérez votre profil et vos préférences</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* PROFIL */}
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

          <form onSubmit={handleProfileSave}>
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
            <button type="submit" className="btn btn--primary" style={{ width: '100%' }} disabled={profileMutation.isPending}>
              <Save size={14} /> {profileMutation.isPending ? 'Enregistrement…' : 'Enregistrer le profil'}
            </button>
          </form>
        </Section>

        {/* MOT DE PASSE */}
        <Section title="Changer le mot de passe" icon={<Lock size={16} />}>
          <form onSubmit={handlePwdSave}>
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
                <label>Confirmer le mot de passe *</label>
                <input type="password" value={pwd.confirm} onChange={e => setPw('confirm', e.target.value)} required />
                {pwd.confirm && pwd.newPassword !== pwd.confirm && (
                  <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Les mots de passe ne correspondent pas</div>
                )}
              </div>
            </div>
            <button type="submit" className="btn btn--primary" style={{ width: '100%' }} disabled={pwdMutation.isPending || pwd.newPassword !== pwd.confirm}>
              <Lock size={14} /> {pwdMutation.isPending ? 'Mise à jour…' : 'Changer le mot de passe'}
            </button>
          </form>
        </Section>

        {/* INFOS ENTREPRISE */}
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

        {/* RACCOURCIS CLAVIER */}
        <Section title="Raccourcis clavier" icon="⌨️">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Alt + D', 'Dashboard'],
              ['Alt + E', 'Employés'],
              ['Alt + C', 'Clients CRM'],
              ['Alt + O', 'Commandes'],
              ['Alt + P', 'Produits'],
              ['Alt + M', 'Messagerie'],
              ['Alt + A', 'NexusAI'],
            ].map(([key, action]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{action}</span>
                <kbd style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: 600 }}>{key}</kbd>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  );
}
