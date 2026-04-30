import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import { useModulesConfigStore } from '../store/modulesConfig.js';
import toast from 'react-hot-toast';
import { ChevronUp, ChevronDown, RotateCcw, GripVertical } from 'lucide-react';

const MODULE_DESCRIPTIONS = {
  rh:            'Employés, congés, paie, recrutement',
  crm:           'Clients, pipeline commercial',
  sales:         'Commandes, factures, devis',
  purchases:     'Fournisseurs, bons de commande',
  stock:         'Produits, inventaire, mouvements',
  finance:       'Comptabilité, budget, trésorerie',
  projects:      'Projets, tâches, Gantt',
  production:    'Ordres de fabrication, nomenclatures',
  maintenance:   'Équipements, interventions, préventif',
  logistics:     'Expéditions, transporteurs, suivi',
  communication: 'Messagerie, annonces, calendrier',
  ai:            'Assistant NexusAI, analyses IA',
  analytics:     'Tableaux de bord BI, rapports',
};

/* ── Toggle switch ─────────────────────────────────────────────── */
function Toggle({ checked, onChange, size = 'md' }) {
  const w = size === 'sm' ? 32 : 42;
  const h = size === 'sm' ? 18 : 24;
  const t = size === 'sm' ? 14 : 18;
  return (
    <button
      onClick={onChange}
      style={{
        width: w, height: h, borderRadius: h, padding: 3,
        background: checked ? '#6366f1' : '#1e293b',
        border: `1px solid ${checked ? '#4f46e5' : '#334155'}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        transition: 'background .2s, border-color .2s',
        flexShrink: 0, outline: 'none',
      }}
    >
      <span style={{
        width: t, height: t, borderRadius: '50%', background: 'white',
        boxShadow: checked ? '0 0 6px rgba(99,102,241,0.6)' : '0 1px 4px rgba(0,0,0,0.4)',
        transform: checked ? `translateX(${w - t - 6}px)` : 'translateX(0)',
        transition: 'transform .22s cubic-bezier(0.34,1.56,0.64,1)',
        display: 'block', flexShrink: 0,
      }} />
    </button>
  );
}

/* ── Order button ──────────────────────────────────────────────── */
function OrderBtn({ onClick, disabled, children }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center',
        justifyContent: 'center', border: '1px solid var(--border)',
        background: disabled ? 'transparent' : 'rgba(255,255,255,0.04)',
        color: disabled ? 'var(--border)' : 'var(--text-muted)',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background .15s, color .15s',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.color = '#818cf8'; }}
      onMouseLeave={e => { e.currentTarget.style.background = disabled ? 'transparent' : 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = disabled ? 'var(--border)' : 'var(--text-muted)'; }}
    >
      {children}
    </button>
  );
}

export default function ModulesAdminPage() {
  const { user } = useAuthStore();
  const { modules, toggleModule, toggleSubModule, moveModule, reset } = useModulesConfigStore();

  if (!['ADMIN', 'SUPER_ADMIN', 'DIRECTOR'].includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const sorted  = [...modules].sort((a, b) => a.order - b.order);
  const visible = sorted.filter(m => m.slug !== 'admin');
  const enabled  = visible.filter(m => m.enabled).length;
  const disabled = visible.filter(m => !m.enabled).length;

  const handleToggleModule = (mod) => {
    toggleModule(mod.slug);
    toast.success(`"${mod.name}" ${mod.enabled ? 'désactivé 🔴' : 'activé ✅'}`);
  };

  const handleToggleSub = (mod, sub) => {
    toggleSubModule(mod.slug, sub.key);
    toast.success(`"${sub.name}" ${sub.enabled ? 'désactivé' : 'activé'}`);
  };

  const handleMove = (slug, dir) => {
    moveModule(slug, dir);
  };

  const handleReset = () => {
    if (window.confirm('Remettre la configuration par défaut ?')) {
      reset();
      toast.success('Configuration réinitialisée');
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            ⚙️ Gestion des modules
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Activez/désactivez les modules et sous-modules · Réordonnez les départements dans la sidebar
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: '#10b981', fontWeight: 600 }}>
            ✅ {enabled} actifs
          </div>
          <div style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
            🔴 {disabled} désactivés
          </div>
          <button
            onClick={handleReset}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <RotateCcw size={12} /> Réinitialiser
          </button>
        </div>
      </div>

      {/* ── Info banner ──────────────────────────────────────────── */}
      <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 10, fontSize: 12.5, color: '#a5b4fc', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>💡</span>
        Les changements sont <strong>instantanés</strong> — la sidebar se met à jour en temps réel. Les données sont sauvegardées dans le navigateur.
      </div>

      {/* ── Module list ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map((mod, idx) => {
          const isFirst = idx === 0;
          const isLast  = idx === visible.length - 1;
          const activeSubs   = mod.subModules.filter(s => s.enabled).length;
          const totalSubs    = mod.subModules.length;

          return (
            <div key={mod.slug} style={{
              background: 'var(--bg-card)',
              border: `1px solid ${mod.enabled ? 'var(--border)' : 'rgba(100,116,139,0.2)'}`,
              borderLeft: `3px solid ${mod.enabled ? '#6366f1' : '#334155'}`,
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              opacity: mod.enabled ? 1 : 0.65,
              transition: 'opacity .2s, border-color .2s',
            }}>

              {/* Module row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>

                {/* Order controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <OrderBtn onClick={() => handleMove(mod.slug, 'up')} disabled={isFirst}>
                    <ChevronUp size={13} />
                  </OrderBtn>
                  <OrderBtn onClick={() => handleMove(mod.slug, 'down')} disabled={isLast}>
                    <ChevronDown size={13} />
                  </OrderBtn>
                </div>

                {/* Position badge */}
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>
                  {idx + 1}
                </div>

                {/* Icon */}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {mod.icon}
                </div>

                {/* Name + desc */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{mod.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                    {MODULE_DESCRIPTIONS[mod.slug] || ''}
                    {mod.enabled && (
                      <span style={{ marginLeft: 8, color: activeSubs === totalSubs ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                        · {activeSubs}/{totalSubs} sous-modules actifs
                      </span>
                    )}
                  </div>
                </div>

                {/* Status label */}
                <div style={{ fontSize: 11, fontWeight: 600, color: mod.enabled ? '#10b981' : '#64748b', background: mod.enabled ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', border: `1px solid ${mod.enabled ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}`, borderRadius: 6, padding: '3px 9px', flexShrink: 0 }}>
                  {mod.enabled ? 'Actif' : 'Désactivé'}
                </div>

                {/* Toggle */}
                <Toggle
                  checked={mod.enabled}
                  onChange={() => handleToggleModule(mod)}
                />
              </div>

              {/* Sub-modules (only shown if module is enabled) */}
              {mod.enabled && mod.subModules.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 18px 14px 18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8 }}>
                    Sous-modules
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
                    {mod.subModules.map((sub) => (
                      <div key={sub.key} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                        borderRadius: 7, border: `1px solid ${sub.enabled ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)'}`,
                        opacity: sub.enabled ? 1 : 0.55, transition: 'opacity .15s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sub.enabled ? '#10b981' : '#475569', flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, color: sub.enabled ? 'var(--text-secondary)' : 'var(--text-muted)', fontWeight: 500 }}>{sub.name}</span>
                        </div>
                        <Toggle
                          checked={sub.enabled}
                          onChange={() => handleToggleSub(mod, sub)}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
