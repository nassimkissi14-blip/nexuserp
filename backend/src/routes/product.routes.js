import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// GET /products
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, category } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      companyId: req.companyId,
      isActive: true,
      ...(search && { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ]}),
      ...(category && category !== 'Tous' && { category }),
    };
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      prisma.product.count({ where }),
    ]);
    res.json({ success: true, data: products, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
});

// GET /products/categories
router.get('/categories', authenticate, async (req, res, next) => {
  try {
    const cats = await prisma.product.groupBy({
      by: ['category'],
      where: { companyId: req.companyId, isActive: true, category: { not: null } },
      _count: true,
    });
    res.json({ success: true, data: cats.map(c => c.category).filter(Boolean) });
  } catch (error) { next(error); }
});

// POST /products
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const product = await prisma.product.create({
      data: { ...req.body, companyId: req.companyId, stockQty: Number(req.body.stockQty) || 0, minStockQty: Number(req.body.minStockQty) || 0, buyPrice: Number(req.body.buyPrice) || 0, sellPrice: Number(req.body.sellPrice) || 0 },
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) { next(error); }
});

// PATCH /products/:id
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    const data = { ...req.body };
    if (data.stockQty !== undefined) data.stockQty = Number(data.stockQty);
    if (data.minStockQty !== undefined) data.minStockQty = Number(data.minStockQty);
    if (data.buyPrice !== undefined) data.buyPrice = Number(data.buyPrice);
    if (data.sellPrice !== undefined) data.sellPrice = Number(data.sellPrice);
    const updated = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DELETE /products/:id - soft delete
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Produit archivé' });
  } catch (error) { next(error); }
});

export default router;
