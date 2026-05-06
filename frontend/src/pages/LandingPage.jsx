import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/index.js';

const MODULES = [
  { icon: '👥', label: 'Ressources Humaines', desc: 'Employés, congés, paie, recrutement, évaluations' },
  { icon: '📈', label: 'CRM & Ventes', desc: 'Clients, pipeline, devis, commandes, factures' },
  { icon: '📦', label: 'Stock & Logistique', desc: 'Produits, mouvements, inventaire, alertes' },
  { icon: '💰', label: 'Finance', desc: 'Comptabilité, budget, trésorerie, rapports' },
  { icon: '🏭', label: 'Production', desc: 'Ordres de fabrication, BOM, centres de travail' },
  { icon: '🔧', label: 'Maintenance', desc: 'Équipements, interventions correctives et préventives' },
  { icon: '🗂️', label: 'Projets', desc: 'Suivi projets, tâches, Gantt, ressources' },
  { icon: '🤖', label: 'Intelligence Artificielle', desc: 'Assistant IA, analytics prédictifs, rapports auto' },
];

const STATS = [
  { value: '25+', label: 'Modules intégrés' },
  { value: '100%', label: 'Multi-tenant' },
  { value: 'Temps réel', label: 'Socket.IO live' },
  { value: 'DZD', label: 'Locale algérienne' },
];

export default function LandingPage() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>

      {/* ── Navbar ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 48px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(12px)',
        background: isDark ? 'rgba(4,6,15,0.92)' : 'rgba(248,250,252,0.92)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff' }}>N</div>
          <span style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg,#818cf8,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NexusERP</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Mode clair' : 'Mode sombre'}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              border: '1px solid var(--border-light)',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'var(--transition)',
            }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <Link to="/login" style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border-light)', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            Connexion
          </Link>
          <Link to="/register" style={{ padding: '8px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600, boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}>
            Démarrer gratuitement
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ textAlign: 'center', padding: '100px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', fontSize: 12, color: '#a5b4fc', marginBottom: 28, fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          Plateforme ERP nouvelle génération
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24, background: 'linear-gradient(135deg, var(--text-primary) 0%, #a5b4fc 50%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Gérez toute votre<br />entreprise en un seul endroit
        </h1>

        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto 44px', lineHeight: 1.7 }}>
          NexusERP centralise RH, Ventes, Stock, Finance, Production et Maintenance dans une plateforme temps réel, multi-tenant, conçue pour les entreprises algériennes.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" style={{ padding: '14px 36px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 700, boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}>
            Créer un compte gratuit →
          </Link>
          <Link to="/login" style={{ padding: '14px 36px', borderRadius: 10, border: '1px solid var(--border-light)', color: 'var(--text-primary)', textDecoration: 'none', fontSize: 15, fontWeight: 600, background: 'var(--bg-card)' }}>
            Se connecter
          </Link>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ padding: '28px 24px', textAlign: 'center', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 28, fontWeight: 900, background: 'linear-gradient(135deg,#818cf8,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Modules grid ── */}
      <section style={{ padding: '80px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>Tous vos métiers,<span style={{ color: '#8b5cf6' }}> une seule plateforme</span></h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Chaque module est activable selon le profil de votre entreprise</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {MODULES.map((m, i) => (
            <div key={i}
              style={{ padding: '24px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', transition: 'border-color .2s, box-shadow .2s', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{m.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{m.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '60px 48px', background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
          {[
            { icon: '⚡', title: 'Temps réel', desc: 'Socket.IO pour les notifications, la messagerie et la synchronisation entre utilisateurs.' },
            { icon: '🏢', title: 'Multi-tenant', desc: 'Chaque entreprise dispose de son propre espace isolé avec ses modules activés.' },
            { icon: '🤖', title: 'IA intégrée', desc: 'Assistant IA, analytics prédictifs et rapports générés automatiquement.' },
            { icon: '📱', title: 'QR Codes', desc: 'Génération de QR codes par département pour la traçabilité et le pointage.' },
            { icon: '🔐', title: 'RBAC avancé', desc: 'Rôles OPERATOR → MANAGER → DIRECTOR → ADMIN → SUPER_ADMIN avec guards par route.' },
            { icon: '🏭', title: 'Simulation industrielle', desc: 'Connexion temps réel avec Arena (Rockwell) et Plant Simulation (Siemens).' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)' }}>Prêt à digitaliser votre entreprise ?</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 36 }}>Créez votre compte gratuitement et accédez à tous les modules en quelques minutes.</p>
        <Link to="/register" style={{ padding: '16px 48px', borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 700, boxShadow: '0 0 40px rgba(99,102,241,0.4)', display: 'inline-block' }}>
          Commencer maintenant — C'est gratuit
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>NexusERP</span>
        <span>Plateforme ERP — Algérie 🇩🇿</span>
      </footer>
    </div>
  );
}
