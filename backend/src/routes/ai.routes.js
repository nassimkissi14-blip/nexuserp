import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import prisma from '../lib/prisma.js';

const router = Router();

const fmt  = (n) => Math.round(n || 0).toLocaleString('fr-DZ') + ' DZD';
const pct  = (v, t) => t ? Math.round((v / t) * 100) + '%' : '0%';
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function match(q, ...keywords) {
  return keywords.some(k => q.includes(k));
}

/* ── ACCESS CONTROL ─────────────────────────────────────────────────────── */

const FULL_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'DIRECTOR']);

// For each department group, which topic keys are accessible
const DEPT_RULES = [
  { match: ['rh', 'ressources humaines', 'personnel', 'humain', 'paie', 'recrutement'],
    allow: ['rh', 'leaves'],                        label: 'RH / Personnel' },
  { match: ['commercial', 'vente', 'crm', 'marketing', 'client'],
    allow: ['crm', 'ventes'],                        label: 'Commercial / CRM' },
  { match: ['finance', 'comptab', 'tresor', 'budget', 'gestion financiere'],
    allow: ['finance', 'ventes'],                    label: 'Finance' },
  { match: ['achat', 'approvisionnement', 'stock', 'logistique', 'entrepot', 'magasin', 'inventaire'],
    allow: ['stock'],                                label: 'Stock / Logistique' },
  { match: ['production', 'fabrication', 'atelier', 'manufactur'],
    allow: ['production', 'stock'],                  label: 'Production' },
  { match: ['maintenance', 'technique', 'mecanique', 'electrique', 'technicien'],
    allow: ['maintenance'],                          label: 'Maintenance' },
  { match: ['projet', 'planning', 'chef de projet'],
    allow: ['projets'],                              label: 'Projets' },
  { match: ['it', 'informatique', 'systeme', 'reseau', 'dsi'],
    allow: ['rh', 'stock', 'projets', 'maintenance', 'production', 'crm', 'ventes', 'finance', 'leaves'],
    label: 'IT' },
];

const TOPIC_LABELS = {
  rh:          '👥 RH / Employés',
  leaves:      '🏖️ Congés & Absences',
  stock:       '📦 Stock & Inventaire',
  crm:         '🤝 CRM / Clients',
  ventes:      '📈 Ventes & Factures',
  finance:     '💰 Finance & Budget',
  projets:     '🗂️ Projets',
  maintenance: '🔧 Maintenance',
  production:  '🏭 Production',
  alerts:      '🚨 Vue générale / Alertes',
};

// Keywords that trigger each topic
const TOPIC_DETECT = {
  rh:          ['employe', 'staff', 'personnel', 'rh', 'salarie', 'effectif', 'equipe', 'travailleur', 'collaborateur'],
  leaves:      ['conge', 'absence', 'vacance', 'arret'],
  stock:       ['stock', 'inventaire', 'produit', 'rupture', 'magasin', 'entrepot', 'marchandise'],
  crm:         ['client', 'crm', 'prospect', 'commercial', 'customer', 'contact', 'fidel'],
  ventes:      ['vente', 'commande', 'order', 'chiffre', 'ca ', 'revenue', 'factur', 'devis'],
  finance:     ['finance', 'budget', 'tresorerie', 'comptab', 'bilan', 'depense', 'charge'],
  projets:     ['projet', 'tache', 'planning', 'avancement', 'deadline', 'echeance'],
  maintenance: ['maintenance', 'equipement', 'panne', 'intervention', 'reparation'],
  production:  ['production', 'fabrication', 'ordre', 'atelier', 'bom', 'nomenclature'],
  alerts:      ['alerte', 'urgent', 'critique', 'probleme', 'dashboard', 'synthese', 'resume', 'general', 'bilan'],
};

function detectTopic(q) {
  for (const [topic, keywords] of Object.entries(TOPIC_DETECT)) {
    if (keywords.some(k => q.includes(k))) return topic;
  }
  return null;
}

function getDeptRule(dept) {
  if (!dept) return null;
  const dn = norm(dept);
  return DEPT_RULES.find(r => r.match.some(m => dn.includes(m))) || null;
}

function buildAccessControl(userRole, userDept) {
  const isAdmin = FULL_ACCESS_ROLES.has(userRole);
  const deptRule = isAdmin ? null : getDeptRule(userDept);
  const allowedTopics = isAdmin ? null : (deptRule?.allow || []);

  const canAccess = (topic) => {
    if (isAdmin) return true;
    if (!allowedTopics || allowedTopics.length === 0) return false;
    return allowedTopics.includes(topic);
  };

  const denied = (topic) => {
    const deptLabel = deptRule?.label || (userDept || 'votre département');
    const topicLabel = TOPIC_LABELS[topic] || topic;
    const accessList = allowedTopics?.length
      ? allowedTopics.map(t => `• ${TOPIC_LABELS[t] || t}`).join('\n')
      : '• Aucun accès défini pour votre département';
    return `🔒 **Accès restreint — ${topicLabel}**

Votre profil est limité au département **${deptLabel}**. Les données **${topicLabel}** sont réservées aux directeurs et administrateurs.

**Ce que vous pouvez consulter :**
${accessList}

Contactez votre administrateur pour un accès étendu.`;
  };

  return { canAccess, denied, isAdmin, deptRule };
}

/* ── MAIN HANDLER ───────────────────────────────────────────────────────── */

async function generateResponse(question, companyId, userRole, userDept) {
  const q = norm(question);
  const { canAccess, denied } = buildAccessControl(userRole, userDept);

  /* ── EMPLOYÉS ── */
  if (match(q, 'employe', 'staff', 'personnel', 'rh', 'salarie', 'effectif', 'equipe', 'travailleur', 'collaborateur')) {
    if (!canAccess('rh')) return denied('rh');

    const employees = await prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { firstName: true, lastName: true, position: true, department: true, salary: true, contractType: true, hireDate: true },
      orderBy: { department: 'asc' },
    });
    const payroll = employees.reduce((s, e) => s + (e.salary || 0), 0);
    const byDept = employees.reduce((acc, e) => { acc[e.department || 'N/A'] = (acc[e.department || 'N/A'] || 0) + 1; return acc; }, {});
    const lines = employees.map(e =>
      `| ${e.firstName} ${e.lastName} | ${e.position || e.department} | ${fmt(e.salary)} | ${e.contractType || 'CDI'} |`
    ).join('\n');
    const deptLines = Object.entries(byDept).map(([d, n]) => `- ${d} : ${n} personne(s)`).join('\n');

    return `👥 **Rapport RH — Employés actifs**

**Effectif total : ${employees.length} employé(s) actif(s)**

| Nom | Poste | Salaire | Contrat |
|-----|-------|---------|---------|
${lines}

**Masse salariale mensuelle : ${fmt(payroll)}**

**Répartition par département :**
${deptLines}`;
  }

  /* ── CONGÉS ── */
  if (match(q, 'conge', 'absence', 'vacance', 'arret')) {
    if (!canAccess('leaves')) return denied('leaves');

    const leaves = await prisma.leaveRequest.findMany({
      where: { employee: { companyId } },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const pending  = leaves.filter(l => l.status === 'PENDING');
    const approved = leaves.filter(l => l.status === 'APPROVED');
    const pendingLines = pending.length
      ? pending.map(l => `- ⏳ ${l.employee.firstName} ${l.employee.lastName} — du ${new Date(l.startDate).toLocaleDateString('fr-FR')} au ${new Date(l.endDate).toLocaleDateString('fr-FR')}`).join('\n')
      : '- Aucune demande en attente';
    const approvedLines = approved.slice(0, 5).map(l =>
      `- ✅ ${l.employee.firstName} ${l.employee.lastName} — du ${new Date(l.startDate).toLocaleDateString('fr-FR')} au ${new Date(l.endDate).toLocaleDateString('fr-FR')}`
    ).join('\n');

    return `🏖️ **Gestion des congés**

**En attente d'approbation (${pending.length}) :**
${pendingLines}

**Approuvés récemment (${approved.length} total) :**
${approvedLines || '- Aucun'}`;
  }

  /* ── STOCK / INVENTAIRE ── */
  if (match(q, 'stock', 'inventaire', 'produit', 'rupture', 'magasin', 'entrepot', 'marchandise')) {
    if (!canAccess('stock')) return denied('stock');

    const products = await prisma.product.findMany({
      where: { companyId },
      select: { name: true, stockQty: true, minStockQty: true, sellPrice: true, unit: true, category: true },
      orderBy: { stockQty: 'asc' },
    });
    const critical   = products.filter(p => p.minStockQty && p.stockQty <= p.minStockQty);
    const ok         = products.filter(p => !p.minStockQty || p.stockQty > p.minStockQty);
    const totalValue = products.reduce((s, p) => s + (p.stockQty * (p.sellPrice || 0)), 0);
    const critLines  = critical.length
      ? critical.map(p => `🔴 ${p.name} : **${p.stockQty} / ${p.minStockQty} ${p.unit || 'u.'}** — Commande urgente`).join('\n')
      : '✅ Aucune rupture critique';
    const okLines = ok.slice(0, 8).map(p => `✅ ${p.name} : ${p.stockQty} ${p.unit || 'u.'}`).join('\n');

    return `📦 **État du stock**

**Alertes critiques (${critical.length}) :**
${critLines}

**Produits OK (${ok.length}) :**
${okLines}

**Valeur totale du stock : ${fmt(totalValue)}**

${critical.length > 0 ? `💡 **Recommandation :** Lancer une commande fournisseur immédiate pour les ${critical.length} produit(s) en rupture.` : ''}`;
  }

  /* ── CLIENTS / CRM ── */
  if (match(q, 'client', 'crm', 'prospect', 'commercial', 'customer', 'contact', 'fidel')) {
    if (!canAccess('crm')) return denied('crm');

    const customers = await prisma.customer.findMany({
      where: { companyId },
      select: { name: true, type: true, email: true, phone: true, totalSpent: true, city: true },
      orderBy: { totalSpent: 'desc' },
    });
    const active    = customers.filter(c => c.type === 'CLIENT');
    const prospects = customers.filter(c => c.type === 'PROSPECT');
    const totalCA   = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);
    const topLines  = customers.slice(0, 8).map(c =>
      `| ${c.name} | ${c.type} | ${fmt(c.totalSpent)} |`
    ).join('\n');

    return `🤝 **Rapport Clients / CRM**

**Total : ${customers.length} contacts** (${active.length} clients actifs, ${prospects.length} prospects)
**CA cumulé total : ${fmt(totalCA)}**

| Nom | Type | CA total |
|-----|------|----------|
${topLines}`;
  }

  /* ── VENTES / COMMANDES ── */
  if (match(q, 'vente', 'commande', 'order', 'chiffre', 'ca ', 'revenue', 'factur', 'devis')) {
    if (!canAccess('ventes')) return denied('ventes');

    const now          = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [orders, invoices] = await Promise.all([
      prisma.order.findMany({
        where: { companyId },
        select: { reference: true, status: true, totalAmount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.invoice.findMany({
        where: { companyId },
        select: { reference: true, status: true, totalAmount: true, dueDate: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const monthOrders  = orders.filter(o => new Date(o.createdAt) >= startOfMonth);
    const caMonth      = monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const overdue      = invoices.filter(i => i.status === 'OVERDUE');
    const overdueTotal = overdue.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const statusCount  = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
    const statusLines  = Object.entries(statusCount).map(([s, n]) => `- ${s} : ${n}`).join('\n');

    return `📈 **Rapport Ventes & Finances**

**CA du mois en cours : ${fmt(caMonth)}** (${monthOrders.length} commandes)
**Total commandes : ${orders.length}**

**Statuts des commandes :**
${statusLines}

**Factures impayées (${overdue.length}) : ${fmt(overdueTotal)}**
${overdue.map(i => `- ${i.reference} : ${fmt(i.totalAmount)} — échéance ${i.dueDate ? new Date(i.dueDate).toLocaleDateString('fr-FR') : 'N/A'}`).join('\n') || '- Aucune'}

${overdue.length > 0 ? `⚠️ **Action requise :** Relancer les ${overdue.length} facture(s) impayée(s) pour un total de ${fmt(overdueTotal)}.` : '✅ Aucune facture en retard'}`;
  }

  /* ── FINANCE / BUDGET ── */
  if (match(q, 'finance', 'budget', 'tresorerie', 'comptab', 'bilan', 'depense', 'charge')) {
    if (!canAccess('finance')) return denied('finance');

    const [budgets, treasury] = await Promise.all([
      prisma.budget.findMany({ where: { companyId }, select: { name: true, totalAmount: true, spentAmount: true, category: true }, take: 10 }).catch(() => []),
      prisma.treasury.findMany({ where: { companyId }, select: { name: true, balance: true, type: true }, take: 5 }).catch(() => []),
    ]);
    const totalBudget  = budgets.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const totalSpent   = budgets.reduce((s, b) => s + (b.spentAmount || 0), 0);
    const totalBalance = treasury.reduce((s, t) => s + (t.balance || 0), 0);
    const budgetLines  = budgets.map(b =>
      `- ${b.name} : dépensé ${fmt(b.spentAmount)} / ${fmt(b.totalAmount)} (${pct(b.spentAmount, b.totalAmount)})`
    ).join('\n') || '- Aucun budget configuré';
    const treasuryLines = treasury.map(t =>
      `- ${t.name} (${t.type}) : **${fmt(t.balance)}**`
    ).join('\n') || '- Aucun compte configuré';

    return `💰 **Rapport Financier**

**Trésorerie totale : ${fmt(totalBalance)}**
${treasuryLines}

**Budgets (${budgets.length}) :**
${budgetLines}
**Total dépensé : ${fmt(totalSpent)} / ${fmt(totalBudget)} (${pct(totalSpent, totalBudget)})**`;
  }

  /* ── PROJETS ── */
  if (match(q, 'projet', 'tache', 'planning', 'avancement', 'deadline', 'echeance')) {
    if (!canAccess('projets')) return denied('projets');

    const projects = await prisma.project.findMany({
      where: { companyId },
      select: { name: true, status: true, progress: true, budget: true, endDate: true, description: true },
      orderBy: { endDate: 'asc' },
    });
    const active = projects.filter(p => p.status === 'IN_PROGRESS');
    const done   = projects.filter(p => p.status === 'COMPLETED');
    const projectLines = projects.map(p => {
      const bar = '█'.repeat(Math.round((p.progress || 0) / 10)) + '░'.repeat(10 - Math.round((p.progress || 0) / 10));
      return `**${p.name}** [${bar}] ${p.progress || 0}%\n  Budget: ${fmt(p.budget)} | Statut: ${p.status} | Fin: ${p.endDate ? new Date(p.endDate).toLocaleDateString('fr-FR') : 'N/A'}`;
    }).join('\n\n');

    return `🗂️ **Rapport Projets**

**${projects.length} projets** (${active.length} en cours, ${done.length} terminés)

${projectLines || 'Aucun projet enregistré'}`;
  }

  /* ── MAINTENANCE ── */
  if (match(q, 'maintenance', 'equipement', 'panne', 'intervention', 'reparation')) {
    if (!canAccess('maintenance')) return denied('maintenance');

    const [equipment, requests] = await Promise.all([
      prisma.equipment.findMany({ where: { companyId }, select: { name: true, status: true, location: true }, take: 10 }).catch(() => []),
      prisma.maintenanceRequest.findMany({ where: { companyId, status: { in: ['OPEN', 'IN_PROGRESS'] } }, select: { title: true, priority: true, equipment: { select: { name: true } } }, take: 10 }).catch(() => []),
    ]);
    const breakdown = equipment.filter(e => e.status === 'DOWN');
    const eqLines   = equipment.map(e => `- ${e.name} (${e.location || 'N/A'}) : ${e.status}`).join('\n') || '- Aucun équipement';
    const reqLines  = requests.map(r => `- ⚠️ ${r.title} — ${r.equipment?.name || 'N/A'} — priorité: ${r.priority}`).join('\n') || '- Aucune intervention en attente';

    return `🔧 **Rapport Maintenance**

**Équipements (${equipment.length}) — ${breakdown.length} en panne :**
${eqLines}

**Interventions en cours / ouvertes (${requests.length}) :**
${reqLines}`;
  }

  /* ── PRODUCTION ── */
  if (match(q, 'production', 'fabrication', 'ordre', 'atelier', 'bom', 'nomenclature')) {
    if (!canAccess('production')) return denied('production');

    const orders = await prisma.productionOrder.findMany({
      where: { companyId },
      select: { reference: true, status: true, quantity: true, product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }).catch(() => []);
    const lines = orders.map(o =>
      `- ${o.reference} | ${o.product?.name || 'N/A'} | Qté: ${o.quantity} | ${o.status}`
    ).join('\n') || '- Aucun ordre de production';

    return `🏭 **Rapport Production**

**Ordres de fabrication (${orders.length}) :**
${lines}`;
  }

  /* ── ALERTES / DASHBOARD — réservé aux admins ── */
  if (match(q, 'alerte', 'urgent', 'critique', 'probleme', 'dashboard', 'synthese', 'resume', 'general', 'bilan')) {
    if (!canAccess('alerts')) return denied('alerts');

    const [employees, products, invoices, leaves] = await Promise.all([
      prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      prisma.product.findMany({ where: { companyId }, select: { name: true, stockQty: true, minStockQty: true } }),
      prisma.invoice.findMany({ where: { companyId, status: 'OVERDUE' }, select: { totalAmount: true } }),
      prisma.leaveRequest.count({ where: { employee: { companyId }, status: 'PENDING' } }),
    ]);
    const critical     = products.filter(p => p.minStockQty && p.stockQty <= p.minStockQty);
    const overdueTotal = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const alerts       = [];
    critical.forEach(p => alerts.push(`🔴 Stock critique : ${p.name} (${p.stockQty}/${p.minStockQty})`));
    if (invoices.length) alerts.push(`🟡 ${invoices.length} facture(s) impayée(s) : ${fmt(overdueTotal)}`);
    if (leaves) alerts.push(`🟡 ${leaves} demande(s) de congé en attente`);
    if (!alerts.length) alerts.push('✅ Aucune alerte critique');

    return `🚨 **Tableau de bord — Alertes**

**${alerts.length - (alerts[0].startsWith('✅') ? 1 : 0)} alerte(s) active(s)**

${alerts.join('\n')}

**Résumé :**
- 👥 ${employees} employé(s) actif(s)
- 📦 ${products.length} produit(s) en stock (${critical.length} en rupture)
- 💳 ${invoices.length} facture(s) impayée(s)`;
  }

  /* ── RÉPONSE GÉNÉRIQUE ── */
  const { canAccess: ca } = buildAccessControl(userRole, userDept);
  const deptRule = getDeptRule(userDept);
  const isAdmin  = FULL_ACCESS_ROLES.has(userRole);

  const availableTopics = isAdmin
    ? Object.entries(TOPIC_LABELS)
    : (deptRule?.allow || []).map(t => [t, TOPIC_LABELS[t]]);

  const topicHints = availableTopics.map(([, label]) => `- ${label}`).join('\n');

  const [empCount, prodCount, custCount] = await Promise.all([
    prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
    prisma.product.count({ where: { companyId } }),
    prisma.customer.count({ where: { companyId } }),
  ]);

  return `🤔 Je n'ai pas trouvé de correspondance précise pour votre question.

${!isAdmin && deptRule ? `📌 Votre accès est limité au département **${deptRule.label}**.\n` : ''}
**Voici ce que vous pouvez me demander :**
${topicHints || '- Aucun accès configuré'}

*Reformulez votre question avec des mots-clés comme : employés, stock, clients, ventes, maintenance…*`;
}

/* ── ROUTE ──────────────────────────────────────────────────────────────── */

router.post('/chat', authenticate, async (req, res, next) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages requis' });
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return res.json({ success: true, content: 'Comment puis-je vous aider ?' });

    const content = await generateResponse(
      lastUserMessage.content,
      req.companyId,
      req.user.role,
      req.user.department,
    );
    res.json({ success: true, content });

  } catch (err) {
    next(err);
  }
});

export default router;
