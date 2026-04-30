/**
 * NexusERP — Elite Analytics API v2
 * Enterprise BI: sparklines, anomaly detection, drill-down, cross-filter support.
 */
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

/* ─── pure helpers ──────────────────────────────────────────────── */
const mStart = (y, m) => new Date(y, m, 1);
const mEnd   = (y, m) => new Date(y, m + 1, 0, 23, 59, 59);
const mLabel = (y, m) => new Date(y, m, 1).toLocaleString('fr-FR', { month: 'short', year: '2-digit' });
const dLabel = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

/* ─── z-score anomaly detection ────────────────────────────────── */
function detectAnomalies(series, valueKey, threshold = 2) {
  const vals = series.map(s => s[valueKey] || 0);
  const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  const std  = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length || 1));
  return series.map(s => ({
    ...s,
    anomaly: std > 0 && Math.abs((s[valueKey] - mean) / std) > threshold,
    zScore:  std > 0 ? Math.round(((s[valueKey] - mean) / std) * 100) / 100 : 0,
  }));
}

/* ═══════════════════════════════════════════════════════════════════
   GET /analytics/overview  — master BI payload
═══════════════════════════════════════════════════════════════════ */
router.get('/overview', async (req, res, next) => {
  try {
    const { companyId } = req;
    const now  = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth();

    /* ── Window boundaries ── */
    const thisMonthStart  = mStart(curY, curM);
    const lastMonthStart  = mStart(curY, curM - 1);
    const lastMonthEnd    = mEnd(curY, curM - 1);
    const sixMonthsAgo    = mStart(curY, curM - 5);
    const thirtyDaysAgo   = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 29);

    /* ══════════════════════════════════════
       BLOCK A — parallel KPI aggregations
    ══════════════════════════════════════ */
    const [
      curOrders, prevOrders,
      totalEmp, totalCust, newCust,
      allProducts, pendingLeaves,
      prodOrders,
      allEquipment, openMaintReqs, completedMaintOrders,
      activeProjects, unpaidInvoices,
    ] = await Promise.all([
      prisma.order.findMany({ where: { companyId, orderDate: { gte: thisMonthStart }, status: { not: 'CANCELLED' } }, select: { totalAmount: true, status: true } }),
      prisma.order.findMany({ where: { companyId, orderDate: { gte: lastMonthStart, lte: lastMonthEnd }, status: { not: 'CANCELLED' } }, select: { totalAmount: true } }),
      prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      prisma.customer.count({ where: { companyId } }),
      prisma.customer.count({ where: { companyId, createdAt: { gte: thisMonthStart } } }),
      prisma.product.findMany({ where: { companyId, isActive: true }, select: { id: true, name: true, stockQty: true, minStockQty: true, buyPrice: true, sellPrice: true, category: true } }),
      prisma.leaveRequest.count({ where: { employee: { companyId }, status: 'PENDING' } }),
      prisma.productionOrder.findMany({ where: { companyId }, select: { id: true, status: true, quantity: true, producedQty: true, materialCost: true, laborCost: true, machineCost: true, plannedEnd: true, createdAt: true } }),
      prisma.equipment.findMany({ where: { companyId }, select: { id: true, name: true, status: true, type: true } }),
      prisma.maintenanceRequest.count({ where: { companyId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.maintenanceOrder.findMany({ where: { companyId, status: 'COMPLETED' }, select: { laborCost: true, partsCost: true, actualHours: true, updatedAt: true } }),
      prisma.project.count({ where: { companyId, status: 'IN_PROGRESS' } }),
      prisma.invoice.findMany({ where: { companyId, status: { in: ['SENT', 'OVERDUE'] } }, select: { totalAmount: true, status: true } }),
    ]);

    /* ── KPI math ── */
    const revenue      = curOrders.reduce((s, o) => s + o.totalAmount, 0);
    const revenuePrev  = prevOrders.reduce((s, o) => s + o.totalAmount, 0);
    const revGrowth    = revenuePrev > 0 ? +((( revenue - revenuePrev) / revenuePrev) * 100).toFixed(1) : 0;
    const stockValue   = allProducts.reduce((s, p) => s + p.stockQty * p.buyPrice, 0);
    const lowStockCount= allProducts.filter(p => p.stockQty <= p.minStockQty).length;
    const prodOutput   = prodOrders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + (o.producedQty || 0), 0);
    const prodCompleted= prodOrders.filter(o => o.status === 'COMPLETED');
    const prodEfficiency = prodCompleted.length > 0
      ? +(prodCompleted.reduce((s, o) => s + (o.quantity > 0 ? o.producedQty / o.quantity : 0), 0) / prodCompleted.length * 100).toFixed(1)
      : 0;
    const downEquip    = allEquipment.filter(e => e.status === 'DOWN').length;
    const availability = allEquipment.length > 0 ? +(((allEquipment.length - downEquip) / allEquipment.length) * 100).toFixed(1) : 100;
    const maintCost    = completedMaintOrders.reduce((s, o) => s + (o.laborCost || 0) + (o.partsCost || 0), 0);
    const unpaidAmt    = unpaidInvoices.reduce((s, i) => s + i.totalAmount, 0);
    const overdueCount = unpaidInvoices.filter(i => i.status === 'OVERDUE').length;
    const prodCostTotal= prodOrders.reduce((s, o) => s + (o.materialCost || 0) + (o.laborCost || 0) + (o.machineCost || 0), 0);

    /* ══════════════════════════════════════
       BLOCK B — 30-day daily sparklines
    ══════════════════════════════════════ */
    const sparklines = {};
    // Revenue sparkline — last 30 days
    const sparkRevData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dEnd   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      const dayOrders = await prisma.order.aggregate({
        where: { companyId, orderDate: { gte: dStart, lte: dEnd }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      });
      sparkRevData.push({ d: i, v: Math.round(dayOrders._sum.totalAmount || 0) });
    }
    sparklines.revenue = sparkRevData;

    // Production sparkline — last 30 days produced qty
    const sparkProdData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dEnd   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      const dayProd = await prisma.productionOrder.aggregate({
        where: { companyId, status: 'COMPLETED', updatedAt: { gte: dStart, lte: dEnd } },
        _sum: { producedQty: true },
      });
      sparkProdData.push({ d: i, v: Math.round(dayProd._sum.producedQty || 0) });
    }
    sparklines.production = sparkProdData;

    /* ══════════════════════════════════════
       BLOCK C — 6-month trend series
    ══════════════════════════════════════ */
    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const start = mStart(curY, curM - i);
      const end   = mEnd(curY, curM - i);
      const [deliv, allOrd, payroll] = await Promise.all([
        prisma.order.aggregate({ where: { companyId, orderDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true } }),
        prisma.order.aggregate({ where: { companyId, orderDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true }, _count: true }),
        prisma.payroll.aggregate({ where: { companyId, paidAt: { gte: start, lte: end } }, _sum: { netSalary: true } }),
      ]);
      const rev  = Math.round(deliv._sum.totalAmount || 0);
      const cost = Math.round(payroll._sum.netSalary || 0);
      revenueTrend.push({
        month:   mLabel(curY, curM - i),
        revenue: rev,
        cost,
        profit:  rev - cost,
        orders:  allOrd._count,
        gmv:     Math.round(allOrd._sum.totalAmount || 0),
      });
    }

    /* ── production trend ── */
    const productionTrend = [];
    for (let i = 5; i >= 0; i--) {
      const start = mStart(curY, curM - i);
      const end   = mEnd(curY, curM - i);
      const orders = await prisma.productionOrder.findMany({
        where: { companyId, createdAt: { gte: start, lte: end } },
        select: { status: true, quantity: true, producedQty: true },
      });
      const planned  = orders.reduce((s, o) => s + (o.quantity || 0), 0);
      const produced = orders.reduce((s, o) => s + (o.producedQty || 0), 0);
      productionTrend.push({
        month:      mLabel(curY, curM - i),
        planned,
        produced,
        completed:  orders.filter(o => o.status === 'COMPLETED').length,
        efficiency: planned > 0 ? +(produced / planned * 100).toFixed(1) : 0,
        downtime:   orders.filter(o => o.status === 'PAUSED').length * 8, // est. hours
      });
    }

    /* ── stacked orders-by-status per month ── */
    const ORDER_STATUSES = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const stackedOrders = [];
    for (let i = 5; i >= 0; i--) {
      const start = mStart(curY, curM - i);
      const end   = mEnd(curY, curM - i);
      const row = { month: mLabel(curY, curM - i) };
      for (const st of ORDER_STATUSES) {
        const cnt = await prisma.order.count({ where: { companyId, orderDate: { gte: start, lte: end }, status: st } });
        row[st] = cnt;
      }
      stackedOrders.push(row);
    }

    /* ══════════════════════════════════════
       BLOCK D — group-by aggregations
    ══════════════════════════════════════ */
    /* Orders by status */
    const statusGroups = await prisma.order.groupBy({
      by: ['status'], where: { companyId }, _count: { id: true },
    });
    const ordersByStatus = statusGroups.map(g => ({ name: g.status, value: g._count.id }));

    /* Top customers */
    const custGroups = await prisma.order.groupBy({
      by: ['customerId'], where: { companyId, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true }, _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } }, take: 8,
    });
    const custObjs = await prisma.customer.findMany({
      where: { id: { in: custGroups.map(c => c.customerId) } }, select: { id: true, name: true },
    });
    const custMap = Object.fromEntries(custObjs.map(c => [c.id, c.name]));
    const topCustomers = custGroups.map(c => ({
      name:    (custMap[c.customerId] || 'Inconnu').slice(0, 18),
      revenue: Math.round(c._sum.totalAmount || 0),
      orders:  c._count.id,
    }));

    /* Production by product */
    const ppGroups = await prisma.productionOrder.groupBy({
      by: ['productId'], where: { companyId, status: 'COMPLETED' },
      _sum: { producedQty: true, quantity: true }, _count: { id: true },
      orderBy: { _sum: { producedQty: 'desc' } }, take: 8,
    });
    const ppObjs = await prisma.product.findMany({
      where: { id: { in: ppGroups.map(p => p.productId) } }, select: { id: true, name: true },
    });
    const ppMap = Object.fromEntries(ppObjs.map(p => [p.id, p.name]));
    const productionByProduct = ppGroups.map(p => ({
      name:       (ppMap[p.productId] || 'Produit').slice(0, 14),
      produced:   p._sum.producedQty || 0,
      planned:    p._sum.quantity    || 0,
      orders:     p._count.id,
      efficiency: (p._sum.quantity || 0) > 0 ? +(((p._sum.producedQty || 0) / p._sum.quantity) * 100).toFixed(1) : 0,
    }));

    /* Inventory */
    const inventoryLevels = [...allProducts]
      .sort((a, b) => b.stockQty * b.buyPrice - a.stockQty * a.buyPrice)
      .slice(0, 8)
      .map(p => ({ name: p.name.slice(0, 14), stock: p.stockQty, min: p.minStockQty, value: Math.round(p.stockQty * p.buyPrice), alert: p.stockQty <= p.minStockQty }));

    /* Inventory trend */
    const inventoryTrend = [];
    for (let i = 5; i >= 0; i--) {
      const start = mStart(curY, curM - i);
      const end   = mEnd(curY, curM - i);
      const [inAgg, outAgg] = await Promise.all([
        prisma.stockMovement.aggregate({ where: { companyId, type: 'IN',  createdAt: { gte: start, lte: end } }, _sum: { quantity: true } }),
        prisma.stockMovement.aggregate({ where: { companyId, type: 'OUT', createdAt: { gte: start, lte: end } }, _sum: { quantity: true } }),
      ]);
      inventoryTrend.push({
        month:   mLabel(curY, curM - i),
        entrees: inAgg._sum.quantity  || 0,
        sorties: outAgg._sum.quantity || 0,
        net:    (inAgg._sum.quantity || 0) - (outAgg._sum.quantity || 0),
      });
    }

    /* Cost distribution */
    const [payrollAgg, maintCostAgg] = await Promise.all([
      prisma.payroll.aggregate({ where: { companyId, paidAt: { gte: sixMonthsAgo } }, _sum: { netSalary: true } }),
      prisma.maintenanceOrder.aggregate({ where: { companyId }, _sum: { laborCost: true, partsCost: true } }),
    ]);
    const costDistribution = [
      { name: 'Masse salariale', value: Math.round(payrollAgg._sum.netSalary || 0),    color: '#6366f1' },
      { name: 'Production',      value: Math.round(prodCostTotal),                      color: '#f59e0b' },
      { name: 'Maintenance',     value: Math.round((maintCostAgg._sum.laborCost || 0) + (maintCostAgg._sum.partsCost || 0)), color: '#ef4444' },
    ].filter(c => c.value > 0);
    if (!costDistribution.length) costDistribution.push({ name: 'Aucun coût enregistré', value: 1, color: '#334155' });

    /* Production by status */
    const productionByStatus = [
      { name: 'Terminé',  value: prodOrders.filter(o => o.status === 'COMPLETED').length,   color: '#10b981' },
      { name: 'En cours', value: prodOrders.filter(o => o.status === 'IN_PROGRESS').length, color: '#f59e0b' },
      { name: 'Planifié', value: prodOrders.filter(o => o.status === 'PLANNED').length,     color: '#6366f1' },
      { name: 'Suspendu', value: prodOrders.filter(o => o.status === 'PAUSED').length,      color: '#ef4444' },
    ].filter(d => d.value > 0);

    /* ══════════════════════════════════════
       BLOCK E — Heatmap (maintenance logs)
    ══════════════════════════════════════ */
    const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const HOURS   = [6, 8, 10, 12, 14, 16, 18, 20];
    const recentLogs = await prisma.maintenanceLog.findMany({
      where: { companyId, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      select: { createdAt: true },
    });
    const heatmapData = DAYS_FR.flatMap((day, di) =>
      HOURS.map(hour => ({
        day, hour: `${hour}h`,
        value: recentLogs.filter(l => {
          const d = new Date(l.createdAt);
          return (d.getDay() + 6) % 7 === di && d.getHours() === hour;
        }).length,
      }))
    );

    /* ══════════════════════════════════════
       BLOCK F — Anomaly detection on revenue
    ══════════════════════════════════════ */
    const revWithAnomalies = detectAnomalies(revenueTrend, 'revenue', 1.8);
    const prodWithAnomalies = detectAnomalies(productionTrend, 'produced', 1.8);

    /* ══════════════════════════════════════
       BLOCK G — Recent orders (table)
    ══════════════════════════════════════ */
    const recentOrders = await prisma.order.findMany({
      where: { companyId }, orderBy: { createdAt: 'desc' }, take: 8,
      select: { id: true, reference: true, status: true, totalAmount: true, createdAt: true, customer: { select: { name: true } } },
    });

    /* ── build sparkline revenue prev vs cur month ── */
    const sparkRevenue = sparklines.revenue;
    const sparkProd    = sparklines.production;

    /* ── maintenance cost sparkline (monthly) ── */
    const sparkMaintCost = revenueTrend.map(r => ({ d: r.month, v: Math.round(maintCost / 6) }));

    /* ── efficiency sparkline from production trend ── */
    const sparkEfficiency = productionTrend.map(r => ({ d: r.month, v: r.efficiency }));

    res.json({
      success: true,
      data: {
        kpis: {
          revenue:      { value: Math.round(revenue),       growth: revGrowth,    label: 'Chiffre d\'affaires',  spark: sparkRevenue },
          orders:       { value: curOrders.length,           growth: 0,            label: 'Commandes (mois)',      spark: [] },
          employees:    { value: totalEmp,                   growth: 0,            label: 'Employés actifs',       spark: [] },
          customers:    { value: totalCust,                  growth: 0,            label: 'Clients',               spark: [] },
          production:   { value: prodOutput,                growth: 0,            label: 'Unités produites',      spark: sparkProd },
          efficiency:   { value: prodEfficiency,            growth: 0,            label: 'Efficacité prod.',      spark: sparkEfficiency },
          availability: { value: availability,              growth: 0,            label: 'Dispo. machines',       spark: [] },
          maintCost:    { value: Math.round(maintCost),     growth: 0,            label: 'Coût maintenance',      spark: sparkMaintCost },
          stockValue:   { value: Math.round(stockValue),    growth: 0,            label: 'Valeur stock',           spark: [] },
          unpaid:       { value: Math.round(unpaidAmt),     growth: overdueCount, label: 'Factures impayées',     spark: [] },
        },
        charts: {
          revenueTrend:        revWithAnomalies,
          productionTrend:     prodWithAnomalies,
          stackedOrders,
          ordersByStatus,
          topCustomers,
          productionByProduct,
          inventoryLevels,
          inventoryTrend,
          costDistribution,
          productionByStatus,
          heatmapData,
        },
        meta: { downEquip, lowStockCount, pendingLeaves, overdueInvoices: overdueCount, openMaintenanceRequests: openMaintReqs, activeProjects },
        recentOrders,
      },
    });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════════════════════════════
   GET /analytics/drilldown/:entity/:id
   Returns detail rows for click-through.
════════════════════════════════════════════════════════════════ */
router.get('/drilldown/customer/:id', async (req, res, next) => {
  try {
    const { companyId } = req;
    const { id } = req.params;
    const orders = await prisma.order.findMany({
      where: { companyId, customerId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, orderNumber: true, status: true, totalAmount: true, orderDate: true, createdAt: true },
    });
    const customer = await prisma.customer.findUnique({ where: { id }, select: { name: true, email: true, phone: true, city: true } });
    res.json({ success: true, data: { customer, orders } });
  } catch (err) { next(err); }
});

router.get('/drilldown/production/:status', async (req, res, next) => {
  try {
    const { companyId } = req;
    const { status } = req.params;
    const orders = await prisma.productionOrder.findMany({
      where: { companyId, ...(status !== 'ALL' && { status }) },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { product: { select: { name: true } } },
    });
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════════════════════════════
   GET /analytics/finance-summary
   Real P&L, cashflow, aging and balance from live data.
════════════════════════════════════════════════════════════════ */
router.get('/finance-summary', async (req, res, next) => {
  try {
    const { companyId } = req;
    const now   = new Date();
    const curY  = now.getFullYear();
    const yr0   = new Date(curY, 0, 1);

    /* ── Monthly revenue from PAID invoices ── */
    const paidInvoices = await prisma.invoice.findMany({
      where: { companyId, issueDate: { gte: yr0 }, status: { in: ['PAID', 'SENT'] } },
      select: { totalAmount: true, subtotal: true, issueDate: true, status: true },
    });

    /* ── Monthly treasury entries ── */
    const treasury = await prisma.treasuryEntry.findMany({
      where: { companyId, date: { gte: yr0 } },
      select: { amount: true, type: true, date: true },
    });

    /* ── All invoices for aging ── */
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { companyId, status: { in: ['SENT', 'OVERDUE'] } },
      select: { totalAmount: true, dueDate: true, customer: { select: { name: true } } },
    });

    /* ── Products for balance (asset) ── */
    const products = await prisma.product.findMany({
      where: { companyId, isActive: true },
      select: { stockQty: true, sellPrice: true, buyPrice: true },
    });

    const LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

    /* Build monthly P&L from invoices */
    const plMonths = LABELS.map((month, i) => {
      const invs = paidInvoices.filter(inv => new Date(inv.issueDate).getMonth() === i);
      const revenue  = invs.reduce((s, inv) => s + inv.totalAmount, 0);
      const expenses = treasury
        .filter(t => t.type === 'DEBIT' && new Date(t.date).getMonth() === i)
        .reduce((s, t) => s + t.amount, 0);
      return { month, revenue: Math.round(revenue), expenses: Math.round(expenses), profit: Math.round(revenue - expenses) };
    });

    /* Build cashflow from treasury */
    const cashMonths = LABELS.map((month, i) => {
      const inflow  = treasury.filter(t => t.type === 'CREDIT' && new Date(t.date).getMonth() === i).reduce((s, t) => s + t.amount, 0);
      const outflow = treasury.filter(t => t.type === 'DEBIT'  && new Date(t.date).getMonth() === i).reduce((s, t) => s + t.amount, 0);
      return { month, inflow: Math.round(inflow), outflow: Math.round(outflow), net: Math.round(inflow - outflow) };
    });

    /* Build aging from unpaid invoices */
    const today = new Date();
    const aging = [
      { range: '0-30 j',  days: [0, 30],  amount: 0, count: 0, color: '#10b981' },
      { range: '31-60 j', days: [31, 60], amount: 0, count: 0, color: '#f59e0b' },
      { range: '61-90 j', days: [61, 90], amount: 0, count: 0, color: '#ef4444' },
      { range: '+90 j',   days: [91, Infinity], amount: 0, count: 0, color: '#7f1d1d' },
    ];
    unpaidInvoices.forEach(inv => {
      const diff = Math.max(0, Math.floor((today - new Date(inv.dueDate)) / 86400000));
      const bucket = aging.find(a => diff >= a.days[0] && diff <= a.days[1]);
      if (bucket) { bucket.amount += inv.totalAmount; bucket.count++; }
    });
    aging.forEach(a => { a.amount = Math.round(a.amount); });

    /* Build balance data from stock */
    const stockValue = products.reduce((s, p) => s + p.stockQty * p.buyPrice, 0);
    const receivables = unpaidInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const treasuryBalance = cashMonths.reduce((s, m) => s + m.net, 0);

    /* KPI summary */
    const totalRevenue = plMonths.reduce((s, m) => s + m.revenue, 0);
    const totalProfit  = plMonths.reduce((s, m) => s + m.profit, 0);
    const totalCash    = cashMonths.reduce((s, m) => s + m.net, 0);

    res.json({
      success: true,
      data: {
        pl:       plMonths,
        cashflow: cashMonths,
        aging,
        balance: {
          stockValue:    Math.round(stockValue),
          receivables:   Math.round(receivables),
          treasuryBalance: Math.round(treasuryBalance),
        },
        kpis: {
          totalRevenue: Math.round(totalRevenue),
          totalProfit:  Math.round(totalProfit),
          totalReceivables: Math.round(receivables),
          netCashflow: Math.round(totalCash),
          profitMargin: totalRevenue > 0 ? parseFloat(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0,
        },
      },
    });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════════════════════════════
   GET /analytics/health-score
   Company Health Score: 0-100 composite index from live KPIs.
════════════════════════════════════════════════════════════════ */
router.get('/health-score', async (req, res, next) => {
  try {
    const { companyId } = req;
    const now = new Date();
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo  = new Date(now); sixtyDaysAgo.setDate(now.getDate() - 60);

    const [
      allInvoices,
      allProducts,
      pendingLeaves,
      activeProjects,
      completedProjects,
      openMaintReqs,
      totalEmployees,
      recentOrders,
      prevOrders,
      treasuryEntries,
    ] = await Promise.all([
      prisma.invoice.findMany({ where: { companyId }, select: { totalAmount: true, status: true, dueDate: true } }),
      prisma.product.findMany({ where: { companyId, isActive: true }, select: { stockQty: true, minStockQty: true } }),
      prisma.leaveRequest.count({ where: { employee: { companyId }, status: 'PENDING' } }),
      prisma.project.count({ where: { companyId, status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { companyId, status: 'COMPLETED' } }),
      prisma.maintenanceRequest.count({ where: { companyId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
      prisma.order.aggregate({ where: { companyId, orderDate: { gte: thirtyDaysAgo }, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true }, _count: true }),
      prisma.order.aggregate({ where: { companyId, orderDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true }, _count: true }),
      prisma.treasuryEntry.findMany({ where: { companyId, date: { gte: thirtyDaysAgo } }, select: { amount: true, type: true } }),
    ]);

    /* ── Score components (each 0-100) ── */
    // 1. Collection health — ratio of PAID vs total invoiced
    const totalInvoiced = allInvoices.reduce((s, i) => s + i.totalAmount, 0);
    const paidAmt       = allInvoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.totalAmount, 0);
    const overdueAmt    = allInvoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + i.totalAmount, 0);
    const collectionScore = totalInvoiced > 0
      ? Math.max(0, Math.round(100 * (paidAmt / totalInvoiced) - (overdueAmt / totalInvoiced) * 50))
      : 80;

    // 2. Stock health — % products above min stock
    const lowStock  = allProducts.filter(p => p.stockQty <= p.minStockQty).length;
    const stockScore = allProducts.length > 0
      ? Math.round(100 * (1 - lowStock / allProducts.length))
      : 80;

    // 3. Cash flow — net cash in last 30 days
    const cashIn  = treasuryEntries.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
    const cashOut = treasuryEntries.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
    const cashNet = cashIn - cashOut;
    const cashScore = cashIn > 0 ? Math.min(100, Math.max(0, Math.round(50 + (cashNet / cashIn) * 50))) : 60;

    // 4. Revenue momentum — growth vs previous 30 days
    const curRev  = recentOrders._sum.totalAmount || 0;
    const prevRev = prevOrders._sum.totalAmount || 0;
    const revGrowth = prevRev > 0 ? (curRev - prevRev) / prevRev : 0;
    const revenueScore = Math.min(100, Math.max(0, Math.round(50 + revGrowth * 100)));

    // 5. Operations — low maintenance burden, resolved leaves, project completion
    const maintBurden = Math.min(openMaintReqs / Math.max(totalEmployees, 1), 1);
    const projTotal   = activeProjects + completedProjects;
    const projCompRate = projTotal > 0 ? completedProjects / projTotal : 0.5;
    const leaveBurden = Math.min(pendingLeaves / Math.max(totalEmployees, 1), 1);
    const opsScore = Math.min(100, Math.max(0, Math.round(100 * (1 - maintBurden * 0.3 - leaveBurden * 0.3 + projCompRate * 0.4))));

    // Weighted composite
    const weights = { collection: 0.25, stock: 0.15, cash: 0.25, revenue: 0.2, ops: 0.15 };
    const composite = Math.round(
      collectionScore * weights.collection +
      stockScore      * weights.stock +
      cashScore       * weights.cash +
      revenueScore    * weights.revenue +
      opsScore        * weights.ops
    );
    const score = Math.min(100, Math.max(0, composite));

    // Grade
    const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
    const trend = revGrowth >= 0.05 ? 'up' : revGrowth <= -0.05 ? 'down' : 'stable';

    res.json({
      success: true,
      data: {
        score,
        grade,
        trend,
        components: [
          { key: 'collection', label: 'Recouvrement', score: collectionScore, weight: weights.collection, icon: '🧾' },
          { key: 'cash',       label: 'Trésorerie',   score: cashScore,       weight: weights.cash,       icon: '🏦' },
          { key: 'revenue',    label: 'Croissance CA', score: revenueScore,  weight: weights.revenue,    icon: '📈' },
          { key: 'stock',      label: 'Santé stock',  score: stockScore,      weight: weights.stock,      icon: '📦' },
          { key: 'ops',        label: 'Opérations',   score: opsScore,        weight: weights.ops,        icon: '⚙️' },
        ],
      },
    });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════════════════════════════
   GET /analytics/smart-alerts
   Proactive business alerts sorted by severity.
════════════════════════════════════════════════════════════════ */
router.get('/smart-alerts', async (req, res, next) => {
  try {
    const { companyId } = req;
    const now = new Date();
    const alerts = [];

    const [
      overdueInvoices,
      criticalStock,
      pendingLeaves,
      overdueProjects,
      openMaintHighPriority,
      unpaidPurchases,
      expiringContracts,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: { companyId, status: 'OVERDUE' },
        select: { id: true, totalAmount: true, dueDate: true, customer: { select: { name: true } } },
        orderBy: { totalAmount: 'desc' }, take: 5,
      }),
      prisma.product.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true, stockQty: true, minStockQty: true },
      }).then(ps => ps.filter(p => p.stockQty <= p.minStockQty).slice(0, 5)),
      prisma.leaveRequest.findMany({
        where: { employee: { companyId }, status: 'PENDING' },
        select: { id: true, type: true, startDate: true, employee: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'asc' }, take: 5,
      }),
      prisma.project.findMany({
        where: { companyId, status: 'IN_PROGRESS', endDate: { lt: now } },
        select: { id: true, name: true, endDate: true, status: true },
        take: 5,
      }),
      prisma.maintenanceRequest.findMany({
        where: { companyId, status: 'OPEN', priority: { in: ['HIGH', 'CRITICAL'] } },
        select: { id: true, title: true, priority: true, createdAt: true },
        orderBy: { createdAt: 'asc' }, take: 5,
      }),
      prisma.purchaseOrder.findMany({
        where: { supplier: { companyId }, status: { in: ['SENT', 'CONFIRMED'] }, deliveryDate: { lt: now } },
        select: { id: true, reference: true, totalAmount: true, deliveryDate: true },
        take: 5,
      }).catch(() => []),
      Promise.resolve([]),
    ]);

    // Build alerts
    if (overdueInvoices.length > 0) {
      const total = overdueInvoices.reduce((s, i) => s + i.totalAmount, 0);
      alerts.push({
        id: 'overdue-invoices',
        type: 'FINANCIAL',
        severity: total > 500000 ? 'CRITICAL' : 'HIGH',
        title: `${overdueInvoices.length} facture(s) en retard`,
        description: `Total impayé : ${(total / 1000).toFixed(0)}k DA`,
        route: '/finance/invoices',
        count: overdueInvoices.length,
        items: overdueInvoices.map(i => ({ label: i.customer?.name || 'Inconnu', value: `${(i.totalAmount/1000).toFixed(0)}k DA`, daysLate: Math.floor((now - new Date(i.dueDate)) / 86400000) })),
      });
    }

    if (criticalStock.length > 0) {
      alerts.push({
        id: 'critical-stock',
        type: 'STOCK',
        severity: criticalStock.length > 3 ? 'HIGH' : 'MEDIUM',
        title: `${criticalStock.length} produit(s) en rupture imminente`,
        description: 'Réapprovisionnement urgent requis',
        route: '/stock/alerts',
        count: criticalStock.length,
        items: criticalStock.map(p => ({ label: p.name, value: `${p.stockQty}/${p.minStockQty} unités` })),
      });
    }

    if (pendingLeaves.length >= 3) {
      alerts.push({
        id: 'pending-leaves',
        type: 'HR',
        severity: pendingLeaves.length > 7 ? 'HIGH' : 'MEDIUM',
        title: `${pendingLeaves.length} demande(s) de congé en attente`,
        description: 'Validation managériale requise',
        route: '/rh/leaves',
        count: pendingLeaves.length,
        items: pendingLeaves.map(l => ({ label: `${l.employee.firstName} ${l.employee.lastName}`, value: l.type })),
      });
    }

    if (overdueProjects.length > 0) {
      alerts.push({
        id: 'overdue-projects',
        type: 'PROJECTS',
        severity: 'HIGH',
        title: `${overdueProjects.length} projet(s) en dépassement`,
        description: 'Projets dépassant la date de livraison prévue',
        route: '/projects/list',
        count: overdueProjects.length,
        items: overdueProjects.map(p => ({ label: p.name, value: `Échéance: ${new Date(p.endDate).toLocaleDateString('fr-DZ')}` })),
      });
    }

    if (openMaintHighPriority.length > 0) {
      alerts.push({
        id: 'maintenance-critical',
        type: 'MAINTENANCE',
        severity: openMaintHighPriority.some(m => m.priority === 'CRITICAL') ? 'CRITICAL' : 'HIGH',
        title: `${openMaintHighPriority.length} intervention(s) prioritaires`,
        description: 'Équipements nécessitant une intervention urgente',
        route: '/maintenance/requests',
        count: openMaintHighPriority.length,
        items: openMaintHighPriority.map(m => ({ label: m.title, value: m.priority })),
      });
    }

    if (unpaidPurchases.length > 0) {
      alerts.push({
        id: 'overdue-purchases',
        type: 'PURCHASES',
        severity: 'MEDIUM',
        title: `${unpaidPurchases.length} commande(s) fournisseur en retard`,
        description: 'Livraisons dépassant la date prévue',
        route: '/purchases/orders',
        count: unpaidPurchases.length,
        items: unpaidPurchases.map(p => ({ label: p.reference || 'N/A', value: `${(p.totalAmount/1000).toFixed(0)}k DA` })).filter(Boolean),
      });
    }

    // Sort by severity
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    alerts.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));

    res.json({ success: true, data: { alerts, count: alerts.length, criticalCount: alerts.filter(a => a.severity === 'CRITICAL').length } });
  } catch (err) { next(err); }
});

export default router;
