import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

/* ── helpers ── */
const companyFilter = (companyId) => ({ employee: { companyId } });

router.get('/', async (req, res, next) => {
  try {
    const { status, employeeId, page = 1, limit = 50 } = req.query;
    const where = {
      ...companyFilter(req.companyId),
      ...(status && { status }),
      ...(employeeId && { employeeId }),
    };
    const [items, total] = await Promise.all([
      prisma.expenseReport.findMany({
        where,
        include: { employee: { select: { firstName: true, lastName: true, department: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.expenseReport.count({ where }),
    ]);
    res.json({ success: true, data: items, total });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.expenseReport.findFirst({
      where: { id: req.params.id, ...companyFilter(req.companyId) },
      include: { employee: true },
    });
    if (!item) return res.status(404).json({ success: false, message: 'Non trouvé' });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { employeeId, title, amount, date, category, description } = req.body;
    if (!employeeId || !title || !amount || !date || !category)
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    // Verify employee belongs to this company
    const emp = await prisma.employee.findFirst({ where: { id: employeeId, companyId: req.companyId } });
    if (!emp) return res.status(400).json({ success: false, message: 'Employé invalide' });
    const item = await prisma.expenseReport.create({
      data: {
        employeeId,
        userId: req.user.id,
        title,
        amount: parseFloat(amount),
        date: new Date(date),
        category,
        description: description || null,
        status: 'PENDING',
      },
      include: { employee: { select: { firstName: true, lastName: true, department: true } } },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.expenseReport.findFirst({
      where: { id: req.params.id, ...companyFilter(req.companyId) },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    const { title, amount, date, category, description } = req.body;
    const item = await prisma.expenseReport.update({
      where: { id: req.params.id },
      data: {
        ...(title && { title }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(date && { date: new Date(date) }),
        ...(category && { category }),
        ...(description !== undefined && { description }),
      },
      include: { employee: { select: { firstName: true, lastName: true, department: true } } },
    });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.patch('/:id/status', authorize('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Statut invalide' });
    const existing = await prisma.expenseReport.findFirst({
      where: { id: req.params.id, ...companyFilter(req.companyId) },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    const item = await prisma.expenseReport.update({ where: { id: req.params.id }, data: { status } });
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.expenseReport.findFirst({
      where: { id: req.params.id, ...companyFilter(req.companyId) },
    });
    if (!existing) return res.status(404).json({ success: false, message: 'Non trouvé' });
    await prisma.expenseReport.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
