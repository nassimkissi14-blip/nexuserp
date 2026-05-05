import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/kpis', authenticate, async (req, res, next) => {
  try {
    const { companyId } = req;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalCustomers, newCustomers,
      totalEmployees, activeEmployees,
      activeProjects, completedProjects,
      products,
      currentMonthOrders, lastMonthOrders,
      pendingLeaves,
    ] = await Promise.all([
      prisma.customer.count({ where: { companyId } }),
      prisma.customer.count({ where: { companyId, createdAt: { gte: startOfMonth } } }),
      prisma.employee.count({ where: { companyId } }),
      prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      prisma.project.count({ where: { companyId, status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { companyId, status: 'COMPLETED' } }),
      prisma.product.findMany({ where: { companyId, isActive: true }, select: { stockQty: true, minStockQty: true, buyPrice: true } }),
      prisma.order.findMany({ where: { companyId, orderDate: { gte: startOfMonth }, status: { not: 'CANCELLED' } }, select: { totalAmount: true, status: true } }),
      prisma.order.findMany({ where: { companyId, orderDate: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { not: 'CANCELLED' } }, select: { totalAmount: true } }),
      prisma.leaveRequest.count({ where: { employee: { companyId }, status: 'PENDING' } }),
    ]);

    const stockValue = products.reduce((sum, p) => sum + p.stockQty * p.buyPrice, 0);
    const lowStock = products.filter(p => p.stockQty <= p.minStockQty).length;

    const currentMonthRevenue = currentMonthOrders.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + o.totalAmount, 0);
    const lastMonthRevenue = lastMonthOrders.reduce((s, o) => s + o.totalAmount, 0);
    const growth = lastMonthRevenue > 0 ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0;

    // Sales evolution — last 6 months
    const salesEvolution = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthOrders = await prisma.order.findMany({
        where: { companyId, orderDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
        select: { totalAmount: true },
      });
      const total = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
      salesEvolution.push({
        month: start.toLocaleString('fr-FR', { month: 'short' }),
        amount: total,
        target: total * 1.15,
      });
    }

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { customer: { select: { name: true } } },
    });

    res.json({
      success: true,
      data: {
        sales: { currentMonth: currentMonthRevenue, lastMonth: lastMonthRevenue, growth, ordersCount: currentMonthOrders.length },
        customers: { total: totalCustomers, newThisMonth: newCustomers },
        employees: { total: totalEmployees, active: activeEmployees, pendingLeaves },
        stock: { value: stockValue, lowStockAlerts: lowStock },
        projects: { active: activeProjects, completed: completedProjects },
        charts: { salesEvolution, recentOrders },
      },
    });
  } catch (error) { next(error); }
});

/* ─── French translation helpers ──────────────────────────────── */
const FR_CONTRACT  = { CDI: 'CDI', CDD: 'CDD', INTERIM: 'Intérim', STAGE: 'Stage', FREELANCE: 'Freelance' };
const FR_LEAVE     = { ANNUAL: 'Congé annuel', SICK: 'Maladie', MATERNITY: 'Maternité', PATERNITY: 'Paternité', UNPAID: 'Sans solde', OTHER: 'Autre' };
const FR_PRIORITY  = { CRITICAL: 'Critique', HIGH: 'Haute', MEDIUM: 'Moyenne', LOW: 'Basse', URGENT: 'Urgent' };
const FR_EQUIP_TYPE = { MACHINE: 'Machine', VEHICLE: 'Véhicule', TOOL: 'Outil', INFRASTRUCTURE: 'Infrastructure', COMPUTER: 'Informatique', ELECTRICAL: 'Électrique', OTHER: 'Autre' };
const FR_REQ_TYPE  = { BREAKDOWN: 'Panne', PREVENTIVE: 'Préventif', CORRECTIVE: 'Correctif', INSPECTION: 'Inspection', IMPROVEMENT: 'Amélioration', OTHER: 'Autre' };
const FR_ROLE      = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', DIRECTOR: 'Directeur', MANAGER: 'Manager', OPERATOR: 'Opérateur' };
const FR_MVT_TYPE  = { IN: 'Entrée', OUT: 'Sortie', ADJUSTMENT: 'Ajustement', TRANSFER: 'Transfert', RETURN: 'Retour' };
const FR_PRIORITY_PROJ = { CRITICAL: 'Critique', HIGH: 'Haute', MEDIUM: 'Moyenne', LOW: 'Basse' };
const fr = (map, val) => map[val] || val;

/* ─── Dept-specific stats ──────────────────────────────────────── */
router.get('/dept-stats', authenticate, async (req, res, next) => {
  try {
    const { companyId } = req;
    // Allow admin/director to query any dept via ?dept= param
    const deptParam = req.query.dept ? req.query.dept.toLowerCase().trim() : null;
    const raw = deptParam || (req.user.department || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const now = new Date();
    const som = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── RH ──────────────────────────────────────────────────────────
    if (['rh', 'ressources humaines'].includes(raw)) {
      const [totalEmp, activeEmp, onLeave, pendingLeaves, newHires, allEmployees, recentLeaves] = await Promise.all([
        prisma.employee.count({ where: { companyId } }),
        prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
        prisma.employee.count({ where: { companyId, status: 'ON_LEAVE' } }),
        prisma.leaveRequest.count({ where: { employee: { companyId }, status: 'PENDING' } }),
        prisma.employee.count({ where: { companyId, hireDate: { gte: som } } }),
        prisma.employee.findMany({
          where: { companyId },
          orderBy: { lastName: 'asc' },
          select: { id: true, firstName: true, lastName: true, position: true, department: true, hireDate: true, contractType: true, status: true },
        }),
        prisma.leaveRequest.findMany({
          where: { employee: { companyId } },
          orderBy: { createdAt: 'desc' }, take: 12,
          include: { employee: { select: { firstName: true, lastName: true, department: true } } },
        }),
      ]);
      return res.json({ success: true, data: {
        dept: 'rh',
        kpis: [
          { label: 'Employés total', value: totalEmp, icon: '👥', color: '#6366f1' },
          { label: 'Actifs', value: activeEmp, icon: '✅', color: '#10b981' },
          { label: 'En congé', value: onLeave, icon: '🏖️', color: '#f59e0b' },
          { label: 'Congés à valider', value: pendingLeaves, icon: '📋', color: '#ef4444', alert: pendingLeaves > 0 },
          { label: 'Embauches ce mois', value: newHires, icon: '🆕', color: '#8b5cf6' },
        ],
        title: 'Employés',
        headers: ['Nom', 'Poste', 'Département', 'Contrat', 'Embauche', 'Statut'],
        rows: allEmployees.map(e => ({
          id: e.id,
          col1: `${e.firstName} ${e.lastName}`,
          col2: e.position,
          col3: e.department || '—',
          col4: fr(FR_CONTRACT, e.contractType),
          col5: new Date(e.hireDate).toLocaleDateString('fr-FR'),
          status: e.status,
        })),
        title2: 'Demandes de congé',
        headers2: ['Employé', 'Département', 'Type', 'Période', 'Jours', 'Statut'],
        rows2: recentLeaves.map(l => ({
          id: l.id,
          col1: `${l.employee.firstName} ${l.employee.lastName}`,
          col2: l.employee.department || '—',
          col3: fr(FR_LEAVE, l.type),
          col4: `${new Date(l.startDate).toLocaleDateString('fr-FR')} → ${new Date(l.endDate).toLocaleDateString('fr-FR')}`,
          col5: l.days + ' j',
          status: l.status,
        })),
      }});
    }

    // ── CRM / COMMERCIAL ────────────────────────────────────────────
    if (['commercial', 'crm', 'ventes', 'crm & ventes'].includes(raw)) {
      const [totalCust, newCust, monthOrders, openQuotes, recentOrders, recentQuotes] = await Promise.all([
        prisma.customer.count({ where: { companyId } }),
        prisma.customer.count({ where: { companyId, createdAt: { gte: som } } }),
        prisma.order.findMany({ where: { companyId, createdAt: { gte: som }, status: { not: 'CANCELLED' } }, select: { totalAmount: true } }),
        prisma.quote.count({ where: { companyId, status: 'SENT' } }),
        prisma.order.findMany({
          where: { companyId }, orderBy: { createdAt: 'desc' }, take: 10,
          include: { customer: { select: { name: true } } },
        }),
        prisma.quote.findMany({
          where: { companyId }, orderBy: { createdAt: 'desc' }, take: 8,
          include: { customer: { select: { name: true } } },
        }),
      ]);
      const monthRevenue = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
      return res.json({ success: true, data: {
        dept: 'crm',
        kpis: [
          { label: 'Total clients', value: totalCust, icon: '🏢', color: '#6366f1' },
          { label: 'Nouveaux ce mois', value: newCust, icon: '✨', color: '#10b981' },
          { label: 'Commandes ce mois', value: monthOrders.length, icon: '🛒', color: '#8b5cf6' },
          { label: 'CA ce mois (DA)', value: monthRevenue, icon: '💰', color: '#f59e0b', formatter: 'dzd' },
          { label: 'Devis envoyés', value: openQuotes, icon: '📄', color: '#3b82f6' },
        ],
        title: 'Dernières commandes',
        headers: ['Client', 'Référence', 'Date', 'Montant', 'Statut'],
        rows: recentOrders.map(o => ({
          id: o.id,
          col1: o.customer?.name || '—',
          col2: o.reference,
          col3: new Date(o.orderDate || o.createdAt).toLocaleDateString('fr-FR'),
          col4: o.totalAmount.toLocaleString('fr-DZ') + ' DA',
          status: o.status,
        })),
        title2: 'Devis récents',
        headers2: ['Client', 'Référence', 'Date', 'Montant', 'Statut'],
        rows2: recentQuotes.map(q => ({
          id: q.id,
          col1: q.customer?.name || '—',
          col2: q.reference,
          col3: new Date(q.issueDate).toLocaleDateString('fr-FR'),
          col4: q.totalAmount.toLocaleString('fr-DZ') + ' DA',
          status: q.status,
        })),
      }});
    }

    // ── FINANCE ──────────────────────────────────────────────────────
    if (['finance', 'comptabilite'].includes(raw)) {
      const [invoices, recentInvoices, budgets] = await Promise.all([
        prisma.invoice.findMany({ where: { companyId }, select: { totalAmount: true, status: true } }),
        prisma.invoice.findMany({
          where: { companyId }, orderBy: { createdAt: 'desc' }, take: 10,
          include: { customer: { select: { name: true } } },
        }),
        prisma.budgetLine.findMany({ where: { companyId, year: now.getFullYear() }, select: { budgeted: true, actual: true, type: true } }),
      ]);
      const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
      const paid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0);
      const unpaid = invoices.filter(i => i.status === 'SENT').reduce((s, i) => s + i.totalAmount, 0);
      const overdue = invoices.filter(i => i.status === 'OVERDUE').length;
      const budgeted = budgets.filter(b => b.type === 'EXPENSE').reduce((s, b) => s + b.budgeted, 0);
      const actual = budgets.filter(b => b.type === 'EXPENSE').reduce((s, b) => s + b.actual, 0);
      return res.json({ success: true, data: {
        dept: 'finance',
        kpis: [
          { label: 'Total facturé', value: totalInvoiced, icon: '📄', color: '#6366f1', formatter: 'dzd' },
          { label: 'Encaissé', value: paid, icon: '✅', color: '#10b981', formatter: 'dzd' },
          { label: 'En attente', value: unpaid, icon: '⏳', color: '#f59e0b', formatter: 'dzd' },
          { label: 'Factures en retard', value: overdue, icon: '⚠️', color: '#ef4444', alert: overdue > 0 },
          { label: 'Budget consommé', value: budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0, icon: '📊', color: '#8b5cf6', formatter: 'pct' },
        ],
        title: 'Dernières factures',
        headers: ['Client', 'Référence', 'Échéance', 'Montant', 'Statut'],
        rows: recentInvoices.map(inv => ({
          id: inv.id,
          col1: inv.customer?.name || '—',
          col2: inv.reference,
          col3: new Date(inv.dueDate).toLocaleDateString('fr-FR'),
          col4: inv.totalAmount.toLocaleString('fr-DZ') + ' DA',
          status: inv.status,
        })),
      }});
    }

    // ── PRODUCTION ───────────────────────────────────────────────────
    if (raw === 'production') {
      const [total, inProgress, completedM, recentOrders] = await Promise.all([
        prisma.productionOrder.count({ where: { companyId } }),
        prisma.productionOrder.count({ where: { companyId, status: 'IN_PROGRESS' } }),
        prisma.productionOrder.count({ where: { companyId, status: 'COMPLETED', updatedAt: { gte: som } } }),
        prisma.productionOrder.findMany({
          where: { companyId }, orderBy: { createdAt: 'desc' }, take: 12,
          include: { product: { select: { name: true } } },
        }),
      ]);
      const done = recentOrders.filter(o => o.status === 'COMPLETED' && o.quantity > 0);
      const avgEff = done.length > 0
        ? Math.round(done.reduce((s, o) => s + (o.producedQty / o.quantity), 0) / done.length * 100)
        : 0;
      return res.json({ success: true, data: {
        dept: 'production',
        kpis: [
          { label: 'Ordres total', value: total, icon: '🏭', color: '#6366f1' },
          { label: 'En cours', value: inProgress, icon: '⚙️', color: '#f59e0b' },
          { label: 'Terminés ce mois', value: completedM, icon: '✅', color: '#10b981' },
          { label: 'Efficacité moy.', value: avgEff, icon: '🎯', color: '#8b5cf6', formatter: 'pct' },
        ],
        title: 'Ordres de production',
        headers: ['Produit', 'N° Ordre', 'Qté planifiée', 'Qté produite', 'Fin prévue', 'Statut'],
        rows: recentOrders.map(o => ({
          id: o.id,
          col1: o.product?.name || '—',
          col2: o.number,
          col3: o.quantity + ' ' + o.unit,
          col4: o.producedQty + ' / ' + o.quantity,
          col5: o.plannedEnd ? new Date(o.plannedEnd).toLocaleDateString('fr-FR') : '—',
          status: o.status,
        })),
      }});
    }

    // ── MAINTENANCE ──────────────────────────────────────────────────
    if (raw === 'maintenance') {
      const [totalEquip, downEquip, openReq, openOT, allEquipment, recentReq] = await Promise.all([
        prisma.equipment.count({ where: { companyId } }),
        prisma.equipment.count({ where: { companyId, status: { in: ['DOWN', 'MAINTENANCE'] } } }),
        prisma.maintenanceRequest.count({ where: { companyId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.maintenanceOrder.count({ where: { companyId, status: { in: ['PLANNED', 'IN_PROGRESS'] } } }),
        prisma.equipment.findMany({
          where: { companyId }, orderBy: { name: 'asc' },
        }),
        prisma.maintenanceRequest.findMany({
          where: { companyId }, orderBy: { createdAt: 'desc' }, take: 10,
          include: { equipment: { select: { name: true, code: true } } },
        }),
      ]);
      return res.json({ success: true, data: {
        dept: 'maintenance',
        kpis: [
          { label: 'Équipements', value: totalEquip, icon: '⚙️', color: '#6366f1' },
          { label: 'En panne / maintenance', value: downEquip, icon: '🔴', color: '#ef4444', alert: downEquip > 0 },
          { label: 'Demandes ouvertes', value: openReq, icon: '📋', color: '#f59e0b' },
          { label: 'OT en cours', value: openOT, icon: '🔧', color: '#8b5cf6' },
        ],
        title: 'Équipements',
        headers: ['Code', 'Nom', 'Type', 'Emplacement', 'Dernière maintenance', 'Statut'],
        rows: allEquipment.map(e => ({
          id: e.id,
          col1: e.code,
          col2: e.name,
          col3: fr(FR_EQUIP_TYPE, e.type) || '—',
          col4: e.location || '—',
          col5: e.lastMaintenance ? new Date(e.lastMaintenance).toLocaleDateString('fr-FR') : '—',
          status: e.status,
        })),
        title2: 'Demandes de maintenance',
        headers2: ['Équipement', 'Titre', 'Type', 'Priorité', 'Signalé le', 'Statut'],
        rows2: recentReq.map(r => ({
          id: r.id,
          col1: r.equipment?.name || '—',
          col2: r.title,
          col3: fr(FR_REQ_TYPE, r.type),
          col4: fr(FR_PRIORITY, r.priority),
          col5: new Date(r.reportedAt).toLocaleDateString('fr-FR'),
          status: r.status,
        })),
      }});
    }

    // ── STOCK / ACHATS / LOGISTIQUE ──────────────────────────────────
    if (['stock', 'logistique', 'achats', 'stock / logistique'].includes(raw)) {
      const [products, movements] = await Promise.all([
        prisma.product.findMany({ where: { companyId, isActive: true }, select: { name: true, sku: true, stockQty: true, minStockQty: true, buyPrice: true }, orderBy: { name: 'asc' } }),
        prisma.stockMovement.findMany({
          where: { companyId }, orderBy: { createdAt: 'desc' }, take: 12,
          include: { product: { select: { name: true } } },
        }),
      ]);
      const totalValue = products.reduce((s, p) => s + p.stockQty * p.buyPrice, 0);
      const lowStock = products.filter(p => p.stockQty <= p.minStockQty);
      const inMvt = movements.filter(m => m.type === 'IN').length;
      const outMvt = movements.filter(m => m.type === 'OUT').length;
      // Compute per-product status for donut (total = all active products = KPI)
      const productRows = products.map(p => ({
        id: p.sku,
        col1: p.name,
        col2: p.sku,
        col3: String(p.stockQty),
        col4: String(p.minStockQty),
        col5: (p.stockQty * p.buyPrice).toLocaleString('fr-DZ') + ' DA',
        status: p.stockQty === 0 ? 'RUPTURE' : p.stockQty <= p.minStockQty ? 'LOW' : 'ACTIVE',
      }));
      return res.json({ success: true, data: {
        dept: 'stock',
        kpis: [
          { label: 'Produits actifs', value: products.length, icon: '📦', color: '#6366f1' },
          { label: 'Valeur stock', value: totalValue, icon: '💰', color: '#10b981', formatter: 'dzd' },
          { label: 'Alertes rupture', value: lowStock.length, icon: '⚠️', color: '#ef4444', alert: lowStock.length > 0 },
          { label: 'Entrées (total)', value: inMvt, icon: '📥', color: '#8b5cf6' },
          { label: 'Sorties (total)', value: outMvt, icon: '📤', color: '#f59e0b' },
        ],
        title: 'Produits',
        headers: ['Produit', 'SKU', 'Stock actuel', 'Stock min', 'Valeur', 'Statut'],
        rows: productRows,
        title2: 'Derniers mouvements de stock',
        headers2: ['Produit', 'Type', 'Quantité', 'Référence', 'Date', ''],
        rows2: movements.map(m => ({
          id: m.id,
          col1: m.product?.name || '—',
          col2: fr(FR_MVT_TYPE, m.type),
          col3: String(m.quantity),
          col4: m.reference || '—',
          col5: new Date(m.createdAt).toLocaleDateString('fr-FR'),
          status: m.type,
        })),
      }});
    }

    // ── PROJETS ──────────────────────────────────────────────────────
    if (raw === 'projets') {
      const [activePrj, completedPrj, openTasks, overdueTasks, recentProjects] = await Promise.all([
        prisma.project.count({ where: { companyId, status: 'IN_PROGRESS' } }),
        prisma.project.count({ where: { companyId, status: 'COMPLETED' } }),
        prisma.task.count({ where: { project: { companyId }, status: { not: 'DONE' } } }),
        prisma.task.count({ where: { project: { companyId }, status: { not: 'DONE' }, dueDate: { lt: now } } }),
        prisma.project.findMany({ where: { companyId }, orderBy: { updatedAt: 'desc' }, take: 12 }),
      ]);
      return res.json({ success: true, data: {
        dept: 'projets',
        kpis: [
          { label: 'Projets actifs', value: activePrj, icon: '🗂️', color: '#6366f1' },
          { label: 'Projets terminés', value: completedPrj, icon: '✅', color: '#10b981' },
          { label: 'Tâches ouvertes', value: openTasks, icon: '📌', color: '#8b5cf6' },
          { label: 'Tâches en retard', value: overdueTasks, icon: '⚠️', color: '#ef4444', alert: overdueTasks > 0 },
        ],
        title: 'Projets',
        headers: ['Nom', 'Priorité', 'Avancement', 'Échéance', 'Budget', 'Statut'],
        rows: recentProjects.map(p => ({
          id: p.id,
          col1: p.name,
          col2: fr(FR_PRIORITY_PROJ, p.priority),
          col3: p.progress + '%',
          col4: p.endDate ? new Date(p.endDate).toLocaleDateString('fr-FR') : '—',
          col5: p.budget ? p.budget.toLocaleString('fr-DZ') + ' DA' : '—',
          status: p.status,
        })),
      }});
    }

    // ── IT / INFORMATIQUE ────────────────────────────────────────────
    if (['it', 'informatique'].includes(raw)) {
      const [totalUsers, activeUsers, enabledModules, recentUsers] = await Promise.all([
        prisma.user.count({ where: { companyId } }),
        prisma.user.count({ where: { companyId, isActive: true } }),
        prisma.companyModule.count({ where: { companyId, enabled: true } }),
        prisma.user.findMany({
          where: { companyId }, orderBy: { createdAt: 'desc' }, take: 10,
          select: { id: true, firstName: true, lastName: true, email: true, role: true, department: true, isActive: true, createdAt: true },
        }),
      ]);
      return res.json({ success: true, data: {
        dept: 'it',
        kpis: [
          { label: 'Utilisateurs', value: totalUsers, icon: '👤', color: '#6366f1' },
          { label: 'Actifs', value: activeUsers, icon: '🟢', color: '#10b981' },
          { label: 'Modules activés', value: enabledModules, icon: '🧩', color: '#8b5cf6' },
        ],
        title: 'Utilisateurs du système',
        headers: ['Nom', 'Email', 'Rôle', 'Département', 'Créé le', 'Statut'],
        rows: recentUsers.map(u => ({
          id: u.id,
          col1: `${u.firstName} ${u.lastName}`,
          col2: u.email,
          col3: fr(FR_ROLE, u.role),
          col4: u.department || '—',
          col5: new Date(u.createdAt).toLocaleDateString('fr-FR'),
          status: u.isActive ? 'ACTIVE' : 'INACTIVE',
        })),
      }});
    }

    // ── COMMUNICATION ────────────────────────────────────────────────
    if (raw === 'communication') {
      const [totalMsg, unreadMsg, recentMessages] = await Promise.all([
        prisma.message.count({ where: { receiver: { companyId } } }),
        prisma.message.count({ where: { receiver: { companyId }, isRead: false } }),
        prisma.message.findMany({
          where: { OR: [{ sender: { companyId } }, { receiver: { companyId } }] },
          orderBy: { createdAt: 'desc' }, take: 12,
          include: {
            sender:   { select: { firstName: true, lastName: true } },
            receiver: { select: { firstName: true, lastName: true } },
          },
        }),
      ]);
      return res.json({ success: true, data: {
        dept: 'communication',
        kpis: [
          { label: 'Messages reçus', value: totalMsg, icon: '💬', color: '#6366f1' },
          { label: 'Non lus', value: unreadMsg, icon: '🔔', color: '#ef4444', alert: unreadMsg > 0 },
        ],
        title: 'Messages récents',
        headers: ['De', 'À', 'Message', 'Date', '', 'Statut'],
        rows: recentMessages.map(m => ({
          id: m.id,
          col1: `${m.sender.firstName} ${m.sender.lastName}`,
          col2: `${m.receiver.firstName} ${m.receiver.lastName}`,
          col3: m.content.slice(0, 50) + (m.content.length > 50 ? '…' : ''),
          col4: new Date(m.createdAt).toLocaleDateString('fr-FR'),
          status: m.isRead ? 'DONE' : 'PENDING',
        })),
      }});
    }

    // ── Direction / fallback → indique au frontend d'afficher le dashboard complet
    return res.json({ success: true, data: { dept: 'direction' } });
  } catch (error) { next(error); }
});

export default router;
