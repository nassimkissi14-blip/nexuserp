import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// GET /customers
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, type } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      companyId: req.companyId,
      ...(search && { OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]}),
      ...(status && { status }),
      ...(type && { type }),
    };
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      prisma.customer.count({ where }),
    ]);
    res.json({ success: true, data: customers, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
});

// GET /customers/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { orders: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!customer) return res.status(404).json({ success: false, message: 'Client non trouvé' });
    res.json({ success: true, data: customer });
  } catch (error) { next(error); }
});

// POST /customers
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const customer = await prisma.customer.create({ data: { ...req.body, companyId: req.companyId } });
    res.status(201).json({ success: true, data: customer });
  } catch (error) { next(error); }
});

// PATCH /customers/:id
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.customer.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Client non trouvé' });
    const updated = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DELETE /customers/:id - soft delete
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const existing = await prisma.customer.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Client non trouvé' });
    await prisma.customer.update({ where: { id: req.params.id }, data: { status: 'INACTIVE' } });
    res.json({ success: true, message: 'Client archivé' });
  } catch (error) { next(error); }
});

export default router;
