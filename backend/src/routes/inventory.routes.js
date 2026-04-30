import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use(authenticate);

// GET /inventory
router.get('/', async (req, res) => {
  try {
    const sessions = await prisma.inventorySession.findMany({
      where: { companyId: req.user.companyId },
      include: { lines: { include: { product: { select: { name: true, sku: true, unit: true } } } } },
      orderBy: { startedAt: 'desc' },
    });
    res.json({ success: true, data: sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /inventory — create new session with all current products
router.post('/', authorize('MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { notes } = req.body;
    const products = await prisma.product.findMany({
      where: { companyId: req.user.companyId, isActive: true },
      select: { id: true, stockQty: true },
    });

    const count = await prisma.inventorySession.count({ where: { companyId: req.user.companyId } });
    const reference = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const session = await prisma.inventorySession.create({
      data: {
        companyId: req.user.companyId,
        reference,
        status: 'IN_PROGRESS',
        notes,
        lines: {
          create: products.map(p => ({
            productId: p.id,
            theoreticalQty: p.stockQty,
          })),
        },
      },
      include: { lines: { include: { product: { select: { name: true, sku: true, unit: true } } } } },
    });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /inventory/:id/line/:lineId — update counted quantity
router.patch('/:id/line/:lineId', async (req, res) => {
  try {
    const { countedQty, notes } = req.body;
    const counted = parseFloat(countedQty);
    const line = await prisma.inventoryLine.update({
      where: { id: req.params.lineId },
      data: {
        countedQty: counted,
        notes,
        variance: null, // will be computed on complete
      },
      include: { product: { select: { name: true, sku: true, unit: true } } },
    });
    res.json(line);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /inventory/:id/complete — validate and apply adjustments
router.post('/:id/complete', authorize('MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const session = await prisma.inventorySession.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: { lines: true },
    });
    if (!session) return res.status(404).json({ message: 'Session introuvable' });
    if (session.status === 'COMPLETED') return res.status(400).json({ message: 'Session déjà complétée' });

    // Apply adjustments in transaction
    const ops = [];
    for (const line of session.lines) {
      if (line.countedQty !== null) {
        const variance = line.countedQty - line.theoreticalQty;
        ops.push(
          prisma.inventoryLine.update({
            where: { id: line.id },
            data: { variance },
          })
        );
        if (variance !== 0) {
          ops.push(
            prisma.product.update({
              where: { id: line.productId },
              data: { stockQty: line.countedQty },
            }),
            prisma.stockMovement.create({
              data: {
                companyId: req.user.companyId,
                productId: line.productId,
                type: 'ADJUSTMENT',
                quantity: Math.abs(variance),
                notes: `Inventaire ${session.reference}`,
              },
            })
          );
        }
      }
    }
    ops.push(
      prisma.inventorySession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
    );
    await prisma.$transaction(ops);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /inventory/:id
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    await prisma.inventorySession.delete({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
