import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

const STATUS_FLOW = ['DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

// Generate reference: CMD-YEAR-XXXX
async function generateReference(companyId) {
  const year = new Date().getFullYear();
  const count = await prisma.order.count({ where: { companyId } });
  return `CMD-${year}-${String(count + 1).padStart(4, '0')}`;
}

// GET /orders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      companyId: req.companyId,
      ...(search && { OR: [
        { reference: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ]}),
      ...(status && { status }),
    };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, type: true } } },
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ success: true, data: orders, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
});

// POST /orders
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { customerId, totalAmount, orderDate, deliveryDate, notes, priority } = req.body;
    const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: req.companyId } });
    if (!customer) return res.status(404).json({ success: false, message: 'Client non trouvé' });
    const reference = await generateReference(req.companyId);
    const order = await prisma.order.create({
      data: {
        companyId: req.companyId,
        customerId,
        reference,
        status: 'DRAFT',
        totalAmount: Number(totalAmount),
        orderDate: new Date(orderDate),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        notes: notes || null,
      },
      include: { customer: { select: { id: true, name: true, type: true } } },
    });
    res.status(201).json({ success: true, data: order });
  } catch (error) { next(error); }
});

// PATCH /orders/:id - update fields or advance status
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.order.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Commande non trouvée' });

    const data = { ...req.body };
    if (data.totalAmount !== undefined) data.totalAmount = Number(data.totalAmount);
    if (data.orderDate) data.orderDate = new Date(data.orderDate);
    if (data.deliveryDate) data.deliveryDate = new Date(data.deliveryDate);
    delete data.companyId;
    delete data.reference;

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data,
      include: { customer: { select: { id: true, name: true, type: true } } },
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// PATCH /orders/:id/advance - move to next status + business logic
router.patch('/:id/advance', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        customer: { select: { id: true, name: true } },
        items: { select: { productId: true, quantity: true } },
      },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx === -1 || idx === STATUS_FLOW.length - 1) {
      return res.status(400).json({ success: false, message: 'Statut final atteint' });
    }
    const nextStatus = STATUS_FLOW[idx + 1];

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: req.params.id }, data: { status: nextStatus } });

      // DELIVERED → décrémenter stock + auto-facture
      if (nextStatus === 'DELIVERED') {
        // Décrémenter le stock pour chaque article livré
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data:  { stockQty: { decrement: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              companyId: req.companyId,
              productId: item.productId,
              type: 'OUT',
              quantity: item.quantity,
              reference: order.reference,
              notes: `Livraison commande ${order.reference}`,
            },
          });
        }

        // Auto-générer facture DRAFT si aucune n'existe
        const existingInv = await tx.invoice.findFirst({ where: { orderId: req.params.id } });
        if (!existingInv) {
          const year = new Date().getFullYear();
          const count = await tx.invoice.count({ where: { companyId: req.companyId } });
          const invRef = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          const tax = order.totalAmount * 0.19;
          await tx.invoice.create({
            data: {
              companyId: req.companyId,
              customerId: order.customerId,
              orderId: order.id,
              reference: invRef,
              status: 'DRAFT',
              subtotal: order.totalAmount,
              taxRate: 19,
              taxAmount: tax,
              totalAmount: order.totalAmount + tax,
              issueDate: new Date(),
              dueDate,
              notes: `Auto-généré depuis commande ${order.reference}`,
            },
          });
        }
        // Mettre à jour statut client
        await tx.customer.update({ where: { id: order.customerId }, data: { status: 'ACTIVE' } });
      }
    });

    const updated = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: { select: { id: true, name: true, type: true } } },
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DELETE /orders/:id - cancel
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.order.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    await prisma.order.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    res.json({ success: true, message: 'Commande annulée' });
  } catch (error) { next(error); }
});

export default router;
