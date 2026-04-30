import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, Hash, Zap, Clock, X } from 'lucide-react';

const ALL_PAGES = [
  // Dashboard
  { label: 'Tableau de bord', route: '/dashboard', icon: '📊', section: 'Core', keywords: 'dashboard accueil home kpi' },
  // AI
  { label: 'Assistant IA', route: '/ai/assistant', icon: '🤖', section: 'Intelligence', keywords: 'ai intelligence assistant chatbot' },
  { label: 'Analytiques IA', route: '/ai/analytics', icon: '🧠', section: 'Intelligence', keywords: 'ai analytics prediction' },
  { label: 'Rapports IA', route: '/ai/reports', icon: '📈', section: 'Intelligence', keywords: 'ai reports rapports' },
  // RH
  { label: 'Employés', route: '/rh/employees', icon: '👤', section: 'RH', keywords: 'employes employees rh ressources humaines staff' },
  { label: 'Congés', route: '/rh/leaves', icon: '🏖️', section: 'RH', keywords: 'conges leaves vacances absences' },
  { label: 'Paie', route: '/rh/payroll', icon: '💰', section: 'RH', keywords: 'paie payroll salaires salaries' },
  { label: 'Recrutement', route: '/rh/recrutement', icon: '🔍', section: 'RH', keywords: 'recrutement recruitment candidats hiring' },
  { label: 'Notes de frais', route: '/rh/expenses', icon: '🧾', section: 'RH', keywords: 'frais expenses notes depenses' },
  { label: 'Évaluations', route: '/rh/evaluations', icon: '⭐', section: 'RH', keywords: 'evaluations performance notes' },
  // CRM
  { label: 'Clients', route: '/crm/clients', icon: '🤝', section: 'CRM', keywords: 'clients customers crm relation' },
  { label: 'Pipeline Commercial', route: '/crm/pipeline', icon: '🔄', section: 'CRM', keywords: 'pipeline commercial ventes deals' },
  // Ventes
  { label: 'Commandes', route: '/sales/orders', icon: '📦', section: 'Ventes', keywords: 'commandes orders ventes sales' },
  { label: 'Devis', route: '/sales/quotes', icon: '📝', section: 'Ventes', keywords: 'devis quotes propositions' },
  { label: 'Factures', route: '/finance/invoices', icon: '🧾', section: 'Ventes', keywords: 'factures invoices paiements' },
  { label: 'Avoirs', route: '/sales/credits', icon: '↩️', section: 'Ventes', keywords: 'avoirs credits remboursements' },
  // Achats
  { label: 'Fournisseurs', route: '/purchases/suppliers', icon: '🏭', section: 'Achats', keywords: 'fournisseurs suppliers achats procurement' },
  { label: 'Bons de commande', route: '/purchases/orders', icon: '📋', section: 'Achats', keywords: 'bons commandes achats purchase orders' },
  // Stock
  { label: 'Produits', route: '/stock/products', icon: '📦', section: 'Stock', keywords: 'produits products articles stock inventaire' },
  { label: 'Mouvements Stock', route: '/stock/movements', icon: '↕️', section: 'Stock', keywords: 'mouvements movements stock' },
  { label: 'Inventaire', route: '/stock/inventory', icon: '📋', section: 'Stock', keywords: 'inventaire inventory comptage' },
  { label: 'Alertes Stock', route: '/stock/alerts', icon: '⚠️', section: 'Stock', keywords: 'alertes alerts stock rupture' },
  // Finance
  { label: 'Comptabilité', route: '/finance/accounting', icon: '📒', section: 'Finance', keywords: 'comptabilite accounting finance comptes' },
  { label: 'Budget', route: '/finance/budget', icon: '💹', section: 'Finance', keywords: 'budget finance previsions' },
  { label: 'Trésorerie', route: '/finance/treasury', icon: '🏦', section: 'Finance', keywords: 'tresorerie treasury cash banque' },
  // Projets
  { label: 'Projets', route: '/projects/list', icon: '🎯', section: 'Projets', keywords: 'projets projects liste' },
  { label: 'Tâches', route: '/projects/tasks', icon: '✅', section: 'Projets', keywords: 'taches tasks todo' },
  { label: 'Gantt', route: '/projects/gantt', icon: '📅', section: 'Projets', keywords: 'gantt planning calendrier' },
  { label: 'Ressources', route: '/projects/resources', icon: '👥', section: 'Projets', keywords: 'ressources resources équipe' },
  // Production
  { label: 'Ordres de Fabrication', route: '/production/orders', icon: '🏗️', section: 'Production', keywords: 'production fabrication manufacturing orders' },
  { label: 'Nomenclatures BOM', route: '/production/bom', icon: '🔩', section: 'Production', keywords: 'bom nomenclatures composants' },
  { label: 'Centres de charge', route: '/production/workcenters', icon: '⚙️', section: 'Production', keywords: 'centres charge work centers machines' },
  // Maintenance
  { label: 'Équipements', route: '/maintenance/equipment', icon: '🔧', section: 'Maintenance', keywords: 'equipements equipment maintenance machines' },
  { label: 'Interventions', route: '/maintenance/interventions', icon: '🛠️', section: 'Maintenance', keywords: 'interventions work orders maintenance' },
  { label: 'Préventive', route: '/maintenance/preventive', icon: '🔒', section: 'Maintenance', keywords: 'preventive schedule maintenance preventif' },
  // Logistique
  { label: 'Expéditions', route: '/logistics/shipments', icon: '🚚', section: 'Logistique', keywords: 'expeditions shipments logistique livraisons' },
  { label: 'Transporteurs', route: '/logistics/carriers', icon: '🚛', section: 'Logistique', keywords: 'transporteurs carriers logistique' },
  { label: 'Suivi', route: '/logistics/tracking', icon: '📍', section: 'Logistique', keywords: 'suivi tracking tracking logistique' },
  // Communication
  { label: 'Messagerie', route: '/communication/messaging', icon: '💬', section: 'Communication', keywords: 'messagerie messaging chat messages' },
  { label: 'Annonces', route: '/communication/announcements', icon: '📢', section: 'Communication', keywords: 'annonces announcements communication' },
  { label: 'Calendrier', route: '/calendar', icon: '📅', section: 'Communication', keywords: 'calendrier calendar events réunions' },
  // Analytics
  { label: 'Tableaux de bord BI', route: '/analytics/dashboards', icon: '📊', section: 'Analytics', keywords: 'bi dashboards analytics tableaux bord' },
  { label: 'Rapports personnalisés', route: '/analytics/reports', icon: '📈', section: 'Analytics', keywords: 'rapports reports analytics custom' },
  // Admin
  { label: 'Modules', route: '/admin/modules', icon: '🧩', section: 'Admin', keywords: 'modules admin configuration' },
  { label: 'Utilisateurs', route: '/admin/users', icon: '👤', section: 'Admin', keywords: 'utilisateurs users admin gestion' },
  { label: 'Paramètres', route: '/admin/settings', icon: '⚙️', section: 'Admin', keywords: 'parametres settings configuration' },
  { label: 'Logs d\'activité', route: '/admin/logs', icon: '📋', section: 'Admin', keywords: 'logs activite audit trail' },
];

const QUICK_ACTIONS = [
  { label: 'Nouvelle facture',    route: '/finance/invoices',  icon: '🧾', action: true },
  { label: 'Nouveau client',      route: '/crm/clients',       icon: '🤝', action: true },
  { label: 'Nouvelle commande',   route: '/sales/orders',      icon: '📦', action: true },
  { label: 'Nouveau devis',       route: '/sales/quotes',      icon: '📝', action: true },
  { label: 'Nouvel employé',      route: '/rh/employees',      icon: '👤', action: true },
  { label: 'Nouveau projet',      route: '/projects/list',     icon: '🎯', action: true },
];

function fuzzyScore(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return q.length / t.length + 1;
  let score = 0, qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) { score += 1; qi++; }
  }
  return qi === q.length ? score / t.length : 0;
}

function search(query) {
  if (!query.trim()) return { actions: QUICK_ACTIONS, pages: [] };
  const q = query.toLowerCase();
  const scored = ALL_PAGES.map(p => ({
    ...p,
    score: Math.max(
      fuzzyScore(p.label, query),
      fuzzyScore(p.keywords, query),
      fuzzyScore(p.section, query),
    ),
  }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  return { actions: [], pages: scored };
}

const LS_KEY = 'nexus_palette_recent';
function getRecent() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function addRecent(item) {
  const prev = getRecent().filter(r => r.route !== item.route);
  localStorage.setItem(LS_KEY, JSON.stringify([item, ...prev].slice(0, 5)));
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const results = search(query);
  const items = query.trim()
    ? results.pages
    : [...QUICK_ACTIONS, ...getRecent().map(r => ({ ...r, isRecent: true }))];

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const go = useCallback((item) => {
    addRecent({ label: item.label, route: item.route, icon: item.icon });
    navigate(item.route);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'ArrowDown')  { e.preventDefault(); setCursor(c => Math.min(c + 1, items.length - 1)); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
      if (e.key === 'Enter')      { e.preventDefault(); if (items[cursor]) go(items[cursor]); }
      if (e.key === 'Escape')     { onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, cursor, items, go, onClose]);

  useEffect(() => {
    const el = listRef.current?.children[cursor];
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [cursor]);

  useEffect(() => { setCursor(0); }, [query]);

  const section = !query.trim() ? null : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 9000,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            style={{
              position: 'fixed', top: '15vh', left: '50%', transform: 'translateX(-50%)',
              width: '100%', maxWidth: 620, zIndex: 9001,
            }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #0a1228 0%, #0d1b35 100%)',
              border: '1px solid #1e3a5f',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.15)',
            }}>
              {/* Search bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #1e2d4a' }}>
                <Search size={18} color="#6366f1" style={{ flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Rechercher une page, une action…"
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: '#f0f4ff', fontSize: 16, fontWeight: 500,
                  }}
                />
                {query && (
                  <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568', padding: 2 }}>
                    <X size={14} />
                  </button>
                )}
                <kbd style={{ background: '#1e2d4a', border: '1px solid #2d3f5a', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>ESC</kbd>
              </div>

              {/* Results */}
              <div ref={listRef} style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
                {!query.trim() && (
                  <>
                    <SectionLabel icon={<Zap size={11} />} label="Actions rapides" />
                    {QUICK_ACTIONS.map((item, i) => (
                      <PaletteItem key={item.route} item={item} active={cursor === i} onClick={() => go(item)} isAction />
                    ))}
                    {getRecent().length > 0 && (
                      <>
                        <SectionLabel icon={<Clock size={11} />} label="Récents" />
                        {getRecent().map((item, i) => (
                          <PaletteItem key={item.route + i} item={item} active={cursor === QUICK_ACTIONS.length + i} onClick={() => go(item)} />
                        ))}
                      </>
                    )}
                  </>
                )}
                {query.trim() && results.pages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: '#4a5568', fontSize: 14 }}>
                    Aucun résultat pour « {query} »
                  </div>
                )}
                {query.trim() && results.pages.length > 0 && (
                  <>
                    <SectionLabel icon={<Hash size={11} />} label="Pages" />
                    {results.pages.map((item, i) => (
                      <PaletteItem key={item.route} item={item} active={cursor === i} onClick={() => go(item)} />
                    ))}
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex', gap: 16, padding: '8px 18px',
                borderTop: '1px solid #1a2740', fontSize: 11, color: '#3d5068',
              }}>
                <span><kbd style={kbdStyle}>↑↓</kbd> naviguer</span>
                <span><kbd style={kbdStyle}>↵</kbd> ouvrir</span>
                <span><kbd style={kbdStyle}>Esc</kbd> fermer</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const kbdStyle = {
  background: '#1e2d4a', border: '1px solid #2d3f5a',
  borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace', fontSize: 10,
};

function SectionLabel({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 18px 4px', fontSize: 10.5, fontWeight: 700, color: '#3d5068', textTransform: 'uppercase', letterSpacing: 1 }}>
      {icon}{label}
    </div>
  );
}

function PaletteItem({ item, active, onClick, isAction }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '9px 18px', cursor: 'pointer',
        background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
        borderLeft: active ? '2px solid #6366f1' : '2px solid transparent',
        transition: 'background .1s, border-color .1s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: active ? '#f0f4ff' : '#c5d0e8' }}>{item.label}</div>
          {item.section && <div style={{ fontSize: 11, color: '#3d5068' }}>{item.isRecent ? '🕐 Récent' : item.section}</div>}
        </div>
      </div>
      {active && (
        <ArrowRight size={14} color="#6366f1" style={{ flexShrink: 0 }} />
      )}
    </div>
  );
}
