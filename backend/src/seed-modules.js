/**
 * seed-modules.js — Configure tous les modules et sous-modules NexusERP v5.0
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MODULES = [
  {
    name: 'Ressources Humaines', slug: 'rh', icon: '👥', color: '#6366f1', sortOrder: 1,
    subs: [
      { name: 'Employés',         slug: 'rh-employees',   icon: '👤', route: '/rh/employees',   sortOrder: 1 },
      { name: 'Congés',           slug: 'rh-leaves',      icon: '🏖️', route: '/rh/leaves',      sortOrder: 2 },
      { name: 'Paie',             slug: 'rh-payroll',     icon: '💵', route: '/rh/payroll',     sortOrder: 3 },
      { name: 'Recrutement',      slug: 'rh-recruitment', icon: '🎯', route: '/rh/recrutement', sortOrder: 4 },
      { name: 'Notes de frais',   slug: 'rh-expenses',    icon: '🧾', route: '/rh/expenses',    sortOrder: 5 },
      { name: 'Évaluations',      slug: 'rh-evaluations', icon: '⭐', route: '/rh/evaluations', sortOrder: 6 },
      { name: 'Performance',      slug: 'rh-performance', icon: '📊', route: '/rh/performance', sortOrder: 7 },
      { name: 'Mon Espace',       slug: 'rh-mon-espace',  icon: '🙋', route: '/rh/mon-espace',  sortOrder: 8 },
    ],
  },
  {
    name: 'CRM', slug: 'crm', icon: '🤝', color: '#10b981', sortOrder: 2,
    subs: [
      { name: 'Clients',   slug: 'crm-customers', icon: '🏢', route: '/crm/customers', sortOrder: 1 },
      { name: 'Pipeline',  slug: 'crm-pipeline',  icon: '📈', route: '/crm/pipeline',  sortOrder: 2 },
    ],
  },
  {
    name: 'Ventes', slug: 'sales', icon: '📈', color: '#f59e0b', sortOrder: 3,
    subs: [
      { name: 'Commandes', slug: 'sales-orders',   icon: '🛒', route: '/sales/orders',   sortOrder: 1 },
      { name: 'Factures',  slug: 'sales-invoices', icon: '🧾', route: '/sales/invoices', sortOrder: 2 },
      { name: 'Devis',     slug: 'sales-quotes',   icon: '📋', route: '/sales/quotes',   sortOrder: 3 },
      { name: 'Avoirs',    slug: 'sales-credits',  icon: '↩️', route: '/sales/credits',  sortOrder: 4 },
    ],
  },
  {
    name: 'Achats', slug: 'purchases', icon: '🛒', color: '#8b5cf6', sortOrder: 4,
    subs: [
      { name: 'Fournisseurs', slug: 'purchases-suppliers', icon: '🏭', route: '/purchases/suppliers', sortOrder: 1 },
      { name: 'Commandes',    slug: 'purchases-orders',    icon: '📦', route: '/purchases/orders',    sortOrder: 2 },
    ],
  },
  {
    name: 'Stock', slug: 'stock', icon: '📦', color: '#ef4444', sortOrder: 5,
    subs: [
      { name: 'Produits',    slug: 'stock-products',   icon: '📦', route: '/stock/products',   sortOrder: 1 },
      { name: 'Inventaire',  slug: 'stock-inventory',  icon: '📋', route: '/stock/inventory',  sortOrder: 2 },
      { name: 'Mouvements',  slug: 'stock-movements',  icon: '🔄', route: '/stock/movements',  sortOrder: 3 },
      { name: 'Alertes',     slug: 'stock-alerts',     icon: '⚠️', route: '/stock/alerts',     sortOrder: 4 },
    ],
  },
  {
    name: 'Finance', slug: 'finance', icon: '💰', color: '#06b6d4', sortOrder: 6,
    subs: [
      { name: 'Factures',     slug: 'finance-invoices',   icon: '🧾', route: '/finance/invoices',   sortOrder: 1 },
      { name: 'Budget',       slug: 'finance-budget',     icon: '📊', route: '/finance/budget',     sortOrder: 2 },
      { name: 'Trésorerie',   slug: 'finance-treasury',   icon: '🏦', route: '/finance/treasury',   sortOrder: 3 },
      { name: 'Comptabilité', slug: 'finance-accounting', icon: '📒', route: '/finance/accounting', sortOrder: 4 },
      { name: 'Rapports',     slug: 'finance-reports',    icon: '📈', route: '/finance/reports',    sortOrder: 5 },
    ],
  },
  {
    name: 'Projets', slug: 'projects', icon: '🗂️', color: '#84cc16', sortOrder: 7,
    subs: [
      { name: 'Projets',    slug: 'projects-list',      icon: '📁', route: '/projects/list',      sortOrder: 1 },
      { name: 'Tâches',     slug: 'projects-tasks',     icon: '✅', route: '/projects/tasks',     sortOrder: 2 },
      { name: 'Gantt',      slug: 'projects-gantt',     icon: '📅', route: '/projects/gantt',     sortOrder: 3 },
      { name: 'Ressources', slug: 'projects-resources', icon: '👥', route: '/projects/resources', sortOrder: 4 },
    ],
  },
  {
    name: 'Production', slug: 'production', icon: '🏭', color: '#f97316', sortOrder: 8,
    subs: [
      { name: 'Ordres de fabrication', slug: 'production-orders',      icon: '🏭', route: '/production/orders',      sortOrder: 1 },
      { name: 'Nomenclatures (BOM)',   slug: 'production-bom',         icon: '🌳', route: '/production/bom',         sortOrder: 2 },
      { name: 'Postes de charge',      slug: 'production-workcenters', icon: '⚙️', route: '/production/workcenters', sortOrder: 3 },
      { name: 'Gammes',                slug: 'production-routings',    icon: '📋', route: '/production/routings',    sortOrder: 4 },
      { name: 'Calendriers',           slug: 'production-calendars',   icon: '📅', route: '/production/calendars',   sortOrder: 5 },
      { name: 'MRP / CBN',             slug: 'production-mrp',         icon: '🔢', route: '/production/mrp',         sortOrder: 6 },
      { name: 'Jalonnement',           slug: 'production-scheduling',  icon: '⏱️', route: '/production/scheduling',  sortOrder: 7 },
      { name: 'Manquants',             slug: 'production-shortage',    icon: '⚠️', route: '/production/shortage',    sortOrder: 8 },
      { name: 'Charges',               slug: 'production-charges',     icon: '📊', route: '/production/charges',     sortOrder: 9 },
    ],
  },
  {
    name: 'Maintenance', slug: 'maintenance', icon: '🔧', color: '#64748b', sortOrder: 9,
    subs: [
      { name: 'Équipements',   slug: 'maintenance-equipment',  icon: '⚙️', route: '/maintenance/equipment',  sortOrder: 1 },
      { name: 'Demandes',      slug: 'maintenance-requests',   icon: '🚨', route: '/maintenance/requests',   sortOrder: 2 },
      { name: 'Ordres travaux',slug: 'maintenance-orders',     icon: '🔧', route: '/maintenance/orders',     sortOrder: 3 },
      { name: 'Préventif',     slug: 'maintenance-preventive', icon: '📅', route: '/maintenance/preventive', sortOrder: 4 },
      { name: 'Historique',    slug: 'maintenance-history',    icon: '📜', route: '/maintenance/history',    sortOrder: 5 },
    ],
  },
  {
    name: 'Logistique', slug: 'logistics', icon: '🚚', color: '#0ea5e9', sortOrder: 10,
    subs: [
      { name: 'Expéditions',   slug: 'logistics-shipments', icon: '📦', route: '/logistics/shipments', sortOrder: 1 },
      { name: 'Transporteurs', slug: 'logistics-carriers',  icon: '🚚', route: '/logistics/carriers',  sortOrder: 2 },
      { name: 'Suivi',         slug: 'logistics-tracking',  icon: '📍', route: '/logistics/tracking',  sortOrder: 3 },
    ],
  },
  {
    name: 'Communication', slug: 'communication', icon: '💬', color: '#ec4899', sortOrder: 11,
    subs: [
      { name: 'Messagerie',  slug: 'communication-messaging',     icon: '💬', route: '/communication/messaging',     sortOrder: 1 },
      { name: 'Annonces',    slug: 'communication-announcements', icon: '📢', route: '/communication/announcements', sortOrder: 2 },
      { name: 'Calendrier',  slug: 'communication-calendar',      icon: '📅', route: '/communication/calendar',      sortOrder: 3 },
    ],
  },
  {
    name: 'Administration', slug: 'admin', icon: '⚙️', color: '#78716c', sortOrder: 12, isCore: true,
    subs: [
      { name: 'Modules',      slug: 'admin-modules',   icon: '🧩', route: '/admin/modules',   sortOrder: 1 },
      { name: 'Utilisateurs', slug: 'admin-users',     icon: '👥', route: '/admin/users',     sortOrder: 2 },
      { name: 'Paramètres',   slug: 'admin-settings',  icon: '⚙️', route: '/admin/settings',  sortOrder: 3 },
      { name: 'Sauvegarde',   slug: 'admin-backup',    icon: '💾', route: '/admin/backup',    sortOrder: 4 },
      { name: 'Langues',      slug: 'admin-languages', icon: '🌐', route: '/admin/languages', sortOrder: 5 },
      { name: 'Workflows',    slug: 'admin-workflows', icon: '🔀', route: '/admin/workflows', sortOrder: 6 },
    ],
  },
];

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) { console.error('❌ Aucune entreprise'); process.exit(1); }
  const cid = company.id;

  // Nettoyer les anciens modules/sous-modules
  await prisma.companySubmodule.deleteMany({ where: { companyId: cid } });
  await prisma.companyModule.deleteMany({ where: { companyId: cid } });
  await prisma.subModule.deleteMany();
  await prisma.module.deleteMany();
  console.log('🧹 Anciens modules supprimés\n');

  let totalMods = 0; let totalSubs = 0;

  for (const m of MODULES) {
    const { subs, ...modData } = m;
    const mod = await prisma.module.create({ data: { ...modData, isCore: modData.isCore || false } });
    await prisma.companyModule.create({ data: { companyId: cid, moduleId: mod.id, enabled: true } });
    totalMods++;

    for (const s of subs) {
      const sub = await prisma.subModule.create({ data: { ...s, moduleId: mod.id } });
      await prisma.companySubmodule.create({ data: { companyId: cid, submoduleId: sub.id, enabled: true } });
      totalSubs++;
    }
    console.log(`✅ ${mod.icon} ${mod.name} — ${subs.length} sous-modules`);
  }

  console.log(`
╔══════════════════════════════════════╗
║    ✅  MODULES CONFIGURÉS            ║
╠══════════════════════════════════════╣
║  🧩 Modules       : ${String(totalMods).padEnd(17)}║
║  📌 Sous-modules  : ${String(totalSubs).padEnd(17)}║
║  🏢 Entreprise    : ${String(company.name).substring(0,17).padEnd(17)}║
╚══════════════════════════════════════╝
  `);
}

main().catch(console.error).finally(() => prisma.$disconnect());
