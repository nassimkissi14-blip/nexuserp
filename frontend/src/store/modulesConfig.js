import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Default full module configuration ───────────────────────────────────────
// This is the single source of truth for sidebar navigation.
// order: determines sidebar position (lower = higher in list)
// VERSION: bump this when adding new submodules to trigger migration for cached users
const CONFIG_VERSION = 5;

const DEFAULT_MODULES = [
  {
    slug: 'rh', name: 'Ressources Humaines', icon: '👥',
    enabled: true, order: 0,
    subModules: [
      { key: 'employees',   name: 'Employés',      route: '/rh/employees',   enabled: true },
      { key: 'leaves',      name: 'Congés',         route: '/rh/leaves',      enabled: true },
      { key: 'payroll',     name: 'Paie',           route: '/rh/payroll',     enabled: true },
      { key: 'performance', name: 'Performance',    route: '/rh/performance', enabled: true },
      { key: 'recruitment', name: 'Recrutement',    route: '/rh/recrutement', enabled: true },
      { key: 'expenses',    name: 'Notes de frais', route: '/rh/expenses',    enabled: true },
      { key: 'evaluations', name: 'Évaluations',    route: '/rh/evaluations', enabled: true },
      { key: 'mon-espace',  name: 'Mon Espace',     route: '/rh/mon-espace',  enabled: true },
    ],
  },
  {
    slug: 'crm', name: 'CRM', icon: '🤝',
    enabled: true, order: 1,
    subModules: [
      { key: 'customers', name: 'Clients',  route: '/crm/customers', enabled: true },
      { key: 'pipeline',  name: 'Pipeline', route: '/crm/pipeline',  enabled: true },
    ],
  },
  {
    slug: 'sales', name: 'Ventes', icon: '💰',
    enabled: true, order: 2,
    subModules: [
      { key: 'orders',   name: 'Commandes', route: '/sales/orders',   enabled: true },
      { key: 'invoices', name: 'Factures',  route: '/sales/invoices', enabled: true },
      { key: 'quotes',   name: 'Devis',     route: '/sales/quotes',   enabled: true },
      { key: 'credits',  name: 'Avoirs',    route: '/sales/credits',  enabled: true },
    ],
  },
  {
    slug: 'purchases', name: 'Achats', icon: '🛒',
    enabled: true, order: 3,
    subModules: [
      { key: 'suppliers',  name: 'Fournisseurs', route: '/purchases/suppliers',  enabled: true },
      { key: 'orders',     name: 'Commandes',    route: '/purchases/orders',     enabled: true },
      { key: 'receptions', name: 'Réceptions',   route: '/purchases/receptions', enabled: true },
    ],
  },
  {
    slug: 'stock', name: 'Stock', icon: '📦',
    enabled: true, order: 4,
    subModules: [
      { key: 'products',  name: 'Produits',   route: '/stock/products',  enabled: true },
      { key: 'inventory', name: 'Inventaire', route: '/stock/inventory', enabled: true },
      { key: 'movements', name: 'Mouvements', route: '/stock/movements', enabled: true },
      { key: 'alerts',    name: 'Alertes',    route: '/stock/alerts',    enabled: true },
    ],
  },
  {
    slug: 'finance', name: 'Finance', icon: '💳',
    enabled: true, order: 5,
    subModules: [
      { key: 'invoices',   name: 'Factures',     route: '/finance/invoices',  enabled: true },
      { key: 'budget',     name: 'Budget',       route: '/finance/budget',    enabled: true },
      { key: 'treasury',   name: 'Trésorerie',   route: '/finance/treasury',  enabled: true },
      { key: 'accounting', name: 'Comptabilité', route: '/finance/accounting',enabled: true },
      { key: 'reports',    name: 'Rapports',     route: '/finance/reports',   enabled: true },
    ],
  },
  {
    slug: 'projects', name: 'Projets', icon: '📁',
    enabled: true, order: 6,
    subModules: [
      { key: 'list',      name: 'Projets',    route: '/projects/list',      enabled: true },
      { key: 'tasks',     name: 'Tâches',     route: '/projects/tasks',     enabled: true },
      { key: 'gantt',     name: 'Gantt',      route: '/projects/gantt',     enabled: true },
      { key: 'resources', name: 'Ressources', route: '/projects/resources', enabled: true },
    ],
  },
  {
    slug: 'production', name: 'Production', icon: '🏭',
    enabled: true, order: 7,
    subModules: [
      { key: 'orders',           name: 'Flux Kanban',         route: '/production/orders',          enabled: true },
      { key: 'bom',              name: 'Nomenclatures',       route: '/production/bom',             enabled: true },
      { key: 'workcenters',      name: 'Postes de charge',    route: '/production/workcenters',     enabled: true },
      { key: 'routings',         name: 'Gammes',              route: '/production/routings',        enabled: true },
      { key: 'calendars',        name: 'Calendriers',         route: '/production/calendars',       enabled: true },
      { key: 'supplier-catalog', name: 'Catalogue fourn.',    route: '/production/supplier-catalog',enabled: true },
      { key: 'mrp',              name: 'Calcul MRP (CBN)',    route: '/production/mrp',             enabled: true },
      { key: 'scheduling',       name: 'Jalonnement',         route: '/production/scheduling',      enabled: true },
      { key: 'shortage',         name: 'Manquants',           route: '/production/shortage',        enabled: true },
      { key: 'charges',          name: 'Tableau de charges',  route: '/production/charges',         enabled: true },
    ],
  },
  {
    slug: 'maintenance', name: 'Maintenance', icon: '🔧',
    enabled: true, order: 8,
    subModules: [
      { key: 'equipment',   name: 'Parc machines', route: '/maintenance/equipment',   enabled: true },
      { key: 'requests',    name: 'Demandes',      route: '/maintenance/requests',    enabled: true },
      { key: 'work-orders', name: 'Correctif',     route: '/maintenance/work-orders', enabled: true },
      { key: 'orders',      name: 'Ordres',        route: '/maintenance/orders',      enabled: true },
      { key: 'preventive',  name: 'Préventif',     route: '/maintenance/preventive',  enabled: true },
    ],
  },
  {
    slug: 'logistics', name: 'Logistique', icon: '🚛',
    enabled: true, order: 9,
    subModules: [
      { key: 'shipments', name: 'Expéditions',   route: '/logistics/shipments', enabled: true },
      { key: 'carriers',  name: 'Transporteurs', route: '/logistics/carriers',  enabled: true },
      { key: 'tracking',  name: 'Suivi',         route: '/logistics/tracking',  enabled: true },
    ],
  },
  {
    slug: 'communication', name: 'Communication', icon: '💬',
    enabled: true, order: 10,
    subModules: [
      { key: 'messaging',     name: 'Messagerie', route: '/communication/messaging',     enabled: true },
      { key: 'announcements', name: 'Annonces',   route: '/communication/announcements', enabled: true },
      { key: 'calendar',      name: 'Agenda',     route: '/communication/calendar',      enabled: true },
    ],
  },
  {
    slug: 'ai', name: 'NexusAI', icon: '🤖',
    enabled: true, order: 11,
    subModules: [
      { key: 'assistant', name: 'Assistant IA', route: '/ai/assistant', enabled: true },
      { key: 'analytics', name: 'Analyses',     route: '/ai/analytics', enabled: true },
      { key: 'reports',   name: 'Rapports IA',  route: '/ai/reports',   enabled: true },
    ],
  },
  {
    slug: 'analytics', name: 'Analytics', icon: '📊',
    enabled: true, order: 12,
    subModules: [
      { key: 'dashboards', name: 'Tableaux de bord', route: '/analytics/dashboards', enabled: true },
      { key: 'reports',    name: 'Rapports',         route: '/analytics/reports',    enabled: true },
    ],
  },
];

/* ─── Migration: merge new submodules into persisted state ─────────────────── */
function mergeWithDefaults(persisted) {
  if (!persisted?.modules) return { modules: DEFAULT_MODULES, _version: CONFIG_VERSION };

  const merged = DEFAULT_MODULES.map(def => {
    const saved = persisted.modules.find(m => m.slug === def.slug);
    if (!saved) return def;

    // Keep user's enabled/order preferences, but ensure all default subModules exist
    const savedSubKeys = new Set((saved.subModules || []).map(s => s.key));
    const missingSubMods = def.subModules.filter(s => !savedSubKeys.has(s.key));

    return {
      ...def,
      enabled: saved.enabled ?? def.enabled,
      order:   saved.order   ?? def.order,
      subModules: [
        ...(saved.subModules || []),
        ...missingSubMods,
      ],
    };
  });

  return { modules: merged, _version: CONFIG_VERSION };
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useModulesConfigStore = create(
  persist(
    (set, get) => ({
      modules: DEFAULT_MODULES,
      _version: CONFIG_VERSION,

      // Returns sorted, enabled modules (excludes 'admin')
      getVisible: () =>
        get().modules
          .filter(m => m.enabled && m.slug !== 'admin')
          .sort((a, b) => a.order - b.order),

      toggleModule: (slug) => {
        set(state => ({
          modules: state.modules.map(m =>
            m.slug === slug ? { ...m, enabled: !m.enabled } : m
          ),
        }));
      },

      toggleSubModule: (slug, key) => {
        set(state => ({
          modules: state.modules.map(m =>
            m.slug !== slug ? m : {
              ...m,
              subModules: m.subModules.map(s =>
                s.key === key ? { ...s, enabled: !s.enabled } : s
              ),
            }
          ),
        }));
      },

      moveModule: (slug, direction) => {
        set(state => {
          const sorted = [...state.modules].sort((a, b) => a.order - b.order);
          const idx    = sorted.findIndex(m => m.slug === slug);
          const newIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (newIdx < 0 || newIdx >= sorted.length) return state;
          [sorted[idx], sorted[newIdx]] = [sorted[newIdx], sorted[idx]];
          return { modules: sorted.map((m, i) => ({ ...m, order: i })) };
        });
      },

      reset: () => set({ modules: DEFAULT_MODULES, _version: CONFIG_VERSION }),
    }),
    {
      name: 'nexuserp-modules-config',
      // Migration: runs on hydration — ensures new submodules appear for existing users
      merge: (persisted, current) => {
        if (!persisted || persisted._version >= CONFIG_VERSION) {
          return { ...current, ...persisted };
        }
        // Older version: merge defaults to add any missing submodules
        const { modules, _version } = mergeWithDefaults(persisted);
        return { ...current, modules, _version };
      },
    }
  )
);
