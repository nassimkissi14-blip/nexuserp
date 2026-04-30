import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { search, type } = req.query;
    const where = {
      companyId: req.companyId,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(type && { type }),
    };
    const items = await prisma.carrier.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, type, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nom requis' });
    const item = await prisma.carrier.create({
      data: { companyId: req.companyId, name, type: type || 'ROAD', phone, email, address, notes },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.carrier.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    const item = await prisma.carrier.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.name     !== undefined && { name:     req.body.name }),
        ...(req.body.type     !== undefined && { type:     req.body.type }),
        ...(req.body.phone    !== undefined && { phone:    req.body.phone }),
        ...(req.body.email    !== undefined && { email:    req.body.email }),
        ...(req.body.address  !== undefined && { address:  req.body.address }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
        ...(req.body.notes    !== undefined && { notes:    req.body.notes }),
      },
    });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.carrier.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    await prisma.carrier.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
