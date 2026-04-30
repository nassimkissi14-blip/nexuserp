import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use(authenticate);

// GET /accounting?page=&limit=
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { companyId: req.user.companyId },
        include: { lines: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.journalEntry.count({ where: { companyId: req.user.companyId } }),
    ]);
    res.json({ success: true, data: entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /accounting
router.post('/', authorize('DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { date, description, lines } = req.body;

    // Auto-generate reference
    const count = await prisma.journalEntry.count({ where: { companyId: req.user.companyId } });
    const reference = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    const entry = await prisma.journalEntry.create({
      data: {
        companyId: req.user.companyId,
        reference,
        date: new Date(date),
        description,
        totalDebit,
        totalCredit,
        isBalanced,
        lines: {
          create: lines.map(l => ({
            accountCode: l.accountCode,
            accountLabel: l.accountLabel,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
          })),
        },
      },
      include: { lines: true },
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /accounting/:id  (date + description only — lines are immutable after creation)
router.patch('/:id', authorize('DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!existing) return res.status(404).json({ message: 'Non trouvé' });
    const { date, description } = req.body;
    const entry = await prisma.journalEntry.update({
      where: { id: req.params.id },
      data: {
        ...(date        !== undefined && { date: new Date(date) }),
        ...(description !== undefined && { description }),
      },
      include: { lines: true },
    });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /accounting/:id
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    await prisma.journalEntry.delete({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
