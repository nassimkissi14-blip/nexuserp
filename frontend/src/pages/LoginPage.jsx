import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Clock, Mail, Sun, Moon } from 'lucide-react';
import { useAuthStore, useThemeStore } from '../store/index.js';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [pending, setPending]   = useState(false);
  const { login, isLoading }    = useAuthStore();
  const { theme, toggleTheme }  = useThemeStore();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPending(false);
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else if (result.error === 'COMPTE_EN_ATTENTE') {
      setPending(true);
    } else {
      setError(result.error || 'Erreur de connexion');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', position: 'relative' }}>

      {/* Theme toggle button */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        style={{
          position: 'fixed', top: 20, right: 20,
          width: 42, height: 42, borderRadius: '50%',
          border: '1px solid var(--border-light)',
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)',
          transition: 'var(--transition)',
          zIndex: 1000,
        }}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px', width: '100%', maxWidth: '420px' }}>

        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--accent-primary)' }}>NexusERP</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>Connectez-vous à votre espace</p>

        {/* Pending approval banner */}
        {pending && (
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.35)',
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={18} color="#f59e0b" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>Compte en attente d'approbation</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>Votre demande est en cours de traitement</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              L'équipe RH examinera votre demande et vous recevrez un <strong>email de confirmation</strong> dès qu'elle sera traitée.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
              <Mail size={13} />
              <span>Notification envoyée à <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong></span>
            </div>
          </div>
        )}

        {/* Generic error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-danger)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--accent-danger)', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Email</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setPending(false); }} required placeholder="ex: khalid.mekamcha@promedal.dz" />
          </div>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isLoading}>
            {isLoading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
          Pas de compte ? <Link to="/register" style={{ color: 'var(--accent-primary)' }}>S'inscrire</Link>
        </p>
      </div>
    </div>
  );
}