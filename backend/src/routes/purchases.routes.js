import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

const STATUS_FLOW = ['DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'];

async function generateReference(companyId) {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({ where: { supplier: { companyId } } });
  return `BDC-${year}-${String(count + 1).padStart(4, '0')}`;
}

// GET /purchases
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      supplier: { companyId: req.companyId },
      ...(status && status !== 'ALL' && { status }),
      ...(search && { OR: [
        { reference: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ]}),
    };
    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);
    res.json({ success: true, data: orders, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
});

// POST /purchases - create purchase order
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { supplierId, orderDate, deliveryDate, notes, items = [] } = req.body;
    if (!supplierId || !orderDate) return res.status(400).json({ success: false, message: 'Fournisseur et date requis' });

    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, companyId: req.companyId } });
    if (!supplier) return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });

    const reference = await generateReference(req.companyId);
    const totalAmount = items.reduce((s, it) => s + Number(it.quantity) * Number(it.unitPrice), 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId, reference, status: 'DRAFT',
        totalAmount, currency: 'DZD',
        orderDate: new Date(orderDate),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        notes: notes || null,
        items: items.length > 0 ? {
          create: items.map(it => ({
            productId: it.productId,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            totalPrice: Number(it.quantity) * Number(it.unitPrice),
          })),
        } : undefined,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
      },
    });
    res.status(201).json({ success: true, data: order });
  } catch (error) { next(error); }
});

// PATCH /purchases/:id/advance — avancer dans le flux
router.patch('/:id/advance', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, supplier: { companyId: req.companyId } },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Bon de commande non trouvé' });

    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx === -1 || idx >= STATUS_FLOW.length - 2) {
      return res.status(400).json({ success: false, message: 'Statut final atteint' });
    }
    const nextStatus = STATUS_FLOW[idx + 1];

    await prisma.$transaction(async (tx) => {
      // If transitioning to RECEIVED → create stock movements IN for each item
      if (nextStatus === 'RECEIVED') {
        for (const item of order.items) {
          // Create stock movement IN
          await tx.stockMovement.create({
            data: {
              companyId: req.companyId,
              productId: item.productId,
              type: 'IN',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              reference: order.reference,
              notes: `Réception BDC ${order.reference}`,
            },
          });
          // Update product stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { increment: item.quantity } },
          });
        }

        // Create treasury entry (debit = payment to supplier)
        await tx.treasuryEntry.create({
          data: {
            companyId: req.companyId,
            type: 'DEBIT',
            amount: order.totalAmount,
            description: `Paiement fournisseur BDC ${order.reference}`,
            reference: order.reference,
            category: 'ACHATS',
            date: new Date(),
          },
        });
      }

      await tx.purchaseOrder.update({ where: { id: req.params.id }, data: { status: nextStatus } });
    });

    const updated = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
      },
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// PATCH /purchases/:id - update fields
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id, supplier: { companyId: req.companyId } } });
    if (!existing) return res.status(404).json({ success: false, message: 'Bon de commande non trouvé' });
    if (['RECEIVED', 'CANCELLED'].includes(existing.status)) {
      return res.status(400).json({ success: false, message: 'Impossible de modifier un BDC reçu ou annulé' });
    }
    const { notes, deliveryDate } = req.body;
    const data = {};
    if (notes !== undefined) data.notes = notes;
    if (deliveryDate !== undefined) data.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id }, data,
      include: { supplier: { select: { id: true, name: true } }, items: true },
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DELETE /purchases/:id - cancel
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const existing = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id, supplier: { companyId: req.companyId } } });
    if (!existing) return res.status(404).json({ success: false, message: 'Bon de commande non trouvé' });
    if (existing.status === 'RECEIVED') return res.status(400).json({ success: false, message: 'Impossible d\'annuler un BDC déjà reçu' });
    await prisma.purchaseOrder.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    res.json({ success: true, message: 'Bon de commande annulé' });
  } catch (error) { next(error); }
});

export default router;
