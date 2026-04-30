import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

const companyFilter = (companyId) => ({ employee: { companyId } });

router.get('/', async (req, res, next) => {
  try {
    const { employeeId, page = 1, limit = 50 } = req.query;
    const where = {
      ...companyFilter(req.companyId),
      ...(employeeId && { employeeId }),
    };
    const [items, total] = await Promise.all([
      prisma.evaluation.findMany({
        where,
        include: {
          employee: { select: { firstName: true, lastName: true, position: true, department: true } },
          evaluator: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.evaluation.count({ where }),
    ]);
    res.json({ success: true, data: items, total });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.evaluation.findFirst({
      where: { id: req.params.id, ...companyFilter(req.companyId) },
      include: {
        employee: true,
        evaluator: { select: { firstName: true, lastName: true } },
      },
    });
    if (!item) return res.status(404).json({ success: false, message: 'Non trouvé' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.post('/', authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { employeeId, period, score, comments, goals } = req.body;
    if (!employeeId || !period || score === undefined)
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    const emp = await prisma.employee.findFirst({ where: { id: employeeId, companyId: req.companyId } });
    if (!emp) return res.status(400).json({ success: false, message: 'Employé invalide' });
    const item = await prisma.evaluation.create({
      data: {
        employeeId,
        evaluatorId: req.user.id,
        period,
        score: parseFloat(score),
        comments: comments || null,
        goals: goals || null,
      },
      include: {
        employee: { select: { firstName: true, lastName: true, position: true, department: true } },
        evaluator: { select: { firstName: true, lastName: true } },
      },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.put('/:id', authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.evaluation.findFirst({
      where: { id: req.params.id, ...companyFilter(req.companyId) },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    const { period, score, comments, goals } = req.body;
    const item = await prisma.evaluation.update({
      where: { id: req.params.id },
      data: {
        ...(period !== undefined && { period }),
        ...(score !== undefined && { score: parseFloat(score) }),
        ...(comments !== undefined && { comments }),
        ...(goals !== undefined && { goals }),
      },
      include: {
        employee: { select: { firstName: true, lastName: true, position: true, department: true } },
        evaluator: { select: { firstName: true, lastName: true } },
      },
    });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.evaluation.findFirst({
      where: { id: req.params.id, ...companyFilter(req.companyId) },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    await prisma.evaluation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
