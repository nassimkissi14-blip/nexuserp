import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore, useModulesStore } from '../store/index.js';
import { modulesAPI } from '../api/client.js';
import toast from 'react-hot-toast';
import { ChevronUp, ChevronDown, Settings, X, Save } from 'lucide-react';

const ROLE_ORDER = { OPERATOR: 0, MANAGER: 1, DIRECTOR: 2, ADMIN: 3, SUPER_ADMIN: 4 };
const isAtLeast = (role, min) => (ROLE_ORDER[role] ?? 0) >= (ROLE_ORDER[min] ?? 0);

// '__all__' = voir tous les modules (pour les depts admin/transversaux)
const ALL_SLUGS = ['rh','crm','sales','purchases','stock','finance','projects','production','maintenance','logistics','communication'];

const DEPT_TO_SLUGS = {
  // RH
  'ressources humaines': ['rh'], 'rh': ['rh'], 'human resources': ['rh'],
  // CRM / Ventes / Commercial
  'crm': ['crm', 'sales'], 'ventes': ['sales', 'crm'], 'commercial': ['crm', 'sales'],
  'crm & ventes': ['crm', 'sales'], 'crm & commercial': ['crm', 'sales'],
  'commercial / crm': ['crm', 'sales'], 'crm & commercial': ['crm', 'sales'],
  // Achats / Stock / Logistique
  'achats': ['purchases'], 'stock': ['stock'], 'logistique': ['logistics', 'stock'],
  'stock / logistique': ['stock', 'logistics'], 'achats / stock': ['purchases', 'stock'],
  // Finance
  'finance': ['finance'], 'finance / comptabilite': ['finance'],
  'comptabilite': ['finance'], 'comptabilite': ['finance'],
  // Projets / Production / Maintenance
  'projets': ['projects'], 'projects': ['projects'],
  'production': ['production'], 'maintenance': ['maintenance'],
  // Communication
  'communication': ['communication'],
  // IT / Analytics
  'it': ['ai', 'analytics'], 'informatique': ['ai', 'analytics'],
  // Administration → accès à tous les modules opérationnels
  'administration': ALL_SLUGS, 'admin': ALL_SLUGS,
  'direction': ALL_SLUGS, 'direction generale': ALL_SLUGS,
};

const normDept = (d) => (d || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const MODULE_DESCRIPTIONS = {
  rh: 'Employés, congés, paie, recrutement', crm: 'Clients, pipeline commercial',
  sales: 'Commandes, factures, devis', purchases: 'Fournisseurs, bons de commande',
  stock: 'Produits, inventaire, mouvements', finance: 'Comptabilité, budget, trésorerie',
  projects: 'Projets, tâches, Gantt', production: 'Ordres de fabrication, nomenclatures',
  maintenance: 'Équipements, interventions, préventif', logistics: 'Expéditions, transporteurs, suivi',
  communication: 'Messagerie, annonces, calendrier', ai: 'Assistant NexusAI, analyses IA',
  analytics: 'Tableaux de bord BI, rapports',
};

/* ── Config fields per module ──────────────────────────────── */
const MODULE_CONFIGS = {
  rh: {
    title: 'Configuration — Ressources Humaines',
    fields: [
      { key: 'annualLeaveDays',    label: 'Jours de congé annuels',         type: 'number',  default: 30 },
      { key: 'workingDaysPerWeek', label: 'Jours travaillés / semaine',      type: 'number',  default: 5 },
      { key: 'probationMonths',    label: 'Période d\'essai (mois)',         type: 'number',  default: 3 },
      { key: 'overtimeRate',       label: 'Taux heures sup. (multiplicateur)', type: 'number', default: 1.5 },
    ],
  },
  crm: {
    title: 'Configuration — CRM',
    fields: [
      { key: 'followUpDays',      label: 'Délai relance automatique (jours)', type: 'number', default: 7 },
      { key: 'defaultCurrency',   label: 'Devise par défaut',                type: 'text',   default: 'DZD' },
    ],
  },
  sales: {
    title: 'Configuration — Ventes',
    fields: [
      { key: 'invoicePrefix',      label: 'Préfixe facture',                  type: 'text',   default: 'FAC-' },
      { key: 'quotePrefix',        label: 'Préfixe devis',                    type: 'text',   default: 'DEV-' },
      { key: 'orderPrefix',        label: 'Préfixe commande',                 type: 'text',   default: 'CMD-' },
      { key: 'defaultPaymentDays', label: 'Délai paiement par défaut (jours)', type: 'number', default: 30 },
      { key: 'defaultTaxRate',     label: 'TVA par défaut (%)',               type: 'number', default: 19 },
    ],
  },
  purchases: {
    title: 'Configuration — Achats',
    fields: [
      { key: 'poPrefix',           label: 'Préfixe bon de commande',          type: 'text',   default: 'PO-' },
      { key: 'defaultPaymentDays', label: 'Délai paiement fournisseur (jours)', type: 'number', default: 30 },
    ],
  },
  stock: {
    title: 'Configuration — Stock',
    fields: [
      { key: 'lowStockThreshold', label: 'Seuil alerte stock faible (unités)', type: 'number',  default: 10 },
      { key: 'autoReorder',       label: 'Réapprovisionnement automatique',   type: 'boolean', default: false },
    ],
  },
  finance: {
    title: 'Configuration — Finance',
    fields: [
      { key: 'fiscalYearStartMonth', label: 'Début exercice fiscal (mois, 1–12)', type: 'number', default: 1 },
      { key: 'defaultTaxRate',       label: 'TVA par défaut (%)',                type: 'number', default: 19 },
      { key: 'currency',             label: 'Devise',                            type: 'text',   default: 'DZD' },
    ],
  },
  projects: {
    title: 'Configuration — Projets',
    fields: [
      { key: 'workingHoursPerDay', label: 'Heures travaillées / jour', type: 'number', default: 8 },
      { key: 'defaultTaskStatus', label: 'Statut tâche par défaut',   type: 'select', default: 'TODO',
        options: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] },
    ],
  },
  production: {
    title: 'Configuration — Production',
    fields: [
      { key: 'mrpHorizonDays',  label: 'Horizon MRP (jours)',                       type: 'number',  default: 90 },
      { key: 'autoFirmOrders',  label: 'Fermeture automatique des ordres proposés', type: 'boolean', default: false },
      { key: 'defaultLeadTime', label: 'Délai de fabrication par défaut (jours)',   type: 'number',  default: 5 },
    ],
  },
  maintenance: {
    title: 'Configuration — Maintenance',
    fields: [
      { key: 'alertAdvanceDays',    label: 'Créer alerte X jours avant échéance', type: 'number',  default: 7 },
      { key: 'autoCreatePreventive', label: 'Créer automatiquement les demandes préventives', type: 'boolean', default: true },
    ],
  },
  logistics: {
    title: 'Configuration — Logistique',
    fields: [
      { key: 'defaultCarrier',        label: 'Transporteur par défaut',          type: 'text',   default: '' },
      { key: 'trackingUpdateMinutes', label: 'Fréquence mise à jour suivi (min)', type: 'number', default: 60 },
    ],
  },
  communication: {
    title: 'Configuration — Communication',
    fields: [
      { key: 'messageRetentionDays', label: 'Rétention messages (jours)',     type: 'number',  default: 365 },
      { key: 'emailNotifications',   label: 'Notifications par email',        type: 'boolean', default: true },
    ],
  },
};

/* ── Toggle ────────────────────────────────────────────────── */
function Toggle({ checked, onChange, size = 'md' }) {
  const w = size === 'sm' ? 32 : 42, h = size === 'sm' ? 18 : 24, t = size === 'sm' ? 14 : 18;
  return (
    <button onClick={onChange} style={{ width: w, height: h, borderRadius: h, padding: 3,
      background: checked ? '#6366f1' : '#1e293b', border: `1px solid ${checked ? '#4f46e5' : '#334155'}`,
      cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background .2s, border-color .2s',
      flexShrink: 0, outline: 'none' }}>
      <span style={{ width: t, height: t, borderRadius: '50%', background: 'white',
        boxShadow: checked ? '0 0 6px rgba(99,102,241,0.6)' : '0 1px 4px rgba(0,0,0,0.4)',
        transform: checked ? `translateX(${w - t - 6}px)` : 'translateX(0)',
        transition: 'transform .22s cubic-bezier(0.34,1.56,0.64,1)', display: 'block', flexShrink: 0 }} />
    </button>
  );
}

/* ── OrderBtn ──────────────────────────────────────────────── */
function OrderBtn({ onClick, disabled, children }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center',
      justifyContent: 'center', border: '1px solid var(--border)',
      background: disabled ? 'transparent' : 'rgba(255,255,255,0.04)',
      color: disabled ? 'var(--border)' : 'var(--text-muted)',
      cursor: disabled ? 'default' : 'pointer', transition: 'background .15s, color .15s' }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.color = '#818cf8'; } }}
      onMouseLeave={e => { e.currentTarget.style.background = disabled ? 'transparent' : 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = disabled ? 'var(--border)' : 'var(--text-muted)'; }}>
      {children}
    </button>
  );
}

/* ── ConfigModal ───────────────────────────────────────────── */
function ConfigModal({ mod, onClose }) {
  const cfg = MODULE_CONFIGS[mod.slug];
  const existing = mod.config || {};
  const [form, setForm] = useState(() => {
    const init = {};
    (cfg?.fields || []).forEach(f => { init[f.key] = existing[f.key] !== undefined ? existing[f.key] : f.default; });
    return init;
  });
  const [saving, setSaving] = useState(false);

  if (!cfg) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await modulesAPI.saveConfig(mod.id, form);
      toast.success('Configuration sauvegardée ✅');
      onClose(form);
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
        width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{mod.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{cfg.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Paramètres spécifiques au module</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          {cfg.fields.map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</label>

              {f.type === 'boolean' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Toggle checked={!!form[f.key]} onChange={() => setForm(p => ({ ...p, [f.key]: !p[f.key] }))} />
                  <span style={{ fontSize: 13, color: form[f.key] ? '#10b981' : 'var(--text-muted)' }}>
                    {form[f.key] ? 'Activé' : 'Désactivé'}
                  </span>
                </div>
              ) : f.type === 'select' ? (
                <select value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)',
                    fontSize: 13, outline: 'none' }}>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type} value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)',
                    fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)',
            fontSize: 13, cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px',
            background: '#6366f1', border: 'none', borderRadius: 8, color: 'white',
            fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={14} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function ModulesAdminPage() {
  const { user } = useAuthStore();
  const { modules, toggleModule, toggleSubmodule, reorderModules } = useModulesStore();
  const [searchParams] = useSearchParams();
  const slugParam = searchParams.get('slug');
  const [configMod, setConfigMod] = useState(null);
  const [localConfigs, setLocalConfigs] = useState({});

  if (!isAtLeast(user?.role, 'MANAGER')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12, color: 'var(--text-muted)' }}>
        <Settings size={40} style={{ opacity: 0.4 }} />
        <div style={{ fontSize: 15, fontWeight: 600 }}>Accès réservé aux managers et supérieurs</div>
      </div>
    );
  }

  const isAdmin = isAtLeast(user?.role, 'DIRECTOR');
  const dept    = normDept(user?.department);
  // null = admin/director (sees all); array = manager (sees only their slugs)
  const mySlugs = isAdmin ? null : (DEPT_TO_SLUGS[dept] ?? ['communication']);

  const visible = [...modules]
    .filter(m => m.slug !== 'admin')
    .filter(m => {
      if (slugParam) return m.slug === slugParam; // filtre URL en priorité (même pour admin)
      if (mySlugs === null) return true;          // admin/director sans filtre: tout voir
      return mySlugs.includes(m.slug);            // manager: seulement ses modules
    })
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));

  const enabled  = visible.filter(m => m.enabled).length;
  const disabled = visible.filter(m => !m.enabled).length;

  const handleToggleModule = async (mod) => {
    const result = await toggleModule(mod.id);
    if (result?.success) toast.success(`"${mod.name}" ${mod.enabled ? 'désactivé 🔴' : 'activé ✅'}`);
    else toast.error('Erreur lors de la modification');
  };

  const handleToggleSub = async (sub) => {
    const result = await toggleSubmodule(sub.id);
    if (result?.success) toast.success(`"${sub.name}" ${sub.enabled ? 'désactivé' : 'activé'}`);
    else toast.error('Accès refusé ou erreur');
  };

  const handleMove = (slug, dir) => {
    const idx = visible.findIndex(m => m.slug === slug);
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= visible.length) return;
    const swapped = [...visible];
    [swapped[idx], swapped[newIdx]] = [swapped[newIdx], swapped[idx]];
    reorderModules(swapped.map((m, i) => ({ id: m.id, sortOrder: i })));
  };

  const pageTitle = !isAdmin && mySlugs
    ? `⚙️ Configuration — ${visible[0]?.name || 'Mon module'}`
    : '⚙️ Gestion des modules';

  const pageDesc = !isAdmin
    ? 'Activez ou désactivez les fonctionnalités de votre module'
    : 'Activez/désactivez les modules et sous-modules · Configurez les paramètres de chaque module';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{pageTitle}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>{pageDesc}</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: '#10b981', fontWeight: 600 }}>
              ✅ {enabled} actifs
            </div>
            <div style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
              🔴 {disabled} désactivés
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 10, fontSize: 12.5, color: '#a5b4fc', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>💡</span>
        {isAdmin
          ? <>Les changements sont <strong>instantanés</strong> — cliquez sur <strong>⚙️ Configurer</strong> pour les paramètres spécifiques d'un module.</>
          : <>Vous pouvez activer ou désactiver les fonctionnalités de votre module. Les changements sont <strong>immédiats</strong>.</>
        }
      </div>

      {visible.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <Settings size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 14 }}>Aucun module à configurer pour votre département.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map((mod, idx) => {
          const isFirst = idx === 0;
          const isLast  = idx === visible.length - 1;
          const activeSubs = (mod.subModules || []).filter(s => s.enabled).length;
          const totalSubs  = (mod.subModules || []).length;
          const hasConfig  = !!MODULE_CONFIGS[mod.slug];
          const savedConfig = localConfigs[mod.id] || mod.config;
          const configCount = savedConfig ? Object.keys(savedConfig).length : 0;

          return (
            <div key={mod.id} style={{
              background: 'var(--bg-card)',
              border: `1px solid ${mod.enabled ? 'var(--border)' : 'rgba(100,116,139,0.2)'}`,
              borderLeft: `3px solid ${mod.enabled ? '#6366f1' : '#334155'}`,
              borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              opacity: mod.enabled ? 1 : 0.65, transition: 'opacity .2s, border-color .2s',
            }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>

                {isAdmin && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                    <OrderBtn onClick={() => handleMove(mod.slug, 'up')} disabled={isFirst}><ChevronUp size={13} /></OrderBtn>
                    <OrderBtn onClick={() => handleMove(mod.slug, 'down')} disabled={isLast}><ChevronDown size={13} /></OrderBtn>
                  </div>
                )}

                {isAdmin && (
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(99,102,241,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                )}

                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {mod.icon}
                </div>

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

                {/* Configure button */}
                {hasConfig && (
                  <button onClick={() => setConfigMod(mod)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
                      background: configCount > 0 ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${configCount > 0 ? 'rgba(99,102,241,0.35)' : 'var(--border)'}`,
                      borderRadius: 7, color: configCount > 0 ? '#818cf8' : 'var(--text-muted)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                      transition: 'background .15s, color .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.18)'; e.currentTarget.style.color = '#818cf8'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = configCount > 0 ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = configCount > 0 ? '#818cf8' : 'var(--text-muted)'; }}>
                    <Settings size={12} />
                    Configurer
                  </button>
                )}

                <div style={{ fontSize: 11, fontWeight: 600, color: mod.enabled ? '#10b981' : '#64748b',
                  background: mod.enabled ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                  border: `1px solid ${mod.enabled ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}`,
                  borderRadius: 6, padding: '3px 9px', flexShrink: 0 }}>
                  {mod.enabled ? 'Actif' : 'Désactivé'}
                </div>

                {isAdmin && <Toggle checked={mod.enabled} onChange={() => handleToggleModule(mod)} />}
              </div>

              {mod.enabled && (mod.subModules || []).length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px 18px 14px 18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8 }}>
                    Sous-modules
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
                    {(mod.subModules || []).map((sub) => (
                      <div key={sub.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                        borderRadius: 7, border: `1px solid ${sub.enabled ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)'}`,
                        opacity: sub.enabled ? 1 : 0.55, transition: 'opacity .15s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sub.enabled ? '#10b981' : '#475569', flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, color: sub.enabled ? 'var(--text-secondary)' : 'var(--text-muted)', fontWeight: 500 }}>{sub.name}</span>
                        </div>
                        <Toggle checked={sub.enabled} onChange={() => handleToggleSub(sub)} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {configMod && (
        <ConfigModal
          mod={configMod}
          onClose={(savedData) => {
            if (savedData) setLocalConfigs(p => ({ ...p, [configMod.id]: savedData }));
            setConfigMod(null);
          }}
        />
      )}
    </div>
  );
}
