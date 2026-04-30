import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use(authenticate);

// GET /treasury?from=&to=
router.get('/', async (req, res) => {
  try {
    const { from, to, type } = req.query;
    const where = {
      companyId: req.user.companyId,
      ...(type && { type }),
      ...(from || to ? {
        date: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      } : {}),
    };
    const entries = await prisma.treasuryEntry.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    const balance = entries.reduce((s, e) => e.type === 'CREDIT' ? s + e.amount : s - e.amount, 0);
    const totalCredit = entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);
    const totalDebit = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
    res.json({ success: true, data: entries, balance, totalCredit, totalDebit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /treasury
router.post('/', authorize('DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { type, amount, description, reference, category, date } = req.body;
    const entry = await prisma.treasuryEntry.create({
      data: {
        companyId: req.user.companyId,
        type,
        amount: parseFloat(amount),
        description,
        reference,
        category,
        date: new Date(date),
      },
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /treasury/:id
router.patch('/:id', authorize('DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const existing = await prisma.treasuryEntry.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    if (!existing) return res.status(404).json({ message: 'Non trouvé' });
    const { type, amount, description, reference, category, date } = req.body;
    const entry = await prisma.treasuryEntry.update({
      where: { id: req.params.id },
      data: {
        ...(type        !== undefined && { type }),
        ...(amount      !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description }),
        ...(reference   !== undefined && { reference }),
        ...(category    !== undefined && { category }),
        ...(date        !== undefined && { date: new Date(date) }),
      },
    });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /treasury/:id
router.delete('/:id', authorize('DIRECTOR', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    await prisma.treasuryEntry.delete({
      where: { id: req.params.id, companyId: req.user.companyId },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
