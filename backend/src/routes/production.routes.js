import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
const prisma = new PrismaClient();

const pad = (n, len = 3) => String(n).padStart(len, '0');
const genNumber = (prefix, count) => `${prefix}-${new Date().getFullYear()}-${pad(count + 1)}`;

// ─── WORK CENTERS ─────────────────────────────────────────────────────────────

router.get('/workcenters', authenticate, async (req, res, next) => {
  try {
    const wc = await prisma.workCenter.findMany({
      where: { companyId: req.companyId },
      include: { equipment: { select: { id: true, name: true, status: true } } },
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, data: wc });
  } catch (err) { next(err); }
});

router.post('/workcenters', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const wc = await prisma.workCenter.create({ data: { ...req.body, companyId: req.companyId } });
    res.status(201).json({ success: true, data: wc });
  } catch (err) { next(err); }
});

router.patch('/workcenters/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const wc = await prisma.workCenter.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: wc });
  } catch (err) { next(err); }
});

router.delete('/workcenters/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    await prisma.workCenter.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── BOM ──────────────────────────────────────────────────────────────────────

router.get('/bom', authenticate, async (req, res, next) => {
  try {
    const boms = await prisma.bom.findMany({
      where: { companyId: req.companyId },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        items:   { include: { product: { select: { id: true, name: true, sku: true, unit: true, buyPrice: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: boms });
  } catch (err) { next(err); }
});

router.post('/bom', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { items = [], ...bomData } = req.body;
    const bom = await prisma.bom.create({
      data: {
        ...bomData,
        companyId: req.companyId,
        items: { create: items.map(({ productId, quantity, unit }) => ({ productId, quantity: parseFloat(quantity), unit })) },
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        items:   { include: { product: true } },
      },
    });
    res.status(201).json({ success: true, data: bom });
  } catch (err) { next(err); }
});

router.get('/bom/:id', authenticate, async (req, res, next) => {
  try {
    const bom = await prisma.bom.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        product: true,
        items:   { include: { product: true } },
      },
    });
    if (!bom) return res.status(404).json({ success: false, message: 'BOM non trouvée' });
    res.json({ success: true, data: bom });
  } catch (err) { next(err); }
});

router.patch('/bom/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { items, ...bomData } = req.body;
    const bom = await prisma.bom.update({
      where: { id: req.params.id },
      data:  bomData,
    });
    // Replace items if provided
    if (items) {
      await prisma.bomItem.deleteMany({ where: { bomId: bom.id } });
      await prisma.bomItem.createMany({
        data: items.map(i => ({ bomId: bom.id, productId: i.productId, quantity: parseFloat(i.quantity), unit: i.unit || 'pcs' })),
      });
    }
    res.json({ success: true, data: bom });
  } catch (err) { next(err); }
});

router.delete('/bom/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    await prisma.bom.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── PRODUCTION ORDERS ────────────────────────────────────────────────────────

router.get('/orders', authenticate, async (req, res, next) => {
  try {
    const { status, priority } = req.query;
    const where = { companyId: req.companyId };
    if (status)   where.status   = status;
    if (priority) where.priority = priority;

    const orders = await prisma.productionOrder.findMany({
      where,
      include: {
        product:    { select: { id: true, name: true, sku: true, unit: true } },
        bom:        { select: { id: true, version: true } },
        operations: { include: { workCenter: { select: { id: true, name: true, status: true } } }, orderBy: { sequence: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orders });
  } catch (err) { next(err); }
});

router.post('/orders', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { operations = [], plannedStart, plannedEnd, ...rest } = req.body;

    if (!rest.productId) return res.status(400).json({ success: false, message: 'Produit requis' });
    const qty = parseFloat(rest.quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ success: false, message: 'Quantité invalide' });

    const count = await prisma.productionOrder.count({ where: { companyId: req.companyId } });
    const number = genNumber('OF', count);

    const order = await prisma.productionOrder.create({
      data: {
        ...rest,
        companyId: req.companyId,
        number,
        quantity: qty,
        bomId: rest.bomId || null,
        ...(plannedStart && { plannedStart: new Date(plannedStart) }),
        ...(plannedEnd   && { plannedEnd:   new Date(plannedEnd) }),
        operations: {
          create: operations.map((op, i) => ({
            sequence:       i + 1,
            name:           op.name,
            description:    op.description,
            workCenterId:   op.workCenterId || null,
            estimatedHours: parseFloat(op.estimatedHours || 0),
          })),
        },
      },
      include: {
        product:    { select: { id: true, name: true, sku: true } },
        operations: { include: { workCenter: true }, orderBy: { sequence: 'asc' } },
      },
    });
    res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
});

router.get('/orders/:id', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.productionOrder.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        product:    true,
        bom:        { include: { items: { include: { product: true } } } },
        operations: { include: { workCenter: { include: { equipment: true } } }, orderBy: { sequence: 'asc' } },
      },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Ordre non trouvé' });
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

router.patch('/orders/:id', authenticate, async (req, res, next) => {
  try {
    const { producedQty, plannedStart, plannedEnd, ...rest } = req.body;
    const data = { ...rest };
    if (plannedStart)          data.plannedStart = new Date(plannedStart);
    if (plannedEnd)            data.plannedEnd   = new Date(plannedEnd);
    if (producedQty !== undefined) data.producedQty = parseFloat(producedQty);
    if (rest.status === 'IN_PROGRESS') data.actualStart = new Date();
    if (rest.status === 'COMPLETED')   data.actualEnd   = new Date();

    const order = await prisma.productionOrder.update({
      where: { id: req.params.id },
      data,
      include: { product: true, operations: true },
    });

    // On completion: consume BOM materials + add finished goods to stock
    if (rest.status === 'COMPLETED') {
      // Consume BOM materials if BOM is attached
      if (order.bomId) {
        const bom = await prisma.bom.findUnique({ where: { id: order.bomId }, include: { items: true } });
        if (bom) {
          for (const item of bom.items) {
            const consumed = item.quantity * order.quantity;
            await prisma.product.update({
              where: { id: item.productId },
              data:  { stockQty: { decrement: consumed } },
            });
            await prisma.stockMovement.create({
              data: {
                companyId: req.companyId,
                productId: item.productId,
                type:      'OUT',
                quantity:  consumed,
                reference: order.number,
                notes:     `Consommation production OF ${order.number}`,
              },
            });
          }
        }
      }
      // Always add finished goods to stock
      const qtyProduced = order.producedQty || order.quantity;
      await prisma.product.update({
        where: { id: order.productId },
        data:  { stockQty: { increment: qtyProduced } },
      });
      await prisma.stockMovement.create({
        data: {
          companyId: req.companyId,
          productId: order.productId,
          type:      'IN',
          quantity:  qtyProduced,
          reference: order.number,
          notes:     `Production terminée — OF ${order.number}`,
        },
      });
    }

    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

router.delete('/orders/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    await prisma.productionOrder.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── OPERATIONS (patch individual op) ────────────────────────────────────────

router.patch('/operations/:id', authenticate, async (req, res, next) => {
  try {
    const op = await prisma.productionOperation.update({
      where: { id: req.params.id },
      data:  {
        ...req.body,
        ...(req.body.status === 'IN_PROGRESS' && { startedAt:   new Date() }),
        ...(req.body.status === 'COMPLETED'   && { completedAt: new Date() }),
        ...(req.body.actualHours !== undefined && { actualHours: parseFloat(req.body.actualHours) }),
      },
    });
    res.json({ success: true, data: op });
  } catch (err) { next(err); }
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const cid = req.companyId;
    const [totalOrders, inProgress, planned, completed, totalBoms, totalWC] = await Promise.all([
      prisma.productionOrder.count({ where: { companyId: cid } }),
      prisma.productionOrder.count({ where: { companyId: cid, status: 'IN_PROGRESS' } }),
      prisma.productionOrder.count({ where: { companyId: cid, status: 'PLANNED' } }),
      prisma.productionOrder.count({ where: { companyId: cid, status: 'COMPLETED' } }),
      prisma.bom.count({ where: { companyId: cid } }),
      prisma.workCenter.count({ where: { companyId: cid } }),
    ]);

    const recentOrders = await prisma.productionOrder.findMany({
      where: { companyId: cid, status: { in: ['IN_PROGRESS', 'PLANNED'] } },
      include: { product: { select: { name: true } } },
      orderBy: { plannedEnd: 'asc' },
      take: 5,
    });

    res.json({ success: true, data: { totalOrders, inProgress, planned, completed, totalBoms, totalWC, recentOrders } });
  } catch (err) { next(err); }
});

export default router;
