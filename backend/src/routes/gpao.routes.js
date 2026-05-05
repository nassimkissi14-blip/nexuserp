import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
const MGR = ['ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'];

// ═══════════════════════════════════════════════════════════
// GAMMES (ROUTING)
// ═══════════════════════════════════════════════════════════

router.get('/routings', authenticate, async (req, res, next) => {
  try {
    const routings = await prisma.routing.findMany({
      where: { companyId: req.companyId },
      include: {
        phases: {
          include: { workCenter: { select: { id: true, code: true, name: true } } },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, data: routings });
  } catch (e) { next(e); }
});

router.post('/routings', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const { phases = [], ...rest } = req.body;
    const routing = await prisma.routing.create({
      data: {
        ...rest,
        companyId: req.companyId,
        phases: {
          create: phases.map((p, i) => ({
            sequence: p.sequence ?? i + 1,
            name: p.name,
            workCenterId: p.workCenterId,
            setupTime: p.setupTime ?? 0,
            machineTime: p.machineTime ?? 0,
            laborTime: p.laborTime ?? 0,
            transferTime: p.transferTime ?? 0,
            notes: p.notes,
          })),
        },
      },
      include: { phases: { include: { workCenter: true }, orderBy: { sequence: 'asc' } } },
    });
    res.status(201).json({ success: true, data: routing });
  } catch (e) { next(e); }
});

router.get('/routings/:id', authenticate, async (req, res, next) => {
  try {
    const r = await prisma.routing.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        phases: {
          include: { workCenter: { select: { id: true, code: true, name: true, capacity: true, machineCount: true } } },
          orderBy: { sequence: 'asc' },
        },
      },
    });
    if (!r) return res.status(404).json({ success: false, message: 'Gamme non trouvée' });
    res.json({ success: true, data: r });
  } catch (e) { next(e); }
});

router.patch('/routings/:id', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const { phases, ...rest } = req.body;
    const updated = await prisma.$transaction(async (tx) => {
      if (phases) {
        await tx.routingPhase.deleteMany({ where: { routingId: req.params.id } });
        await tx.routingPhase.createMany({
          data: phases.map((p, i) => ({
            routingId: req.params.id,
            sequence: p.sequence ?? i + 1,
            name: p.name,
            workCenterId: p.workCenterId,
            setupTime: p.setupTime ?? 0,
            machineTime: p.machineTime ?? 0,
            laborTime: p.laborTime ?? 0,
            transferTime: p.transferTime ?? 0,
            notes: p.notes,
          })),
        });
      }
      return tx.routing.update({
        where: { id: req.params.id },
        data: rest,
        include: { phases: { include: { workCenter: true }, orderBy: { sequence: 'asc' } } },
      });
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

router.delete('/routings/:id', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    await prisma.routing.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════
// CATALOGUE FOURNISSEURS
// ═══════════════════════════════════════════════════════════

router.get('/supplier-catalog', authenticate, async (req, res, next) => {
  try {
    const { supplierId, productId } = req.query;
    const where = { companyId: req.companyId };
    if (supplierId) where.supplierId = supplierId;
    if (productId) where.productId = productId;
    const catalog = await prisma.supplierCatalog.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, sku: true, unit: true } },
      },
      orderBy: { supplier: { name: 'asc' } },
    });
    res.json({ success: true, data: catalog });
  } catch (e) { next(e); }
});

router.post('/supplier-catalog', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const { supplierId, productId, price, leadTime, minQty, isDefault, reference } = req.body;
    if (!supplierId || !productId) {
      return res.status(400).json({ success: false, message: 'Fournisseur et article sont obligatoires' });
    }
    if (isDefault) {
      await prisma.supplierCatalog.updateMany({
        where: { companyId: req.companyId, productId, isDefault: true },
        data: { isDefault: false },
      });
    }
    const entry = await prisma.supplierCatalog.create({
      data: { companyId: req.companyId, supplierId, productId, price: price ?? 0, leadTime: Math.round(leadTime ?? 0), minQty: minQty ?? 1, isDefault: isDefault ?? false, reference: reference || null },
      include: {
        supplier: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, sku: true } },
      },
    });
    res.status(201).json({ success: true, data: entry });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Ce fournisseur propose déjà ce produit dans le catalogue' });
    }
    next(e);
  }
});

router.post('/supplier-catalog/bulk', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const { supplierId, items = [] } = req.body;
    if (!supplierId) return res.status(400).json({ success: false, message: 'Fournisseur obligatoire' });
    const validItems = items.filter(i => i.productId);
    if (!validItems.length) return res.status(400).json({ success: false, message: 'Ajoutez au moins un article' });

    const created = [];
    const skipped = [];

    for (const item of validItems) {
      try {
        if (item.isDefault) {
          await prisma.supplierCatalog.updateMany({
            where: { companyId: req.companyId, productId: item.productId, isDefault: true },
            data: { isDefault: false },
          });
        }
        const entry = await prisma.supplierCatalog.create({
          data: {
            companyId: req.companyId,
            supplierId,
            productId:  item.productId,
            price:      item.price    ?? 0,
            leadTime:   Math.round(item.leadTime ?? 0),
            minQty:     item.minQty   ?? 1,
            isDefault:  item.isDefault ?? false,
            reference:  item.reference || null,
          },
          include: {
            supplier: { select: { id: true, name: true } },
            product:  { select: { id: true, name: true, sku: true } },
          },
        });
        created.push(entry);
      } catch (e) {
        if (e.code === 'P2002') { skipped.push(item.productId); }
        else throw e;
      }
    }

    const msg = skipped.length
      ? `${created.length} article(s) ajouté(s), ${skipped.length} doublon(s) ignoré(s)`
      : `${created.length} article(s) ajouté(s) au catalogue`;
    res.status(201).json({ success: true, data: created, skipped: skipped.length, message: msg });
  } catch (e) { next(e); }
});

router.patch('/supplier-catalog/:id', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const { isDefault, productId, ...rest } = req.body;
    if (isDefault && productId) {
      await prisma.supplierCatalog.updateMany({
        where: { companyId: req.companyId, productId, isDefault: true },
        data: { isDefault: false },
      });
    }
    const updated = await prisma.supplierCatalog.update({
      where: { id: req.params.id },
      data: { ...rest, ...(isDefault !== undefined && { isDefault }) },
      include: { supplier: { select: { id: true, name: true } }, product: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

router.delete('/supplier-catalog/:id', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    await prisma.supplierCatalog.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════
// CALENDRIERS D'ACTIVITÉ
// ═══════════════════════════════════════════════════════════

router.get('/calendars', authenticate, async (req, res, next) => {
  try {
    const calendars = await prisma.workCalendar.findMany({
      where: { companyId: req.companyId },
      include: { days: { orderBy: { date: 'asc' } } },
      orderBy: { year: 'desc' },
    });
    res.json({ success: true, data: calendars });
  } catch (e) { next(e); }
});

router.post('/calendars', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const { name, year, weekStart, weekDuration, weekendType } = req.body;
    const calendar = await prisma.workCalendar.create({
      data: { companyId: req.companyId, name, year: parseInt(year), weekStart: weekStart ?? '08:00', weekDuration: weekDuration ?? 8, weekendType: weekendType ?? 'SS' },
    });
    res.status(201).json({ success: true, data: calendar });
  } catch (e) { next(e); }
});

router.patch('/calendars/:id', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const { name, weekStart, weekDuration, weekendType } = req.body;
    const cal = await prisma.workCalendar.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!cal) return res.status(404).json({ success: false, message: 'Calendrier non trouvé' });
    const updated = await prisma.workCalendar.update({
      where: { id: req.params.id },
      data: {
        ...(name        !== undefined && { name }),
        ...(weekStart   !== undefined && { weekStart }),
        ...(weekDuration !== undefined && { weekDuration }),
        ...(weekendType !== undefined && { weekendType }),
      },
      include: { days: { orderBy: { date: 'asc' } } },
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

// Générer les jours ouvrables pour une période
router.post('/calendars/:id/generate', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const { fromDate, toDate, closedDates = [] } = req.body;
    const calendar = await prisma.workCalendar.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!calendar) return res.status(404).json({ success: false, message: 'Calendrier non trouvé' });

    const start = new Date(fromDate);
    const end = new Date(toDate);
    const days = [];
    const closedSet = new Set(closedDates.map(d => new Date(d).toDateString()));

    // Determine weekend days based on calendar's weekendType
    // getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const wt = calendar.weekendType || 'SS';
    const isWeekendDay = (dow) => {
      if (wt === 'FS')   return dow === 5 || dow === 6; // Vendredi + Samedi
      if (wt === 'SS')   return dow === 0 || dow === 6; // Samedi + Dimanche
      if (wt === 'F')    return dow === 5;              // Vendredi seul
      if (wt === 'S')    return dow === 6;              // Samedi seul
      if (wt === 'D')    return dow === 0;              // Dimanche seul
      if (wt === 'NONE') return false;
      return dow === 0 || dow === 6;
    };

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      const isWeekend = isWeekendDay(dow);
      const isClosed = closedSet.has(d.toDateString());
      days.push({
        calendarId: req.params.id,
        date: new Date(d),
        startTime: calendar.weekStart,
        duration: isWeekend || isClosed ? 0 : calendar.weekDuration,
        isWorking: !isWeekend && !isClosed,
        label: isClosed ? 'Jour férié' : undefined,
      });
    }

    // Upsert days
    await prisma.workCalendarDay.deleteMany({ where: { calendarId: req.params.id, date: { gte: start, lte: end } } });
    await prisma.workCalendarDay.createMany({ data: days });

    res.json({ success: true, message: `${days.filter(d => d.isWorking).length} jours ouvrables générés` });
  } catch (e) { next(e); }
});

router.patch('/calendars/:id/day', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const { date, isWorking, duration, label } = req.body;
    const day = await prisma.workCalendarDay.upsert({
      where: { calendarId_date: { calendarId: req.params.id, date: new Date(date) } },
      update: { isWorking, duration, label },
      create: { calendarId: req.params.id, date: new Date(date), isWorking, duration: duration ?? 8, label },
    });
    res.json({ success: true, data: day });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════
// NOMENCLATURE - ARBORESCENCE
// ═══════════════════════════════════════════════════════════

// Calcul des codes de plus bas niveau (Low Level Code)
// LLC = niveau max auquel un article apparaît dans TOUTES les nomenclatures
async function computeLowLevelCodes(companyId) {
  const boms = await prisma.bom.findMany({
    where: { companyId, isActive: true },
    include: { items: { include: { product: { select: { id: true } } } } },
  });

  // BFS pour calculer les niveaux
  const llc = {}; // productId → max level

  function explode(productId, level, visited = new Set()) {
    if (visited.has(productId)) return; // évite les boucles
    visited.add(productId);
    llc[productId] = Math.max(llc[productId] ?? 0, level);
    const bom = boms.find(b => b.productId === productId);
    if (bom) {
      for (const item of bom.items) {
        explode(item.productId, level + 1, new Set(visited));
      }
    }
  }

  // Trouver les articles racine (qui ne sont composants de personne)
  const allProducts = await prisma.product.findMany({ where: { companyId }, select: { id: true } });
  const componentIds = new Set(boms.flatMap(b => b.items.map(i => i.productId)));
  const roots = allProducts.filter(p => !componentIds.has(p.id));

  for (const root of roots) explode(root.id, 0);

  // Mettre à jour en DB
  for (const [productId, level] of Object.entries(llc)) {
    await prisma.product.update({ where: { id: productId }, data: { lowLevelCode: level } });
  }

  return llc;
}

router.post('/bom/compute-llc', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const llc = await computeLowLevelCodes(req.companyId);
    res.json({ success: true, data: llc, message: `${Object.keys(llc).length} articles mis à jour` });
  } catch (e) { next(e); }
});

// Arborescence BOM (vue arbre)
router.get('/bom/:productId/tree', authenticate, async (req, res, next) => {
  try {
    const boms = await prisma.bom.findMany({
      where: { companyId: req.companyId, isActive: true },
      include: { items: { include: { product: { select: { id: true, name: true, sku: true, unit: true, articleType: true, stockQty: true, leadTime: true } } } } },
    });

    function buildTree(productId, qty = 1, level = 0, visited = new Set()) {
      if (visited.has(productId)) return null;
      visited.add(productId);
      const bom = boms.find(b => b.productId === productId);
      const children = bom ? bom.items.map(item => buildTree(item.productId, item.quantity * qty, level + 1, new Set(visited))).filter(Boolean) : [];
      return { productId, quantity: qty, level, children };
    }

    const tree = buildTree(req.params.productId);
    res.json({ success: true, data: tree });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════
// MOTEUR MRP — CALCUL DES BESOINS NETS (CBN)
// ═══════════════════════════════════════════════════════════

router.post('/mrp/run', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const { horizonDate } = req.body;
    const horizon = horizonDate ? new Date(horizonDate) : new Date(Date.now() + 90 * 86400000);

    // 1. Recalcul LLC
    await computeLowLevelCodes(req.companyId);

    // 2. Charger toutes les données nécessaires
    const [products, boms, salesOrders, firmOFs] = await Promise.all([
      prisma.product.findMany({
        where: { companyId: req.companyId, isActive: true },
        orderBy: { lowLevelCode: 'asc' },
      }),
      prisma.bom.findMany({
        where: { companyId: req.companyId, isActive: true },
        include: { items: true },
      }),
      prisma.order.findMany({
        where: { companyId: req.companyId, status: { in: ['CONFIRMED', 'PROCESSING'] }, deliveryDate: { lte: horizon } },
        include: { items: { include: { product: { select: { id: true } } } } },
      }),
      prisma.productionOrder.findMany({
        where: { companyId: req.companyId, status: { in: ['FIRM', 'LAUNCHED', 'IN_PROGRESS'] } },
        select: { productId: true, quantity: true, producedQty: true, plannedEnd: true },
      }),
    ]);

    const bomMap = Object.fromEntries(boms.map(b => [b.productId, b]));
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    // Stock disponible (mutable pendant le MRP)
    const available = Object.fromEntries(products.map(p => [p.id, p.stockQty]));

    // Réceptions fermes (OFs en cours)
    for (const of_ of firmOFs) {
      available[of_.productId] = (available[of_.productId] ?? 0) + (of_.quantity - of_.producedQty);
    }

    // Besoins bruts par article (depuis commandes clients)
    const grossNeeds = {}; // productId → { date, qty }[]
    for (const order of salesOrders) {
      const needDate = order.deliveryDate ?? horizon;
      for (const item of order.items) {
        if (!grossNeeds[item.productId]) grossNeeds[item.productId] = [];
        grossNeeds[item.productId].push({ date: needDate, qty: item.quantity });
      }
    }

    // Résultats MRP
    const suggestedOFs = [];
    const suggestedOAs = [];
    const pdp = {}; // productId → { grossNeed, stock, netNeed, suggestedQty, orderDate, needDate }[]

    // Traitement par niveau LLC (du plus bas au plus haut)
    const maxLevel = Math.max(...products.map(p => p.lowLevelCode), 0);

    for (let level = 0; level <= maxLevel; level++) {
      const levelProducts = products.filter(p => p.lowLevelCode === level);

      for (const product of levelProducts) {
        const needs = grossNeeds[product.id] ?? [];
        if (needs.length === 0) continue;

        const planLines = [];
        let stockDisp = available[product.id] ?? 0;

        for (const need of needs.sort((a, b) => a.date - b.date)) {
          const grossNeed = need.qty;
          const safetyStock = product.safetyStock ?? 0;
          const netNeed = Math.max(0, grossNeed - stockDisp + safetyStock);
          const suggestedQty = netNeed > 0 ? Math.max(netNeed, product.lotSize ?? 1) : 0;

          if (suggestedQty > 0) {
            const needDate = new Date(need.date);
            const leadTime = product.leadTime ?? 0;
            const orderDate = new Date(needDate.getTime() - leadTime * 86400000);

            if (product.articleType === 'FABRIQUE') {
              suggestedOFs.push({
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                quantity: suggestedQty,
                unit: product.unit,
                needDate,
                orderDate,
                leadTime,
                level,
              });
              // Exploser les besoins sur les composants (niveau suivant)
              const bom = bomMap[product.id];
              if (bom) {
                for (const item of bom.items) {
                  const componentNeedDate = new Date(needDate.getTime() - (item.decalage ?? 0) * 86400000);
                  const componentQty = item.quantity * suggestedQty * (1 + (item.scrapRate ?? 0));
                  if (!grossNeeds[item.productId]) grossNeeds[item.productId] = [];
                  grossNeeds[item.productId].push({ date: componentNeedDate, qty: componentQty });
                }
              }
            } else {
              // ACHETE
              const catalog = await prisma.supplierCatalog.findFirst({
                where: { productId: product.id, companyId: req.companyId },
                orderBy: { isDefault: 'desc' },
              });
              suggestedOAs.push({
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                quantity: suggestedQty,
                unit: product.unit,
                needDate,
                orderDate,
                leadTime,
                supplierId: catalog?.supplierId,
                supplierLeadTime: catalog?.leadTime ?? leadTime,
                price: catalog?.price,
              });
            }

            stockDisp = Math.max(0, stockDisp - grossNeed + suggestedQty);
          } else {
            stockDisp = stockDisp - grossNeed;
          }

          planLines.push({
            date: need.date,
            grossNeed,
            stock: stockDisp,
            netNeed,
            suggestedQty,
          });
        }

        pdp[product.id] = { product: { id: product.id, name: product.name, sku: product.sku }, lines: planLines };
      }
    }

    // Supprimer les anciens OFs suggérés non confirmés
    await prisma.productionOrder.deleteMany({
      where: { companyId: req.companyId, status: 'SUGGESTED' },
    });

    // Créer les nouveaux OFs suggérés
    let ofCount = await prisma.productionOrder.count({ where: { companyId: req.companyId } });
    for (const of_ of suggestedOFs) {
      ofCount++;
      await prisma.productionOrder.create({
        data: {
          companyId: req.companyId,
          number: `OF-SUGG-${String(ofCount).padStart(4, '0')}`,
          productId: of_.productId,
          quantity: of_.quantity,
          unit: of_.unit,
          status: 'SUGGESTED',
          needDate: of_.needDate,
          plannedStart: of_.orderDate,
          plannedEnd: of_.needDate,
        },
      });
    }

    res.json({
      success: true,
      data: {
        suggestedOFs,
        suggestedOAs,
        pdp,
        summary: {
          totalOFs: suggestedOFs.length,
          totalOAs: suggestedOAs.length,
          horizon: horizon.toISOString(),
          runAt: new Date().toISOString(),
        },
      },
    });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════
// JALONNEMENT
// ═══════════════════════════════════════════════════════════

// Calculer la durée totale d'un OF à partir de sa gamme
async function computeOfDuration(productId, quantity, companyId) {
  const routing = await prisma.routing.findFirst({
    where: { companyId, productId, isActive: true },
    include: {
      phases: {
        include: { workCenter: { select: { id: true, name: true, code: true } } },
        orderBy: { sequence: 'asc' },
      },
    },
  });
  if (!routing || routing.phases.length === 0) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { leadTime: true } });
    const leadTime = product?.leadTime ?? 1;
    const hours = leadTime * 8;
    return {
      hours,
      phases: [],
      routingId: null,
      routingCode: null,
      note: `Aucune gamme active — délai d'obtention produit : ${leadTime}j × 8h = ${hours}h`,
    };
  }
  let totalHours = 0;
  const phases = routing.phases.map(p => {
    const setupH    = p.setupTime   || 0;
    const machineH  = (p.machineTime || 0) * quantity;
    const laborH    = (p.laborTime   || 0) * quantity;
    const transferH = p.transferTime || 0;
    const phaseHours = setupH + machineH + transferH;
    totalHours += phaseHours;
    return {
      sequence:         p.sequence,
      name:             p.name,
      workCenter:       p.workCenter,
      setupTime:        setupH,
      machineTimeUnit:  p.machineTime || 0,
      machineTimeTotal: machineH,
      laborTimeUnit:    p.laborTime || 0,
      laborTimeTotal:   laborH,
      transferTime:     transferH,
      durationHours:    phaseHours,
    };
  });
  return { hours: totalHours, phases, routingId: routing.id, routingCode: routing.code || routing.name };
}

// Jalonnement au plus tôt (forward) et au plus tard (backward)
router.post('/scheduling/run', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const { ofIds } = req.body; // si vide → tous les OFs fermes

    const where = { companyId: req.companyId, status: { in: ['SUGGESTED', 'FIRM'] } };
    if (ofIds?.length) where.id = { in: ofIds };

    const ofs = await prisma.productionOrder.findMany({
      where,
      include: { product: { select: { id: true, name: true, leadTime: true } } },
    });

    const now = new Date();
    const results = [];

    for (const of_ of ofs) {
      const { hours, phases, routingCode, note } = await computeOfDuration(of_.productId, of_.quantity, req.companyId);
      const durationMs = hours * 3600000;

      // Au plus tôt : démarre à la date planifiée (ou maintenant)
      const earlyStart = of_.plannedStart ? new Date(of_.plannedStart) : now;
      const earlyEnd   = new Date(earlyStart.getTime() + durationMs);

      // Au plus tard : finit à la date de besoin
      const needDate  = of_.needDate ? new Date(of_.needDate) : new Date(now.getTime() + 30 * 86400000);
      const lateEnd   = needDate;
      const lateStart = new Date(lateEnd.getTime() - durationMs);

      // Marge
      const marginMs   = needDate.getTime() - earlyEnd.getTime();
      const marginDays = marginMs / 86400000;
      const isLate     = marginDays < 0;

      await prisma.productionOrder.update({
        where: { id: of_.id },
        data: { scheduledStart: earlyStart, scheduledEnd: earlyEnd, lateScheduledStart: lateStart, lateScheduledEnd: lateEnd, marginDays, isLate },
      });

      // Jalonnement phase par phase (au plus tôt)
      let phaseStart = new Date(earlyStart);
      const phasesScheduled = phases.map(p => {
        const phaseEnd = new Date(phaseStart.getTime() + p.durationHours * 3600000);
        const s = { ...p, scheduledStart: new Date(phaseStart), scheduledEnd: new Date(phaseEnd) };
        phaseStart = phaseEnd;
        return s;
      });

      // ── Sauvegarder les opérations jalonnées en base (nécessaire pour le tableau de charges)
      await prisma.productionOperation.deleteMany({ where: { productionOrderId: of_.id } });
      if (phasesScheduled.length > 0) {
        await prisma.productionOperation.createMany({
          data: phasesScheduled.map(p => ({
            productionOrderId: of_.id,
            workCenterId:      p.workCenter?.id  || null,
            sequence:          p.sequence,
            name:              p.name,
            setupTime:         p.setupTime        || 0,
            machineTime:       p.machineTimeUnit   || 0,
            laborTime:         p.laborTimeUnit     || 0,
            transferTime:      p.transferTime      || 0,
            estimatedHours:    p.durationHours,
            scheduledStart:    p.scheduledStart,
            scheduledEnd:      p.scheduledEnd,
          })),
        });
      }

      results.push({
        id: of_.id,
        number: of_.number,
        product: of_.product.name,
        quantity: of_.quantity,
        earlyStart, earlyEnd,
        lateStart, lateEnd,
        needDate,
        marginDays: Math.round(marginDays * 10) / 10,
        isLate,
        durationHours: hours,
        // Détails du calcul
        routingCode,
        durationNote: note,
        phases: phasesScheduled,
        calcDetail: {
          durationFormula: phases.length
            ? phases.map(p => `${p.name}: ${p.setupTime}h réglage + ${p.machineTimeUnit}h×${of_.quantity} = ${p.durationHours.toFixed(2)}h`).join(' | ')
            : note,
          earlyStartSource: of_.plannedStart ? 'Date planifiée OF' : 'Date du jour (lancement immédiat)',
          earlyEndFormula:  `Début + ${hours.toFixed(2)}h de fabrication`,
          lateEndSource:    of_.needDate ? 'Date de besoin OF' : 'Aujourd\'hui + 30 jours (défaut)',
          lateStartFormula: `Date besoin − ${hours.toFixed(2)}h de fabrication`,
          marginFormula:    `(Date besoin − Fin au plus tôt) ÷ 24 = ${marginDays.toFixed(2)} jours`,
        },
      });
    }

    // Trier par marge croissante (les retards en premier)
    results.sort((a, b) => a.marginDays - b.marginDays);

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          onTime: results.filter(r => !r.isLate).length,
          late: results.filter(r => r.isLate).length,
          criticalPath: results.filter(r => r.marginDays < 2),
        },
      },
    });
  } catch (e) { next(e); }
});

// Affermissement OF suggéré → ferme
router.post('/of/:id/firm', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const of_ = await prisma.productionOrder.findFirst({
      where: { id: req.params.id, companyId: req.companyId, status: 'SUGGESTED' },
    });
    if (!of_) return res.status(404).json({ success: false, message: 'OF suggéré non trouvé' });
    const updated = await prisma.productionOrder.update({
      where: { id: req.params.id },
      data: { status: 'FIRM' },
      include: { product: { select: { id: true, name: true, sku: true } } },
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

// Affermissement en masse
router.post('/of/firm-all', authenticate, authorize(...MGR), async (req, res, next) => {
  try {
    const { ids } = req.body;
    const where = { companyId: req.companyId, status: 'SUGGESTED' };
    if (ids?.length) where.id = { in: ids };
    const result = await prisma.productionOrder.updateMany({ where, data: { status: 'FIRM' } });
    res.json({ success: true, count: result.count });
  } catch (e) { next(e); }
});

// Analyse des manquants (composants manquants pour lancer un OF)
router.get('/of/:id/shortage', authenticate, async (req, res, next) => {
  try {
    const of_ = await prisma.productionOrder.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { bom: { include: { items: { include: { product: true } } } } },
    });
    if (!of_) return res.status(404).json({ success: false, message: 'OF non trouvé' });

    const shortages = [];
    const available = [];

    if (of_.bom) {
      for (const item of of_.bom.items) {
        const needed = item.quantity * of_.quantity * (1 + (item.scrapRate ?? 0));
        const stock = item.product.stockQty ?? 0;
        const shortage = needed - stock;
        if (shortage > 0) {
          shortages.push({ product: item.product, needed, stock, shortage });
        } else {
          available.push({ product: item.product, needed, stock });
        }
      }
    }

    res.json({
      success: true,
      data: {
        of: { id: of_.id, number: of_.number, quantity: of_.quantity },
        canLaunch: shortages.length === 0,
        shortages,
        available,
      },
    });
  } catch (e) { next(e); }
});

// Tableau de charges par poste
router.get('/charges', authenticate, async (req, res, next) => {
  try {
    const ofs = await prisma.productionOrder.findMany({
      where: { companyId: req.companyId, status: { in: ['FIRM', 'LAUNCHED'] }, scheduledStart: { not: null } },
      include: {
        product: { select: { id: true, name: true } },
        operations: { include: { workCenter: { select: { id: true, code: true, name: true, weeklyHours: true, machineCount: true } } } },
      },
    });

    // Construire le tableau des charges par poste par semaine
    const charges = {}; // workCenterId → { weekKey → heures }
    const workCenters = {};

    for (const of_ of ofs) {
      for (const op of of_.operations) {
        if (!op.workCenter || !op.scheduledStart) continue;
        const wc = op.workCenter;
        if (!workCenters[wc.id]) workCenters[wc.id] = wc;
        if (!charges[wc.id]) charges[wc.id] = {};

        const weekKey = getWeekKey(new Date(op.scheduledStart));
        charges[wc.id][weekKey] = (charges[wc.id][weekKey] ?? 0) + (op.estimatedHours ?? 0);
      }
    }

    const result = Object.entries(workCenters).map(([wcId, wc]) => ({
      workCenter: wc,
      capacity: wc.weeklyHours * wc.machineCount,
      charges: charges[wcId] ?? {},
    }));

    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1); // lundi
  return d.toISOString().split('T')[0];
}

export { computeLowLevelCodes };
export default router;
