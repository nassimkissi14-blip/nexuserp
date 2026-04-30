import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { type, status, search } = req.query;
    const where = {
      companyId: req.companyId,
      ...(type && { type }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name:    { contains: search, mode: 'insensitive' } },
          { project: { contains: search, mode: 'insensitive' } },
          { skills:  { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const items = await prisma.projectResource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, type, status, project, skills, capacity, startDate, endDate, cost, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nom requis' });
    const item = await prisma.projectResource.create({
      data: {
        companyId: req.companyId,
        name,
        type:      type     || 'HUMAN',
        status:    status   || 'AVAILABLE',
        project:   project  || null,
        skills:    skills   || null,
        capacity:  capacity !== undefined ? parseInt(capacity) : 100,
        startDate: startDate ? new Date(startDate) : null,
        endDate:   endDate   ? new Date(endDate)   : null,
        cost:      cost      ? parseFloat(cost)    : null,
        notes:     notes     || null,
      },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.projectResource.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    const { name, type, status, project, skills, capacity, startDate, endDate, cost, notes } = req.body;
    const item = await prisma.projectResource.update({
      where: { id: req.params.id },
      data: {
        ...(name      !== undefined && { name }),
        ...(type      !== undefined && { type }),
        ...(status    !== undefined && { status }),
        ...(project   !== undefined && { project:   project   || null }),
        ...(skills    !== undefined && { skills:    skills    || null }),
        ...(capacity  !== undefined && { capacity:  parseInt(capacity) }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate   !== undefined && { endDate:   endDate   ? new Date(endDate)   : null }),
        ...(cost      !== undefined && { cost:      cost      ? parseFloat(cost)    : null }),
        ...(notes     !== undefined && { notes:     notes     || null }),
      },
    });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.projectResource.findFirst({ where: { id: req.params.id, companyId: req.companyId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    await prisma.projectResource.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
