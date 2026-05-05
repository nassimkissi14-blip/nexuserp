import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// GET /suppliers
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      companyId: req.companyId,
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(search && { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
      ]}),
    };
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        include: { _count: { select: { purchaseOrders: true } } },
      }),
      prisma.supplier.count({ where }),
    ]);
    res.json({ success: true, data: suppliers, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
});

// GET /suppliers/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' }, take: 10,
          include: { items: { include: { product: { select: { name: true, sku: true } } } } },
        },
      },
    });
    if (!supplier) return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    res.json({ success: true, data: supplier });
  } catch (error) { next(error); }
});

// POST /suppliers
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { name, email, phone, address, country, taxId, paymentTerms = 30 } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nom requis' });
    const supplier = await prisma.supplier.create({
      data: { companyId: req.companyId, name, email: email || null, phone: phone || null, address: address || null, country: country || null, taxId: taxId || null, paymentTerms: Number(paymentTerms) },
      include: { _count: { select: { purchaseOrders: true } } },
    });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) { next(error); }
});

// PATCH /suppliers/:id
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.supplier.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    const { name, email, phone, address, country, taxId, paymentTerms, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (address !== undefined) data.address = address;
    if (country !== undefined) data.country = country;
    if (taxId !== undefined) data.taxId = taxId;
    if (paymentTerms !== undefined) data.paymentTerms = Number(paymentTerms);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    const updated = await prisma.supplier.update({
      where: { id: req.params.id }, data,
      include: { _count: { select: { purchaseOrders: true } } },
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DELETE /suppliers/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { _count: { select: { purchaseOrders: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    if (existing._count.purchaseOrders > 0)
      return res.status(400).json({ success: false, message: `Impossible de supprimer : ce fournisseur a ${existing._count.purchaseOrders} bon(s) de commande associé(s)` });
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Fournisseur supprimé' });
  } catch (error) { next(error); }
});

export default router;
