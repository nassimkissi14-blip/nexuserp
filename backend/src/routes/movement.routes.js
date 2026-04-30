import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// GET /movements
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 30, productId, type } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      companyId: req.companyId,
      ...(productId && { productId }),
      ...(type && { type }),
    };
    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        include: { product: { select: { id: true, name: true, sku: true, unit: true, stockQty: true } } },
      }),
      prisma.stockMovement.count({ where }),
    ]);
    res.json({ success: true, data: movements, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
});

// POST /movements — create movement + update product stock
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { productId, type, quantity, unitPrice, reference, notes } = req.body;

    const product = await prisma.product.findFirst({ where: { id: productId, companyId: req.companyId } });
    if (!product) return res.status(404).json({ success: false, message: 'Produit non trouvé' });

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) return res.status(400).json({ success: false, message: 'Quantité invalide' });

    // Calculate new stock
    let stockDelta = 0;
    if (type === 'IN') stockDelta = qty;
    else if (type === 'OUT') {
      if (product.stockQty < qty) return res.status(400).json({ success: false, message: `Stock insuffisant (disponible: ${product.stockQty} ${product.unit})` });
      stockDelta = -qty;
    } else if (type === 'ADJUSTMENT') {
      stockDelta = qty - product.stockQty; // adjust to exact quantity
    }

    const [movement, updatedProduct] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: { companyId: req.companyId, productId, type, quantity: qty, unitPrice: unitPrice ? Number(unitPrice) : null, reference: reference || null, notes: notes || null },
        include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stockQty: { increment: stockDelta } },
        select: { id: true, name: true, sku: true, stockQty: true, minStockQty: true },
      }),
    ]);

    // Emit real-time notification if stock drops at or below minimum threshold
    if (stockDelta < 0 && updatedProduct.stockQty <= updatedProduct.minStockQty) {
      const io = req.app.get('io');
      if (io) {
        io.to(`company:${req.companyId}`).emit('notification:new', {
          id:      `stock_${updatedProduct.id}_${Date.now()}`,
          type:    'STOCK_ALERT',
          title:   '⚠️ Rupture de stock imminente',
          message: `${updatedProduct.name} (${updatedProduct.sku}) — Stock: ${updatedProduct.stockQty} ${product.unit} (seuil min: ${updatedProduct.minStockQty})`,
          isRead:  false,
          createdAt: new Date(),
        });
      }
    }

    res.status(201).json({ success: true, data: movement });
  } catch (error) { next(error); }
});

// PATCH /movements/:id — update movement + adjust product stock
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, unitPrice, reference, notes } = req.body;

    const movement = await prisma.stockMovement.findFirst({ where: { id, companyId: req.companyId } });
    if (!movement) return res.status(404).json({ success: false, message: 'Mouvement non trouvé' });

    const product = await prisma.product.findFirst({ where: { id: movement.productId, companyId: req.companyId } });
    if (!product) return res.status(404).json({ success: false, message: 'Produit non trouvé' });

    const oldQty = movement.quantity;
    const newQty = quantity !== undefined ? Number(quantity) : oldQty;

    if (isNaN(newQty) || newQty <= 0) return res.status(400).json({ success: false, message: 'Quantité invalide' });

    // Revert old stock delta, apply new
    let stockAdjust = 0;
    if (movement.type === 'IN')         stockAdjust = newQty - oldQty;
    else if (movement.type === 'OUT')   stockAdjust = oldQty - newQty;
    // ADJUSTMENT: skip stock recalc (complex)

    const [updated] = await prisma.$transaction([
      prisma.stockMovement.update({
        where: { id },
        data: {
          quantity: newQty,
          unitPrice: unitPrice !== undefined ? (unitPrice ? Number(unitPrice) : null) : movement.unitPrice,
          reference: reference !== undefined ? (reference || null) : movement.reference,
          notes: notes !== undefined ? (notes || null) : movement.notes,
        },
        include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
      }),
      prisma.product.update({
        where: { id: movement.productId },
        data: { stockQty: { increment: stockAdjust } },
      }),
    ]);

    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DELETE /movements/:id — delete movement + revert stock
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const movement = await prisma.stockMovement.findFirst({ where: { id, companyId: req.companyId } });
    if (!movement) return res.status(404).json({ success: false, message: 'Mouvement non trouvé' });

    // Revert stock delta
    let revertDelta = 0;
    if (movement.type === 'IN')       revertDelta = -movement.quantity;
    else if (movement.type === 'OUT') revertDelta = movement.quantity;

    await prisma.$transaction([
      prisma.stockMovement.delete({ where: { id } }),
      prisma.product.update({
        where: { id: movement.productId },
        data: { stockQty: { increment: revertDelta } },
      }),
    ]);

    res.json({ success: true, message: 'Mouvement supprimé et stock corrigé' });
  } catch (error) { next(error); }
});

export default router;
