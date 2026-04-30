import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use(authenticate);

// GET /budget?year=2026
router.get('/', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const lines = await prisma.budgetLine.findMany({
      where: { companyId: req.user.companyId, year },
      orderBy: [{ type: 'asc' }, { category: 'asc' }, { month: 'asc' }],
    });
    const totalBudgeted = lines.reduce((s, l) => s + l.budgeted, 0);
    const totalActual = lines.reduce((s, l) => s + l.actual, 0);
    res.json({ success: true, data: lines, year, totalBudgeted, totalActual });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /budget
router.post('/', authorize('DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { year, month, category, label, budgeted, type, notes } = req.body;
    const line = await prisma.budgetLine.create({
      data: {
        companyId: req.user.companyId,
        year: parseInt(year),
        month: month ? parseInt(month) : null,
        category,
        label,
        budgeted: parseFloat(budgeted),
        type: type || 'EXPENSE',
        notes,
      },
    });
    res.status(201).json(line);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /budget/:id
router.patch('/:id', authorize('DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { budgeted, actual, label, notes } = req.body;
    const line = await prisma.budgetLine.update({
      where: { id: req.params.id, companyId: req.user.companyId },
      data: {
        ...(budgeted !== undefined && { budgeted: parseFloat(budgeted) }),
        ...(actual !== undefined && { actual: parseFloat(actual) }),
        ...(label !== undefined && { label }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.json(line);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /budget/:id
router.delete('/:id', authorize('DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    await prisma.budgetLine.delete({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
