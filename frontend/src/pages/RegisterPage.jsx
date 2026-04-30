import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/index.js';

const DEPARTMENTS = [
  { value: 'direction',    label: '🏢  Direction Générale',      desc: 'Accès complet à tous les modules' },
  { value: 'rh',           label: '👥  Ressources Humaines',     desc: 'Employés, congés, paie, recrutement' },
  { value: 'commercial',   label: '📈  Commercial / CRM',        desc: 'Clients, ventes, devis, commandes' },
  { value: 'finance',      label: '💰  Finance / Comptabilité',  desc: 'Factures, budget, trésorerie' },
  { value: 'production',   label: '🏭  Production',              desc: 'Ordres de production, BOM, ateliers' },
  { value: 'maintenance',  label: '🔧  Maintenance',             desc: 'Équipements, interventions, préventif' },
  { value: 'stock',        label: '📦  Stock / Logistique',      desc: 'Produits, mouvements, inventaire' },
  { value: 'achats',       label: '🛒  Achats',                  desc: 'Fournisseurs, commandes achat' },
  { value: 'projets',      label: '🗂️  Projets',                 desc: 'Projets, tâches, planning, ressources' },
  { value: 'it',           label: '⚙️  Informatique / Admin',   desc: 'Administration, utilisateurs, paramètres' },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1); // 1 = infos, 2 = département
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    confirmPassword: '', companyName: '', department: '',
  });
  const [error, setError]         = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const nextStep = (e) => {
    e.preventDefault();
    setError('');
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.companyName) {
      setError('Tous les champs sont obligatoires');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setStep(2);
  };

  const [pendingMsg, setPendingMsg] = useState('');

  const handleSubmit = async (dept) => {
    if (!dept) return;
    setError('');
    const payload = { ...form, department: dept };

    const result = await register(payload);
    if (!result.success) {
      setError(result.error || 'Erreur lors de l\'inscription');
      setStep(1);
      return;
    }

    // If pending approval, show message instead of auto-login
    if (result.pending) {
      setPendingMsg(result.message || 'Votre demande a été envoyée à l\'équipe RH.');
      return;
    }

    const loginResult = await login(form.email, form.password);
    navigate(loginResult.success ? '/dashboard' : '/login');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-primary)', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: 40,
        width: '100%', maxWidth: step === 2 ? 560 : 480,
        transition: 'max-width .3s',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 4 }}>NexusERP</h1>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
            {step === 1 ? 'Créer votre compte' : 'Votre département'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {step === 1
              ? 'Renseignez vos informations personnelles'
              : 'Choisissez votre département — vos modules seront activés automatiquement'}
          </p>
          {/* Steps indicator */}
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {[1,2].map(s => (
              <div key={s} style={{ height: 3, flex: 1, borderRadius: 2, background: s <= step ? 'var(--accent-primary)' : 'var(--border)', transition: 'background .3s' }} />
            ))}
          </div>
        </div>

        {pendingMsg ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>Demande envoyée !</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>{pendingMsg}</p>
            <Link to="/login" className="btn btn--primary" style={{ textDecoration: 'none' }}>Aller à la connexion</Link>
          </div>
        ) : null}

        {!pendingMsg && error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius)', padding: '10px 14px', color: '#ef4444', marginBottom: 16, fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── STEP 1 : informations ── */}
        {!pendingMsg && step === 1 && (
          <form onSubmit={nextStep}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label>Prénom *</label>
                <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Ahmed" required />
              </div>
              <div className="form-group">
                <label>Nom *</label>
                <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Benali" required />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ahmed@monentreprise.dz" required />
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Nom de l'entreprise *</label>
              <input
                value={form.companyName}
                onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                placeholder="Ex: Promedal SARL"
                required
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Si l'entreprise existe déjà, votre compte sera soumis à l'approbation RH.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div className="form-group">
                <label>Mot de passe *</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 caractères" required style={{ paddingRight: 38 }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirmer *</label>
                <div style={{ position: 'relative' }}>
                  <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Répéter" required style={{ paddingRight: 38 }} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn--primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}>
              Suivant →
            </button>
          </form>
        )}

        {/* ── STEP 2 : département ── */}
        {!pendingMsg && step === 2 && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEPARTMENTS.map(dept => (
                <button
                  key={dept.value}
                  onClick={() => handleSubmit(dept.value)}
                  disabled={isLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', textAlign: 'left',
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', cursor: 'pointer',
                    transition: 'border-color .15s, background .15s',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-primary)'; }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{dept.label.split('  ')[0]}</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {dept.label.split('  ')[1]}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{dept.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={() => setStep(1)} style={{ marginTop: 14, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
              ← Retour
            </button>
          </div>
        )}

        {!pendingMsg && (
          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: 13 }}>
            Déjà un compte ?{' '}
            <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Se connecter</Link>
          </p>
        )}
      </div>
    </div>
  );
}
