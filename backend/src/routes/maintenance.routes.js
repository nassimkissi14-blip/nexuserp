import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
const prisma = new PrismaClient();

const pad = (n, len = 3) => String(n).padStart(len, '0');
const genNumber = (prefix, count) => `${prefix}-${new Date().getFullYear()}-${pad(count + 1)}`;

// ─── EQUIPMENT ────────────────────────────────────────────────────────────────

router.get('/equipment', authenticate, async (req, res, next) => {
  try {
    const { status, type } = req.query;
    const where = { companyId: req.companyId };
    if (status) where.status = status;
    if (type)   where.type   = type;

    const equipment = await prisma.equipment.findMany({
      where,
      include: {
        _count: { select: { maintenanceRequests: true, maintenanceOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: equipment });
  } catch (err) { next(err); }
});

router.post('/equipment', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { purchaseDate, ...rest } = req.body;
    const equipment = await prisma.equipment.create({
      data: {
        ...rest,
        companyId: req.companyId,
        ...(purchaseDate && { purchaseDate: new Date(purchaseDate) }),
      },
    });
    res.status(201).json({ success: true, data: equipment });
  } catch (err) { next(err); }
});

router.get('/equipment/:id', authenticate, async (req, res, next) => {
  try {
    const equipment = await prisma.equipment.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        maintenanceRequests: { orderBy: { createdAt: 'desc' }, take: 5 },
        maintenanceOrders:   { orderBy: { createdAt: 'desc' }, take: 5 },
        maintenanceLogs:     { orderBy: { createdAt: 'desc' }, take: 10 },
        workCenters:         true,
      },
    });
    if (!equipment) return res.status(404).json({ success: false, message: 'Équipement non trouvé' });
    res.json({ success: true, data: equipment });
  } catch (err) { next(err); }
});

router.patch('/equipment/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { purchaseDate, lastMaintenance, nextMaintenance, ...rest } = req.body;
    const equipment = await prisma.equipment.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(purchaseDate      && { purchaseDate:      new Date(purchaseDate) }),
        ...(lastMaintenance   && { lastMaintenance:   new Date(lastMaintenance) }),
        ...(nextMaintenance   && { nextMaintenance:   new Date(nextMaintenance) }),
      },
    });

    // If equipment goes DOWN → log it + flag impacted production orders
    if (rest.status === 'DOWN' || rest.status === 'MAINTENANCE') {
      await prisma.maintenanceLog.create({
        data: {
          companyId:   req.companyId,
          equipmentId: equipment.id,
          action:      rest.status === 'DOWN' ? 'BREAKDOWN' : 'MAINTENANCE_START',
          description: `Statut changé à ${rest.status}`,
        },
      });

      // Pause production orders using this equipment's work centers
      const workCenters = await prisma.workCenter.findMany({ where: { equipmentId: equipment.id } });
      if (workCenters.length > 0) {
        const wcIds = workCenters.map(w => w.id);
        const affectedOps = await prisma.productionOperation.findMany({
          where: { workCenterId: { in: wcIds }, status: 'IN_PROGRESS' },
          include: { productionOrder: true },
        });
        for (const op of affectedOps) {
          if (op.productionOrder.status === 'IN_PROGRESS') {
            await prisma.productionOrder.update({
              where: { id: op.productionOrderId },
              data: { status: 'PAUSED', notes: `⚠️ Suspendu — panne ${equipment.name}` },
            });
          }
        }
      }
    }

    res.json({ success: true, data: equipment });
  } catch (err) { next(err); }
});

router.delete('/equipment/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    await prisma.equipment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── MAINTENANCE REQUESTS ─────────────────────────────────────────────────────

router.get('/requests', authenticate, async (req, res, next) => {
  try {
    const { status, priority, equipmentId } = req.query;
    const where = { companyId: req.companyId };
    if (status)      where.status      = status;
    if (priority)    where.priority    = priority;
    if (equipmentId) where.equipmentId = equipmentId;

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: { equipment: { select: { id: true, code: true, name: true, status: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
});

router.post('/requests', authenticate, async (req, res, next) => {
  try {
    const count = await prisma.maintenanceRequest.count({ where: { companyId: req.companyId } });
    const number = genNumber('MR', count);

    const request = await prisma.maintenanceRequest.create({
      data: { ...req.body, companyId: req.companyId, number },
      include: { equipment: true },
    });

    // If BREAKDOWN → immediately set equipment to DOWN
    if (req.body.type === 'BREAKDOWN' || req.body.priority === 'CRITICAL') {
      await prisma.equipment.update({
        where: { id: req.body.equipmentId },
        data:  { status: 'DOWN' },
      });
      await prisma.maintenanceLog.create({
        data: {
          companyId:   req.companyId,
          equipmentId: req.body.equipmentId,
          action:      'BREAKDOWN_REPORTED',
          description: `Panne signalée : ${req.body.title}`,
        },
      });
    }

    res.status(201).json({ success: true, data: request });
  } catch (err) { next(err); }
});

router.patch('/requests/:id', authenticate, async (req, res, next) => {
  try {
    const request = await prisma.maintenanceRequest.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        ...(req.body.status === 'RESOLVED' && { resolvedAt: new Date() }),
      },
      include: { equipment: true },
    });

    // If resolved → set equipment back to ACTIVE
    if (req.body.status === 'RESOLVED' || req.body.status === 'CLOSED') {
      await prisma.equipment.update({
        where: { id: request.equipmentId },
        data:  { status: 'ACTIVE', lastMaintenance: new Date() },
      });
      await prisma.maintenanceLog.create({
        data: {
          companyId:   req.companyId,
          equipmentId: request.equipmentId,
          action:      'REPAIRED',
          description: `Demande ${request.number} résolue`,
        },
      });
    }

    res.json({ success: true, data: request });
  } catch (err) { next(err); }
});

router.delete('/requests/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    await prisma.maintenanceRequest.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── MAINTENANCE ORDERS ───────────────────────────────────────────────────────

router.get('/orders', authenticate, async (req, res, next) => {
  try {
    const { status, equipmentId } = req.query;
    const where = { companyId: req.companyId };
    if (status)      where.status      = status;
    if (equipmentId) where.equipmentId = equipmentId;

    const orders = await prisma.maintenanceOrder.findMany({
      where,
      include: {
        equipment: { select: { id: true, code: true, name: true } },
        request:   { select: { id: true, number: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
});

router.post('/orders', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const count = await prisma.maintenanceOrder.count({ where: { companyId: req.companyId } });
    const number = genNumber('WO', count);
    const { plannedDate, requestId, ...rest } = req.body;

    if (!rest.equipmentId) return res.status(400).json({ success: false, message: 'Équipement requis' });
    if (!rest.title)       return res.status(400).json({ success: false, message: 'Titre requis' });

    const order = await prisma.maintenanceOrder.create({
      data: {
        ...rest,
        companyId: req.companyId,
        number,
        ...(requestId  && { requestId }),
        ...(plannedDate && { plannedDate: new Date(plannedDate) }),
      },
      include: { equipment: true },
    });

    await prisma.maintenanceLog.create({
      data: {
        companyId:   req.companyId,
        equipmentId: order.equipmentId,
        orderId:     order.id,
        action:      'ORDER_CREATED',
        description: `Ordre de maintenance ${order.number} créé`,
      },
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
});

router.patch('/orders/:id', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.maintenanceOrder.update({
      where: { id: req.params.id },
      data:  {
        ...req.body,
        ...(req.body.status === 'IN_PROGRESS' && { startedAt:   new Date() }),
        ...(req.body.status === 'COMPLETED'   && { completedAt: new Date() }),
      },
      include: { equipment: true },
    });

    // If completed → restore equipment + log
    if (req.body.status === 'COMPLETED') {
      await prisma.equipment.update({
        where: { id: order.equipmentId },
        data:  { status: 'ACTIVE', lastMaintenance: new Date() },
      });
      await prisma.maintenanceLog.create({
        data: {
          companyId:   req.companyId,
          equipmentId: order.equipmentId,
          orderId:     order.id,
          action:      'ORDER_COMPLETED',
          description: `Ordre ${order.number} terminé — ${req.body.actualHours || 0}h effectuées`,
        },
      });

      // Resume paused production orders that use this equipment
      const workCenters = await prisma.workCenter.findMany({ where: { equipmentId: order.equipmentId } });
      if (workCenters.length > 0) {
        await prisma.productionOrder.updateMany({
          where: { companyId: req.companyId, status: 'PAUSED' },
          data:  { status: 'IN_PROGRESS', notes: `✅ Repris après maintenance ${order.number}` },
        });
      }
    }

    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// DELETE /orders/:id
router.delete('/orders/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const order = await prisma.maintenanceOrder.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!order) return res.status(404).json({ success: false, message: 'Non trouvé' });
    await prisma.maintenanceOrder.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── LOGS ─────────────────────────────────────────────────────────────────────

router.get('/logs', authenticate, async (req, res, next) => {
  try {
    const { equipmentId, limit = 50 } = req.query;
    const where = { companyId: req.companyId };
    if (equipmentId) where.equipmentId = equipmentId;

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { equipment: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const cid = req.companyId;
    const [totalEquip, downEquip, openRequests, pendingOrders, criticalRequests, recentLogs] = await Promise.all([
      prisma.equipment.count({ where: { companyId: cid } }),
      prisma.equipment.count({ where: { companyId: cid, status: { in: ['DOWN', 'MAINTENANCE'] } } }),
      prisma.maintenanceRequest.count({ where: { companyId: cid, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.maintenanceOrder.count({ where: { companyId: cid, status: { in: ['PLANNED', 'IN_PROGRESS'] } } }),
      prisma.maintenanceRequest.count({ where: { companyId: cid, priority: 'CRITICAL', status: { not: 'CLOSED' } } }),
      prisma.maintenanceLog.findMany({
        where: { companyId: cid },
        include: { equipment: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    res.json({
      success: true,
      data: { totalEquip, downEquip, openRequests, pendingOrders, criticalRequests, availability: totalEquip > 0 ? Math.round(((totalEquip - downEquip) / totalEquip) * 100) : 100, recentLogs },
    });
  } catch (err) { next(err); }
});

export default router;
