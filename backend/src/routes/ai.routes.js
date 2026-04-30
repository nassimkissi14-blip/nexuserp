import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import prisma from '../lib/prisma.js';

const router = Router();

const fmt = (n) => Math.round(n || 0).toLocaleString('fr-DZ') + ' DZD';
const pct = (v, t) => t ? Math.round((v / t) * 100) + '%' : '0%';

function match(q, ...keywords) {
  return keywords.some(k => q.includes(k));
}

async function generateResponse(question, companyId) {
  const q = question.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* ── EMPLOYÉS ── */
  if (match(q, 'employe', 'staff', 'personnel', 'rh', 'salarie', 'effectif', 'equipe', 'travailleur')) {
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
    const leaves = await prisma.leaveRequest.findMany({
      where: { employee: { companyId } },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const pending = leaves.filter(l => l.status === 'PENDING');
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
    const products = await prisma.product.findMany({
      where: { companyId },
      select: { name: true, stockQty: true, minStockQty: true, sellPrice: true, unit: true, category: true },
      orderBy: { stockQty: 'asc' },
    });
    const critical = products.filter(p => p.minStockQty && p.stockQty <= p.minStockQty);
    const ok = products.filter(p => !p.minStockQty || p.stockQty > p.minStockQty);
    const totalValue = products.reduce((s, p) => s + (p.stockQty * (p.sellPrice || 0)), 0);

    const critLines = critical.length
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
    const customers = await prisma.customer.findMany({
      where: { companyId },
      select: { name: true, type: true, email: true, phone: true, totalSpent: true, city: true },
      orderBy: { totalSpent: 'desc' },
    });
    const active = customers.filter(c => c.type === 'CLIENT');
    const prospects = customers.filter(c => c.type === 'PROSPECT');
    const totalCA = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);

    const topLines = customers.slice(0, 8).map(c =>
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
    const now = new Date();
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

    const monthOrders = orders.filter(o => new Date(o.createdAt) >= startOfMonth);
    const caMonth = monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const overdue = invoices.filter(i => i.status === 'OVERDUE');
    const overdueTotal = overdue.reduce((s, i) => s + (i.totalAmount || 0), 0);

    const statusCount = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
    const statusLines = Object.entries(statusCount).map(([s, n]) => `- ${s} : ${n}`).join('\n');

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
    const [budgets, treasury] = await Promise.all([
      prisma.budget.findMany({ where: { companyId }, select: { name: true, totalAmount: true, spentAmount: true, category: true }, take: 10 }).catch(() => []),
      prisma.treasury.findMany({ where: { companyId }, select: { name: true, balance: true, type: true }, take: 5 }).catch(() => []),
    ]);

    const totalBudget = budgets.reduce((s, b) => s + (b.totalAmount || 0), 0);
    const totalSpent = budgets.reduce((s, b) => s + (b.spentAmount || 0), 0);
    const totalBalance = treasury.reduce((s, t) => s + (t.balance || 0), 0);

    const budgetLines = budgets.map(b =>
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
    const projects = await prisma.project.findMany({
      where: { companyId },
      select: { name: true, status: true, progress: true, budget: true, endDate: true, description: true },
      orderBy: { endDate: 'asc' },
    });
    const active = projects.filter(p => p.status === 'IN_PROGRESS');
    const done = projects.filter(p => p.status === 'COMPLETED');

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
    const [equipment, requests] = await Promise.all([
      prisma.equipment.findMany({ where: { companyId }, select: { name: true, status: true, location: true }, take: 10 }).catch(() => []),
      prisma.maintenanceRequest.findMany({ where: { companyId, status: 'PENDING' }, select: { title: true, priority: true, equipment: { select: { name: true } } }, take: 10 }).catch(() => []),
    ]);

    const breakdown = equipment.filter(e => e.status === 'BROKEN');
    const eqLines = equipment.map(e => `- ${e.name} (${e.location || 'N/A'}) : ${e.status}`).join('\n') || '- Aucun équipement';
    const reqLines = requests.map(r => `- ⚠️ ${r.title} — ${r.equipment?.name || 'N/A'} — priorité: ${r.priority}`).join('\n') || '- Aucune intervention en attente';

    return `🔧 **Rapport Maintenance**

**Équipements (${equipment.length}) — ${breakdown.length} en panne :**
${eqLines}

**Interventions en attente (${requests.length}) :**
${reqLines}`;
  }

  /* ── ALERTES / DASHBOARD ── */
  if (match(q, 'alerte', 'urgent', 'critique', 'probleme', 'dashboard', 'synthese', 'resume', 'general', 'bilan')) {
    const [employees, products, invoices, leaves] = await Promise.all([
      prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      prisma.product.findMany({ where: { companyId }, select: { name: true, stockQty: true, minStockQty: true } }),
      prisma.invoice.findMany({ where: { companyId, status: 'OVERDUE' }, select: { totalAmount: true } }),
      prisma.leaveRequest.count({ where: { employee: { companyId }, status: 'PENDING' } }),
    ]);

    const critical = products.filter(p => p.minStockQty && p.stockQty <= p.minStockQty);
    const overdueTotal = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);

    const alerts = [];
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

  /* ── PRODUCTION ── */
  if (match(q, 'production', 'fabrication', 'ordre', 'atelier', 'bom', 'nomenclature')) {
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

  /* ── RÉPONSE GÉNÉRIQUE ── */
  const [empCount, prodCount, custCount] = await Promise.all([
    prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
    prisma.product.count({ where: { companyId } }),
    prisma.customer.count({ where: { companyId } }),
  ]);

  return `🤔 Je n'ai pas trouvé de correspondance précise pour votre question.

Voici ce que je sais interroger :
- 👥 **Employés** (${empCount} actifs) — "combien d'employés ?"
- 📦 **Stock** (${prodCount} produits) — "état du stock ?"
- 🤝 **Clients** (${custCount}) — "liste des clients ?"
- 📈 **Ventes & Factures** — "chiffre d'affaires ?"
- 💰 **Finance & Budget** — "situation financière ?"
- 🗂️ **Projets** — "avancement des projets ?"
- 🏖️ **Congés** — "demandes de congé ?"
- 🔧 **Maintenance** — "équipements en panne ?"
- 🚨 **Alertes** — "quelles sont les alertes ?"

Reformulez votre question en utilisant ces mots-clés.`;
}

router.post('/chat', authenticate, async (req, res, next) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages requis' });
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return res.json({ success: true, content: 'Comment puis-je vous aider ?' });

    const content = await generateResponse(lastUserMessage.content, req.companyId);
    res.json({ success: true, content });

  } catch (err) {
    next(err);
  }
});

export default router;
